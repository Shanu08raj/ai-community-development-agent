# JanSetu AI — REST API Contract Specification

**Document Version:** 1.0.0  
**Status:** Architecture & Planning Specification  
**Product:** JanSetu AI — Connecting Citizens. Improving Communities.  
**Target Backend:** Node.js (v20+) / Express (v5.x) + Mongoose (v9.x)  
**AI Microservice:** Python (3.11+) / FastAPI (v0.115+)  

---

## 1. Executive Overview & Global Conventions

### 1.1 Purpose
This document establishes the definitive REST API contract for the **JanSetu AI** platform. It provides the strict interface definitions connecting the public citizen portal and administrative management dashboard with the Node.js backend and the downstream Python AI intelligence microservice.

### 1.2 Core Architectural Principles & Scope
1. **Civic-Tech Independence:** JanSetu AI is an independent community intelligence system and **not** an official government portal. The API does not claim government partnership, live integration, automatic government grievance registration, or automated municipal dispatch.
2. **Accountless Citizen Access:** Citizens require **no user registration or login** to submit complaints or track resolution progress.
3. **Single Admin Role (MVP):**
   - The MVP implements **only ONE active role**: `ADMIN`.
   - Admin authentication is secured via JWT bearer tokens.
   - The role field is modeled to be extensible for future post-hackathon role-based access control (e.g., regional coordinator or auditor), but no secondary active roles are implemented or implied in the MVP.
4. **Dual-Credential Citizen Tracking:** Complaint status tracking is protected by requiring two distinct credentials:
   - `referenceId`: A public alphanumeric identifier (e.g., `JS-2026-8901`).
   - `trackingCode`: A private secret authorization token (e.g., `TRACK-901A`).
   - *Security Rule:* The plain `trackingCode` is delivered **only once** upon successful submission. It is **never returned** in public listings, community issue feeds, admin listings, analytics, or server logs. The database stores strictly a one-way secure hash (`trackingCodeHash`).
5. **Human-in-the-Loop Governance:** AI analysis (clustering, category classification, severity priority, and authority recommendation) provides **advisory recommendations only**. No complaint status is automatically mutated to "Verified", "Forwarded", or "Resolved" without explicit human Administrator review and approval.
6. **Supported Civic Domains (MVP):**
   - `Water Supply`
   - `Roads and Infrastructure`
   - `Waste Management`
   - `Drainage and Sanitation`
   - `Streetlights`
   - `Other` (Civic grounds, public parks, general neighborhood maintenance)
7. **Strict Out-of-Scope Rule & Emergency Protocol:**
   - Excluded categories: Emergency/police dispatch, fire emergencies, medical/hospital care, primary education, electrical power distribution, land/property revenue disputes, and government welfare/pension schemes.
   - Out-of-scope complaints are flagged with `isOutOfScope: true`.
   - Emergency complaints receive explicit immediate guidance: *"For immediate emergency response (Police, Fire, Ambulance), please call 112 directly. JanSetu AI is an independent civic-tech platform and does not dispatch emergency services."*
8. **Finalized Multilingual Scope (Exactly 8 Languages):**
   The platform standardizes on eight official Indian linguistic identifiers:
   - `English` (`en`) — *Implemented & Tested in MVP*
   - `Hindi` (`hi`) — *Implemented & Tested in MVP*
   - `Kannada` (`kn`) — *Planned; Heuristic & safe fallback*
   - `Tamil` (`ta`) — *Implemented & Tested in MVP*
   - `Telugu` (`te`) — *Planned; Heuristic & safe fallback*
   - `Marathi` (`mr`) — *Implemented & Tested in MVP*
   - `Assamese` (`as`) — *Planned; Heuristic & safe fallback*
   - `Manipuri (Meitei)` (`mni`) — *Planned; Heuristic & safe fallback*
   - *Language Invariants:* The citizen's original complaint text is preserved permanently. Detected language is recorded. No speech-to-text, voice recognition, or real-time voice translation is claimed or implied. When language detection confidence is low (< 60%), the system applies safe fallback to manual triage without altering citizen text.

### 1.3 Base URL & Protocol
- **Development Base URL:** `http://localhost:5000/api/v1`
- **Internal AI Service Base URL:** `http://localhost:8000/api/v1`
- **Health Check Endpoint:** `GET http://localhost:5000/api/v1/health` (returns service status, uptime, and MongoDB connection state)
- **Data Exchange Format:** `application/json; charset=utf-8`

---

## 2. Standard Envelope & Error Response Formats

All API responses follow a predictable JSON envelope structure.

### 2.1 Standard Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-25T10:30:00.000Z",
    "requestId": "req_8f93e2b10a"
  }
}
```

### 2.2 Standard Paginated Success Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-11-25T10:30:00.000Z",
    "requestId": "req_8f93e2b10a",
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalRecords": 142,
      "totalPages": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 2.3 Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "No complaint found matching the provided Reference ID and Secret Tracking Code.",
    "details": []
  },
  "meta": {
    "timestamp": "2026-11-25T10:30:00.000Z",
    "requestId": "req_8f93e2b10a"
  }
}
```

### 2.4 HTTP Status Codes Used
| Status Code | Meaning | Usage |
|---|---|---|
| `200 OK` | Success | Successful resource retrieval, update, or login. |
| `201 Created` | Created | Successful complaint creation or audit record. |
| `400 Bad Request` | Client Error | Malformed JSON or syntax violations. |
| `401 Unauthorized` | Auth Required | Missing or invalid Admin JWT Bearer token. |
| `403 Forbidden` | Access Denied | Insufficient permissions for administrative action. |
| `404 Not Found` | Not Found | Resource or complaint lookup miss. |
| `422 Unprocessable Entity`| Validation Error | Payload failed Zod/Mongoose schema validation. |
| `429 Too Many Requests`| Rate Limited | Submission or tracking rate limit threshold exceeded. |
| `500 Internal Error` | Server Error | Unhandled server or database exception. |
| `502 Bad Gateway` | AI Service Offline | Downstream AI microservice unreachable (fallback applied). |

---

## 3. Citizen Public Portal Endpoints

These endpoints require **no authentication** and are accessible to public users.

---

### 3.1 Submit a Complaint
Registers a new community problem. Triggers asynchronous or synchronous AI classification and returns the generated public reference ID and confidential tracking code.

- **Endpoint:** `POST /api/v1/complaints`
- **Authentication:** None (Public)
- **Rate Limit:** 5 submissions per 10 minutes per IP address.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "title": "Severe sewage overflow outside Model High School gate",
  "description": "Black contaminated water pooling for 3 days after heavy rains. Footpath is completely submerged and children are unable to enter safely.",
  "category": "Drainage and Sanitation",
  "state": "Maharashtra",
  "district": "Pune",
  "area": "Ward 3, Subhash Nagar",
  "preferredLanguage": "English",
  "contactInfo": "Citizen demo contact"
}
```

#### Field Specifications & Validation Rules
| Field | Type | Required | Description & Constraints |
|---|---|---|---|
| `title` | String | **Yes** | Min 5 chars, Max 120 chars. Concise description of problem. |
| `description` | String | **Yes** | Min 15 chars, Max 2000 chars. Detailed context for AI clustering. |
| `category` | String | **Yes** | Enum: `'Water Supply'`, `'Roads and Infrastructure'`, `'Waste Management'`, `'Drainage and Sanitation'`, `'Streetlights'`, `'Other'`. |
| `state` | String | No | Default: `'Maharashtra'`. Max 50 chars. |
| `district` | String | No | Default: `'Pune'`. Max 50 chars. |
| `area` | String | **Yes** | Min 3 chars, Max 100 chars. Neighborhood, street, or ward name. |
| `preferredLanguage`| String | No | Default: `'English'`. Enum (8 languages): `'English'` (`en`), `'Hindi'` (`hi`), `'Kannada'` (`kn`), `'Tamil'` (`ta`), `'Telugu'` (`te`), `'Marathi'` (`mr`), `'Assamese'` (`as`), `'Manipuri (Meitei)'` (`mni`). |
| `contactInfo` | String | No | Max 100 chars. Phone or email. Kept strictly confidential in backend. |

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "JS-2026-8909",
    "referenceId": "JS-2026-8909",
    "trackingCode": "TRACK-909K",
    "status": "Submitted",
    "title": "Severe sewage overflow outside Model High School gate",
    "category": "Drainage and Sanitation",
    "state": "Maharashtra",
    "district": "Pune",
    "area": "Ward 3, Subhash Nagar",
    "preferredLanguage": "English",
    "submittedDate": "2026-11-25",
    "aiAnalysis": {
      "confidence": 92,
      "recommendedAuthority": "Municipal Drainage & Stormwater Wing",
      "detectedPriority": "High",
      "isOutOfScope": false
    },
    "message": "Complaint registered successfully. Store your Tracking Code confidentially to monitor lifecycle progress."
  },
  "meta": {
    "timestamp": "2026-11-25T10:35:10.120Z",
    "requestId": "req_sub_77180"
  }
}
```

#### Out-of-Scope / Emergency Guidance Response (`201 Created` with Safety Flags)
If an submitted complaint is analyzed and flagged as out-of-scope or an emergency (e.g. violent crime, hospital distress):
```json
{
  "success": true,
  "data": {
    "id": "JS-2026-8912",
    "referenceId": "JS-2026-8912",
    "trackingCode": "TRACK-912M",
    "status": "Submitted",
    "title": "Violent brawl on Market Road near store",
    "category": "Other",
    "state": "Maharashtra",
    "district": "Pune",
    "area": "Ward 2, Market Road",
    "submittedDate": "2026-11-25",
    "aiAnalysis": {
      "confidence": 98,
      "recommendedAuthority": null,
      "detectedPriority": "High",
      "isOutOfScope": true,
      "outOfScopeReason": "Active emergency / police law-enforcement matter excluded from civic municipal platform.",
      "emergencyGuidance": "CRITICAL NOTICE: For immediate police, fire, or medical emergencies, please dial 112 directly. JanSetu AI is an independent community intelligence system and does NOT dispatch emergency services."
    },
    "message": "Complaint logged. Please note this issue has been flagged as outside the municipal civic scope."
  },
  "meta": {
    "timestamp": "2026-11-25T10:36:15.000Z",
    "requestId": "req_sub_77181"
  }
}
```

#### Error Responses
- **422 Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed.",
    "details": [
      { "field": "title", "issue": "Title must be at least 5 characters long." },
      { "field": "area", "issue": "Area or ward name is required." }
    ]
  }
}
```

---

### 3.2 Track Complaint Lifecycle Progress
Allows a citizen to lookup their complaint and view the comprehensive 7-stage resolution history using their Reference ID and Secret Tracking Code.

- **Endpoint:** `POST /api/v1/complaints/track`
- **Authentication:** None (Public)
- **Rate Limit:** 20 queries per 10 minutes per IP address.

#### Request Body
```json
{
  "referenceId": "JS-2026-8901",
  "trackingCode": "TRACK-901A"
}
```

#### Validation Rules
- `referenceId`: Required, string, case-insensitive trimmed matching format `JS-YYYY-XXXX`.
- `trackingCode`: Required, string, case-insensitive trimmed matching format `TRACK-XXXXX`.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "JS-2026-8901",
    "title": "Contaminated tap water with foul smell in Block B",
    "description": "Since Monday morning, tap water delivered to households has visible suspended impurities and a strong sulfur odor.",
    "category": "Water Supply",
    "area": "Ward 12",
    "district": "Pune",
    "priority": "High",
    "status": "In Progress",
    "submittedDate": "2026-11-20",
    "recommendedAuthority": "Local Water Supply & Sewerage Board",
    "clusterId": "CI-101",
    "timeline": [
      {
        "status": "Submitted",
        "date": "2026-11-20 09:30 AM",
        "note": "Complaint logged through JanSetu AI portal."
      },
      {
        "status": "Verified",
        "date": "2026-11-20 11:15 AM",
        "note": "AI clustering matched 4 identical ward reports."
      },
      {
        "status": "Forwarded",
        "date": "2026-11-21 10:00 AM",
        "note": "Sample alert prepared for municipal water board."
      },
      {
        "status": "Acknowledged",
        "date": "2026-11-22 02:45 PM",
        "note": "Inspection team scheduled for pipeline review."
      },
      {
        "status": "In Progress",
        "date": "2026-11-23 09:00 AM",
        "note": "Pipeline flushing and sample collection underway."
      }
    ]
  },
  "meta": {
    "timestamp": "2026-11-25T10:40:00.000Z",
    "requestId": "req_trk_9012"
  }
}
```

#### Error Response (`404 Not Found`)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRACKING_CREDENTIALS",
    "message": "No complaint found matching this Reference ID and Secret Tracking Code combination. Please verify your credentials."
  }
}
```

---

### 3.3 List Public Community Issues (Aggregated AI Clusters)
Provides the public feed of aggregated civic issues affecting multiple citizens. Excludes any citizen PII.

- **Endpoint:** `GET /api/v1/community-issues`
- **Authentication:** None (Public)
- **Query Parameters:**
  - `category` (optional, string): Filter by category name (e.g., `'Water Supply'`).
  - `priority` (optional, string): Filter by priority (`'High'`, `'Medium'`, `'Low'`).
  - `status` (optional, string): Filter by cluster status.
  - `page` (optional, integer): Default `1`.
  - `limit` (optional, integer): Default `10`, Max `50`.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "CI-101",
      "title": "Severe low water pressure and shortage in Ward 12",
      "category": "Water Supply",
      "area": "Ward 12, North Zone",
      "relatedReportsCount": 35,
      "priority": "High",
      "status": "In Progress",
      "lastUpdated": "2026-11-24",
      "aiConfidence": 96,
      "recommendedAuthority": "Local Water Supply & Sewerage Board",
      "reviewStatus": "Pending Admin Review",
      "summary": "35 citizen submissions over 72 hours reporting contaminated muddy water and negligible pressure during scheduled morning hours.",
      "impactZones": ["Block A", "Block B", "Govind Marg"]
    }
  ],
  "meta": {
    "timestamp": "2026-11-25T10:45:00.000Z",
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalRecords": 6,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 3.4 Public Community Statistics
Returns high-level platform statistics for the public homepage KPI cards.

- **Endpoint:** `GET /api/v1/analytics/stats`
- **Authentication:** None (Public)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "totalReports": 1428,
    "recurringIssues": 42,
    "inProgress": 18,
    "reportedResolutions": 84,
    "growthRates": {
      "totalReports": "+14% this month",
      "recurringIssues": "9 AI cluster groups",
      "inProgress": "Active monitoring",
      "reportedResolutions": "+8% vs last month"
    }
  },
  "meta": {
    "timestamp": "2026-11-25T10:45:00.000Z"
  }
}
```

---

## 4. Administrative Authentication Endpoints

Provides session initialization and credential validation for platform supervisors.

---

### 4.1 Admin Login
Validates admin credentials and generates a signed JWT token. The MVP implements strictly **one Admin role** (`"ADMIN"`). Extensible role attributes are supported for future expansions, but only `ADMIN` is active for MVP access control.

- **Endpoint:** `POST /api/v1/auth/login`
- **Authentication:** None

#### Request Body
```json
{
  "email": "admin.demo@jansetu.local",
  "password": "demo_secure_password"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "admin": {
      "id": "67448831f1a23e9a01",
      "name": "Admin Demo (Supervisor)",
      "email": "admin.demo@jansetu.local",
      "role": "ADMIN"
    }
  },
  "meta": {
    "timestamp": "2026-11-25T10:50:00.000Z"
  }
}
```

#### Error Response (`401 Unauthorized`)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "The email or password provided is incorrect."
  }
}
```

---

### 4.2 Verify Admin Session
Returns the authenticated administrator profile.

- **Endpoint:** `GET /api/v1/auth/me`
- **Authentication:** Bearer Token required (`Authorization: Bearer <TOKEN>`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "67448831f1a23e9a01",
    "name": "Admin Demo (Supervisor)",
    "email": "admin.demo@jansetu.local",
    "role": "ADMIN",
    "department": "Supervisory Desk"
  }
}
```

---

## 5. Admin Complaints Management Endpoints

All endpoints in this section require an **Admin Bearer Token** (`Authorization: Bearer <TOKEN>`).

---

### 5.1 List All Complaints (Registry Triage)
Provides filtered, searchable, and paginated listing of citizen complaints.

- **Endpoint:** `GET /api/v1/admin/complaints`
- **Query Parameters:**
  - `search` (optional, string): Case-insensitive search on title, ID, ward, or description.
  - `category` (optional, string): Filter by category.
  - `status` (optional, string): Filter by status (`Submitted`, `Verified`, `In Progress`, etc.).
  - `priority` (optional, string): Filter by priority (`High`, `Medium`, `Low`).
  - `page` (optional, integer): Default `1`.
  - `limit` (optional, integer): Default `10`, Max `100`.
  - `sortBy` (optional, string): Default `submittedDate`.
  - `sortOrder` (optional, string): `asc` or `desc` (default `desc`).

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "JS-2026-8901",
      "title": "Contaminated tap water with foul smell in Block B",
      "category": "Water Supply",
      "area": "Ward 12",
      "priority": "High",
      "status": "In Progress",
      "submittedDate": "2026-11-20",
      "aiConfidence": 96,
      "clusterId": "CI-101"
    }
  ],
  "meta": {
    "timestamp": "2026-11-25T10:55:00.000Z",
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalRecords": 8,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 5.2 Get Complaint Detailed Inspection
Returns full complaint data, AI classifications, attached community cluster, and full status timeline.

- **Endpoint:** `GET /api/v1/admin/complaints/:id`
- **Path Parameter:** `id` (e.g. `JS-2026-8901`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "JS-2026-8901",
    "title": "Contaminated tap water with foul smell in Block B",
    "description": "Since Monday morning, tap water delivered to households has visible suspended impurities and a strong sulfur odor.",
    "category": "Water Supply",
    "state": "Maharashtra",
    "district": "Pune",
    "area": "Ward 12",
    "priority": "High",
    "status": "In Progress",
    "submittedDate": "2026-11-20",
    "preferredLanguage": "English",
    "contactInfo": "Citizen demo contact",
    "aiAnalysis": {
      "confidence": 96,
      "detectedCategory": "Water Supply",
      "detectedPriority": "High",
      "recommendedAuthority": "Local Water Supply & Sewerage Board",
      "detectedLanguage": "English",
      "summary": "Low pressure and high turbidity reported in Ward 12."
    },
    "cluster": {
      "id": "CI-101",
      "title": "Severe low water pressure and shortage in Ward 12",
      "totalClusterReports": 35
    },
    "timeline": [
      {
        "status": "Submitted",
        "date": "2026-11-20 09:30 AM",
        "note": "Complaint logged through JanSetu AI portal."
      },
      {
        "status": "Verified",
        "date": "2026-11-20 11:15 AM",
        "note": "AI clustering matched 4 identical ward reports."
      },
      {
        "status": "In Progress",
        "date": "2026-11-23 09:00 AM",
        "note": "Pipeline flushing and sample collection underway."
      }
    ]
  }
}
```

---

### 5.3 Update Complaint Resolution Status
Transitions the complaint lifecycle stage, creates an audit record, and appends to the citizen timeline.

- **Endpoint:** `PATCH /api/v1/admin/complaints/:id/status`
- **Path Parameter:** `id` (e.g., `JS-2026-8901`)

#### Request Body
```json
{
  "newStatus": "Reported Resolved",
  "note": "Contractor replaced valve at Sector B intersection. Water purity confirmed clear."
}
```

#### Validation Rules
- `newStatus`: Required. Must be one of:
  - `Submitted`
  - `Verified`
  - `Forwarded`
  - `Acknowledged`
  - `In Progress`
  - `Reported Resolved`
  - `Verified Resolved`
- `note`: Optional string. Max 500 chars.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "JS-2026-8901",
    "previousStatus": "In Progress",
    "currentStatus": "Reported Resolved",
    "updatedAt": "2026-11-25T11:00:00.000Z",
    "auditLogId": "LOG-305",
    "complaint": {
      "id": "JS-2026-8901",
      "status": "Reported Resolved",
      "timeline": [ ... ]
    }
  },
  "meta": {
    "message": "Complaint status updated and audit entry recorded."
  }
}
```

#### Allowed Status Transitions (State Machine Validation)
Admin transitions must follow the documented civic lifecycle (`Submitted` -> `Verified` -> `Forwarded` -> `Acknowledged` -> `In Progress` -> `Reported Resolved` -> `Verified Resolved`, allowing supervised progression or reopening from `Reported Resolved` to `In Progress`). Invalid backward jumps (e.g., `Verified Resolved` -> `Submitted`) or unrecognized statuses return `422 Unprocessable Entity` (`INVALID_STATUS_TRANSITION`).

---

## 6. Admin Community Issues (AI Clusters) Endpoints

---

### 6.1 List Community Issue Clusters (Admin)
Returns all AI-aggregated community clusters with filtering and pagination for administrative triage.

- **Endpoint:** `GET /api/v1/admin/community-issues`
- **Authentication:** Bearer Token required (`ADMIN`)
- **Query Parameters:** `category`, `priority`, `status`, `reviewStatus`, `page`, `limit`

#### Success Response (`200 OK`)
Returns array of `CommunityIssue` records matching Section 3.3 schema plus linked `memberComplaintIds` count and `adminNotes`.

---

### 6.2 Review / Triage Community Issue Cluster
Updates administrative review state of an AI cluster (e.g. confirm human forwarding note or assign authority).

- **Endpoint:** `PATCH /api/v1/admin/community-issues/:id/review`
- **Path Parameter:** `id` (e.g., `CI-101`)

#### Request Body
```json
{
  "reviewStatus": "Forwarded to Department",
  "adminNotes": "Forwarded sample packet to Water Supply Board Executive Engineer.",
  "assignedAuthorityId": "AUTH-01"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "CI-101",
    "reviewStatus": "Forwarded to Department",
    "assignedAuthorityId": "AUTH-01",
    "lastUpdated": "2026-11-25"
  }
}
```

---

### 6.3 Admin Dashboard Analytics & Aggregations
Returns real MongoDB aggregations powering Admin Dashboard KPIs and Recharts visualizations.

- **Endpoint:** `GET /api/v1/admin/analytics`
- **Authentication:** Bearer Token required (`ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "kpis": {
      "totalReports": 8,
      "pendingTriage": 2,
      "verifiedCount": 1,
      "inProgress": 3,
      "reportedResolutions": 2,
      "recurringIssues": 6
    },
    "trendData": [
      { "month": "Nov", "submitted": 8, "resolved": 2 }
    ],
    "categoryData": [
      { "name": "Water Supply", "value": 25, "count": 2, "color": "#164DAA" }
    ],
    "statusData": [
      { "status": "Submitted", "count": 1, "fill": "#94A3B8" }
    ],
    "priorityData": [
      { "priority": "High", "count": 4 },
      { "priority": "Medium", "count": 3 },
      { "priority": "Low", "count": 1 }
    ]
  },
  "meta": {
    "timestamp": "2026-11-25T11:00:00.000Z"
  }
}
```

---

## 7. Admin Authority Directory Endpoints

---

### 7.1 List Local Civic Authorities
Returns the mapped municipal departments and jurisdictions used for authority recommendations.

- **Endpoint:** `GET /api/v1/admin/authorities`
- **Query Parameters:** `department`, `search`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "AUTH-01",
      "name": "Municipal Water Supply & Sewerage Board",
      "department": "Water Supply",
      "jurisdiction": "Metro Municipal Corporation (All Wards)",
      "nodalOfficer": "Er. Rajesh K. Deshmukh",
      "contactPhone": "+91 20 2550 1200 (Sample Demo)",
      "contactEmail": "water.cell@sample-civic.demo.org",
      "officeHours": "09:30 AM - 05:30 PM (Mon-Sat)",
      "responseTimeAvg": "36 hours",
      "activeIssuesCount": 14
    }
  ]
}
```

---

## 8. Admin Audit Trail Endpoints

---

### 8.1 Retrieve Administrative Audit Logs
Returns the immutable chronological audit records of supervisory actions.

- **Endpoint:** `GET /api/v1/admin/audit-logs`
- **Query Parameters:**
  - `complaintId` (optional, string)
  - `action` (optional, string)
  - `page` (optional, integer)
  - `limit` (optional, integer, default 20)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "LOG-301",
      "action": "STATUS_UPDATE",
      "complaintId": "JS-2026-8901",
      "previousStatus": "Acknowledged",
      "newStatus": "In Progress",
      "timestamp": "2026-11-24 14:15:22",
      "adminUser": "Admin Demo (Supervisor)",
      "note": "Inspection crew logged pipeline test samples on site."
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalRecords": 4,
      "totalPages": 1
    }
  }
}
```

---

## 9. Internal AI Service Integration Endpoints

These endpoints operate between the Node.js backend (`port 5000`) and the Python FastAPI service (`port 8000`).

---

### 9.1 Invoke AI Analysis on Intake
Called by Node.js backend upon new citizen submission to trigger the LangGraph pipeline.

- **Endpoint (FastAPI):** `POST http://localhost:8000/api/v1/ai/analyze-complaint`
- **Authentication:** Shared internal secret header (`X-Internal-Secret: <SECRET>`)

#### Request Body
```json
{
  "complaintId": "JS-2026-8909",
  "title": "Severe sewage overflow outside Model High School gate",
  "description": "Black contaminated water pooling for 3 days after heavy rains. Footpath is completely submerged.",
  "submittedCategory": "Drainage and Sanitation",
  "ward": "Ward 3",
  "district": "Pune",
  "language": "English"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "complaintId": "JS-2026-8909",
  "analysis": {
    "detectedLanguage": "English",
    "detectedLanguageCode": "en",
    "languageConfidence": 98,
    "sanitizedSummary": "Sewage and storm drain backflow obstructing school access path.",
    "classifiedCategory": "Drainage and Sanitation",
    "categoryConfidence": 95,
    "priority": "High",
    "priorityReason": "Public health risk and pedestrian obstruction near a primary education facility.",
    "isDuplicate": true,
    "suggestedClusterId": "CI-105",
    "recommendedAuthority": {
      "id": "AUTH-05",
      "name": "Drainage & Stormwater Infrastructure Wing",
      "department": "Drainage and Sanitation"
    },
    "isOutOfScope": false,
    "outOfScopeReason": null,
    "emergencyGuidance": null
  },
  "meta": {
    "processingTimeMs": 18,
    "engine": "rule-fallback",
    "version": "1.0.0",
    "timestamp": "2026-11-25T10:35:10.500Z"
  }
}
```

#### Out-of-Scope Internal Response Example (`200 OK`)
```json
{
  "success": true,
  "complaintId": "JS-2026-8911",
  "analysis": {
    "detectedLanguage": "English",
    "detectedLanguageCode": "en",
    "languageConfidence": 99,
    "sanitizedSummary": "Violent physical brawl and commercial storefront vandalism reported in progress.",
    "classifiedCategory": "Out of Scope",
    "categoryConfidence": 99,
    "priority": "High",
    "priorityReason": "Active violent crime and urgent public safety threat requiring police intervention.",
    "isDuplicate": false,
    "suggestedClusterId": null,
    "recommendedAuthority": null,
    "isOutOfScope": true,
    "outOfScopeReason": "Active emergency / police law-enforcement matter excluded from civic municipal platform.",
    "emergencyGuidance": "CRITICAL: For immediate police, fire, or medical emergencies, please dial 112 directly. JanSetu AI does not dispatch emergency services."
  },
  "meta": {
    "processingTimeMs": 12,
    "engine": "rule-fallback",
    "version": "1.0.0",
    "timestamp": "2026-11-25T10:36:12.000Z"
  }
}
```

---

## 10. Multilingual Voice Interaction APIs (STT & TTS)

These endpoints are public-facing through the Express backend gateway (`/api/v1/voice/*`) and proxy internally to the Python AI service (`/api/v1/voice/*`) with `X-Internal-Secret` authentication. No raw uploaded audio or synthesized WAV files are stored permanently on disk or retained in MongoDB.

### 10.1 `GET /api/v1/voice/languages`

- **Purpose:** Returns the capability matrix for **English + all 22 Eighth Schedule Indian languages (23 entries total)**, including honest STT/TTS support levels, preloaded vs on-demand Piper voice availability, RTL script flags (`ur`, `ks`, `sd`), limitations, and active provider toggles.
- **Authentication:** Public (no token required).
- **Resilience:** If the Python AI service is unreachable (`ECONNREFUSED` / timeout), returns `200 OK` with `providers.voiceServiceReachable: false` and explicit degraded fallback statuses rather than breaking the text-based complaint workflow.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "languages": [
        {
          "code": "hi",
          "name": "Hindi",
          "nativeName": "हिन्दी",
          "script": "Devanagari",
          "rtl": false,
          "scheduledEighth": true,
          "initialSupported": true,
          "sttAvailable": true,
          "sttSupportLevel": "local_whisper_tested_partial",
          "sttProvider": "faster-whisper",
          "ttsAvailable": true,
          "ttsSupportLevel": "local_piper_verified",
          "ttsProvider": "piper-tts",
          "piperVoices": [
            {
              "id": "hi_IN-rohan-medium",
              "label": "Rohan (Hindi - India)",
              "locale": "hi_IN",
              "sizeMb": 60,
              "downloaded": true,
              "preloadedRecommended": true
            }
          ],
          "voiceDownloaded": true,
          "qualityStatus": "tts_verified_stt_script_drift",
          "limitations": "Piper TTS verified locally (~0.40s warm); Whisper 'base' INT8 often emits Perso-Arabic script or Urdu auto-tags on Hindi speech (~57-60% conf). Review before submit or evaluate 'small'/Bhashini.",
          "recommendHumanReview": true
        }
      ],
      "providers": {
        "localSttEnabled": true,
        "localSttModel": "faster-whisper-base-int8",
        "localTtsEnabled": true,
        "localTtsEngine": "piper-tts",
        "piperAutoDownload": false,
        "optionalBhashiniEnabled": false,
        "voiceServiceReachable": true
      }
    }
  }
  ```

### 10.2 `POST /api/v1/voice/transcribe`

- **Purpose:** Accepts a recorded complaint audio clip (`multipart/form-data`), validates format/size/duration, transcribes speech into an editable transcript (preserving original language & script without forced English translation), and refines language detection across Indic scripts and Devanagari languages.
- **Authentication:** Public (rate-limited: `30` requests per `10` minutes per IP via `voiceSttLimiter`; internal hop uses `X-Internal-Secret`).
- **Request (`multipart/form-data`):**
  - `audio` *(file, required)*: Audio binary (`.webm`, `.ogg`, `.wav`, `.mp3`, `.m4a`, `.aac`, `.flac`), max `10 MB` (`VOICE_MAX_AUDIO_BYTES`), min `64` bytes, max duration `120s` (`VOICE_MAX_AUDIO_SECONDS`).
  - `language` *(string, optional, default `"auto"`)*: ISO code, language name, or `"auto"`.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "transcript": "वार्ड 12 में पानी की पाइपलाइन टूट गई है",
      "detectedLanguage": "Hindi",
      "detectedLanguageCode": "hi",
      "languageConfidence": 94,
      "transcriptConfidence": 86,
      "qualityStatus": "good",
      "durationSeconds": 3.4,
      "rtl": false,
      "provider": "faster-whisper",
      "model": "base-int8",
      "recommendHumanReview": false,
      "warnings": []
    }
  }
  ```
- **Validation & Error Codes:**
  - `413 AUDIO_TOO_LARGE`: Exceeds `10 MB` upload cap.
  - `422 AUDIO_FILE_REQUIRED`: Missing `audio` form part.
  - `422 EMPTY_AUDIO_RECORDING`: Payload under `64` bytes or silent/empty clip.
  - `422 INVALID_AUDIO_FORMAT`: Unsupported MIME type or invalid container magic bytes.
  - `422 AUDIO_DURATION_EXCEEDED`: Recording exceeds `120` seconds.
  - `422 STT_LANGUAGE_UNSUPPORTED_LOCALLY`: Requested language (e.g., Manipuri `mni`, Dogri `doi`) is not supported by local Whisper; directs citizen to type or enable optional Bhashini.
  - `429 VOICE_STT_RATE_LIMIT`: Too many transcription requests from client.
  - `503 VOICE_STT_DISABLED` / `STT_DEPENDENCY_MISSING` / `STT_MODEL_LOAD_FAILED`: Local STT unavailable.

### 10.3 `POST /api/v1/voice/synthesize`

- **Purpose:** Synthesizes non-sensitive instructions, complaint summaries, or public tracking status updates into `audio/wav` PCM speech using the matching local Piper voice (or optional Bhashini provider). Never silently substitutes an unrelated language voice.
- **Authentication:** Public (rate-limited: `90` requests per `10` minutes per IP via `voiceTtsLimiter`; internal hop uses `X-Internal-Secret`).
- **Request (`application/json`):**
  ```json
  {
    "text": "आपकी शिकायत दर्ज हो गई है। संदर्भ संख्या JS-2026-0042 है।",
    "language": "hi",
    "voiceId": "hi_IN-rohan-medium",
    "speed": 1.0
  }
  ```
  - `text`: Required, `1..1500` characters (`VOICE_MAX_TTS_CHARS`).
  - `language`: Optional, default `"en"`.
  - `voiceId`: Optional registered Piper voice identifier.
  - `speed`: Optional number in `[0.75, 1.5]`, default `1.0`.
- **Success Response (`200 OK`, binary `audio/wav`):**
  - Headers: `Content-Type: audio/wav`, `Cache-Control: no-store`, `X-Voice-Provider`, `X-Voice-Id`, `X-Voice-Language`, `X-Voice-Sample-Rate`.
- **Error Responses:**
  - `422 TTS_VOICE_UNAVAILABLE` / `TTS_VOICE_NOT_DOWNLOADED`: Indicates honest absence of matching local voice (and includes `browserFallbackAllowed: true` so the client checks only matching-language `speechSynthesis` voices).
  - `422 EMPTY_TTS_TEXT` / `VALIDATION_ERROR`: Invalid text length or out-of-range speed.
  - `429 VOICE_TTS_RATE_LIMIT`: Rate limit exceeded.

### 10.4 `POST /api/v1/voice/extract-complaint`

- **Purpose:** Deterministically extracts structured civic complaint fields (`title`, `description`, `category`, `categoryCode`, `state`, `district`, `ward`, `area`) from a spoken or edited transcript without auto-submitting the complaint or inventing missing ward numbers. Validates districts against the official 36 Indian States/UTs dataset (`india_locations.json`), detects district-state mismatches or ambiguity (e.g., `"Bangalore"` -> `Bengaluru Urban` vs `Bengaluru Rural`), and flags conflicts against already-typed form values.
- **Authentication:** Public (rate-limited via `voiceSttLimiter`; internal hop to FastAPI uses `X-Internal-Secret`).
- **Request (`application/json`):**
  ```json
  {
    "transcript": "Water has not been coming for three days. My ward number is 13, my state is Karnataka, and my district is Bengaluru Urban.",
    "language": "en",
    "existingFields": {
      "title": "",
      "description": "",
      "category": "Water Supply",
      "categoryTouched": false,
      "state": "",
      "district": "",
      "area": ""
    }
  }
  ```
  - `transcript`: Required, `1..3000` characters.
  - `language`: Optional hint (`"auto"` or ISO code/name).
  - `existingFields`: Optional object representing user-entered values so manual inputs are never silently overwritten.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "originalTranscript": "Water has not been coming for three days. My ward number is 13, my state is Karnataka, and my district is Bengaluru Urban.",
      "detectedLanguage": "English",
      "detectedLanguageCode": "en",
      "title": "Water Supply Problem",
      "description": "Water has not been coming for three days.",
      "category": "Water Supply",
      "categoryCode": "WATER_SUPPLY",
      "state": "Karnataka",
      "district": "Bengaluru Urban",
      "ward": "13",
      "area": "Ward 13",
      "locationStatus": "verified",
      "ambiguousLocations": [],
      "locationMismatch": null,
      "existingFieldConflicts": [],
      "warnings": []
    }
  }
  ```
- **Validation & Error Codes:**
  - `422 VALIDATION_ERROR`: Missing, empty, or >3000-character transcript.
  - `429 VOICE_STT_RATE_LIMIT`: Rate limit exceeded.
  - `503 VOICE_SERVICE_UNAVAILABLE`: AI extraction service unreachable (frontend keeps transcript and manual entry intact).

```
