import { apiRequest } from './apiClient';

export const complaintService = {
  async submitComplaint(formData) {
    const res = await apiRequest('/complaints', {
      method: 'POST',
      body: {
        title: formData.title?.trim(),
        description: formData.description?.trim(),
        category: formData.category || 'Other',
        state: formData.state?.trim() || 'Maharashtra',
        district: formData.district?.trim() || 'Pune',
        area: formData.area?.trim(),
        preferredLanguage: formData.preferredLanguage || 'English',
        contactInfo: formData.contactInfo?.trim() || '',
      },
    });

    return {
      success: true,
      complaint: res.data,
      referenceId: res.data.referenceId || res.data.id,
      trackingCode: res.data.trackingCode,
      aiAnalysis: res.data.aiAnalysis,
      message: res.data.message,
    };
  },

  async trackComplaint(referenceId, trackingCode) {
    const refClean = (referenceId || '').trim().toUpperCase();
    const codeClean = (trackingCode || '').trim().toUpperCase();

    if (!refClean || !codeClean) {
      return {
        success: false,
        error: 'Please enter both the Complaint Reference ID and the Secret Tracking Code.',
      };
    }

    try {
      const res = await apiRequest('/complaints/track', {
        method: 'POST',
        body: { referenceId: refClean, trackingCode: codeClean },
      });
      return {
        success: true,
        complaint: res.data,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Unable to verify tracking credentials.',
        status: err.status ?? null,
        code: err.code || 'REQUEST_FAILED',
      };
    }
  },

  async getPublicCommunityIssues(params = {}) {
    const res = await apiRequest('/community-issues', {
      method: 'GET',
      query: params,
    });
    return {
      items: res.data || [],
      pagination: res.meta?.pagination || null,
    };
  },

  async getPublicStats() {
    const res = await apiRequest('/analytics/stats', {
      method: 'GET',
    });
    return res.data;
  },

  async getComplaints(params = {}) {
    const res = await apiRequest('/admin/complaints', {
      method: 'GET',
      query: params,
      requiresAuth: true,
    });
    return {
      items: res.data || [],
      pagination: res.meta?.pagination || {
        currentPage: 1,
        pageSize: 10,
        totalRecords: (res.data || []).length,
        totalPages: 1,
      },
    };
  },

  async getComplaintDetail(id) {
    const res = await apiRequest(`/admin/complaints/${encodeURIComponent(id)}`, {
      method: 'GET',
      requiresAuth: true,
    });
    return res.data;
  },

  async updateComplaintStatus(complaintId, newStatus, adminNote = '', overrides = {}) {
    try {
      const res = await apiRequest(`/admin/complaints/${encodeURIComponent(complaintId)}/status`, {
        method: 'PATCH',
        requiresAuth: true,
        body: {
          newStatus,
          note: adminNote?.trim() || '',
          ...(overrides.verifiedCategory ? { verifiedCategory: overrides.verifiedCategory } : {}),
          ...(overrides.verifiedPriority ? { verifiedPriority: overrides.verifiedPriority } : {}),
          ...(overrides.assignedAuthorityId ? { assignedAuthorityId: overrides.assignedAuthorityId } : {}),
        },
      });
      return {
        success: true,
        complaint: res.data.complaint,
        auditLogId: res.data.auditLogId,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to update complaint status.',
      };
    }
  },

  async getCommunityIssues(params = {}) {
    const res = await apiRequest('/admin/community-issues', {
      method: 'GET',
      query: params,
      requiresAuth: true,
    });
    return {
      items: res.data || [],
      pagination: res.meta?.pagination || null,
    };
  },

  async reviewCommunityIssue(clusterId, payload) {
    const res = await apiRequest(`/admin/community-issues/${encodeURIComponent(clusterId)}/review`, {
      method: 'PATCH',
      requiresAuth: true,
      body: payload,
    });
    return res.data;
  },

  async getAuthorities(params = {}) {
    const res = await apiRequest('/admin/authorities', {
      method: 'GET',
      query: params,
      requiresAuth: true,
    });
    return res.data || [];
  },

  async getAdminAnalytics() {
    const res = await apiRequest('/admin/analytics', {
      method: 'GET',
      requiresAuth: true,
    });
    return res.data;
  },

  async getAuditLogs(params = {}) {
    const res = await apiRequest('/admin/audit-logs', {
      method: 'GET',
      query: params,
      requiresAuth: true,
    });
    return {
      items: res.data || [],
      pagination: res.meta?.pagination || null,
    };
  },
};
