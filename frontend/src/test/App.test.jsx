import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';
import { DEFAULT_VOICE_LANGUAGES } from '../data/voiceLanguages';

function createApiMockState() {
  const complaints = [
    {
      id: 'JS-2026-8901',
      trackingCode: 'TRACK-901A',
      title: 'Contaminated tap water with foul smell in Block B',
      description: 'Tap water delivered to households has suspended impurities.',
      category: 'Water Supply',
      state: 'Maharashtra',
      district: 'Pune',
      area: 'Ward 12',
      priority: 'High',
      status: 'In Progress',
      submittedDate: '2026-11-20',
      preferredLanguage: 'English',
      aiConfidence: 96,
      recommendedAuthority: 'Municipal Water Supply & Sewerage Board',
      clusterId: 'CI-101',
      aiAnalysis: {
        confidence: 96,
        detectedCategory: 'Water Supply',
        detectedPriority: 'High',
        priorityReason: 'Contaminated drinking water hazard.',
        detectedLanguage: 'English',
        detectedLanguageCode: 'en',
        recommendedAuthority: 'Municipal Water Supply & Sewerage Board',
        engineUsed: 'rule-fallback',
        isOutOfScope: false,
      },
      timeline: [
        { status: 'Submitted', date: '2026-11-20 09:30 AM', note: 'Complaint logged through JanSetu AI portal.' },
        { status: 'In Progress', date: '2026-11-23 09:00 AM', note: 'Pipeline flushing underway.' },
      ],
    },
    {
      id: 'JS-2026-8906',
      trackingCode: 'TRACK-906F',
      title: 'Broken brick masonry on park boundary',
      description: 'Part of park wall collapsed towards busy road.',
      category: 'Other',
      state: 'Maharashtra',
      district: 'Pune',
      area: 'Ward 14',
      priority: 'Low',
      status: 'Submitted',
      submittedDate: '2026-11-23',
      preferredLanguage: 'English',
      aiConfidence: 85,
      recommendedAuthority: 'Department of Public Parks & Urban Horticulture',
      clusterId: null,
      aiAnalysis: {
        confidence: 85,
        detectedCategory: 'Other',
        detectedPriority: 'Low',
        priorityReason: 'Minor boundary masonry repair.',
        detectedLanguage: 'English',
        detectedLanguageCode: 'en',
        recommendedAuthority: 'Department of Public Parks & Urban Horticulture',
        engineUsed: 'rule-fallback',
        isOutOfScope: false,
      },
      timeline: [
        { status: 'Submitted', date: '2026-11-23 04:00 PM', note: 'Complaint logged in portal.' },
      ],
    },
  ];

  const clusters = [
    {
      id: 'CI-101',
      title: 'Severe low water pressure and shortage in Ward 12',
      category: 'Water Supply',
      area: 'Ward 12, North Zone',
      relatedReportsCount: 35,
      priority: 'High',
      status: 'In Progress',
      lastUpdated: '2026-11-24',
      aiConfidence: 96,
      recommendedAuthority: 'Municipal Water Supply & Sewerage Board',
      reviewStatus: 'Pending Admin Review',
      summary: 'Recurring contaminated water and pressure failure in Ward 12.',
    },
  ];

  const auditLogs = [
    {
      id: 'LOG-301',
      action: 'STATUS_UPDATE',
      complaintId: 'JS-2026-8901',
      previousStatus: 'Acknowledged',
      newStatus: 'In Progress',
      timestamp: '2026-11-24 14:15:22',
      adminUser: 'Admin Demo (Supervisor)',
      note: 'Inspection crew logged pipeline test samples on site.',
    },
  ];

  return vi.fn(async (url, init = {}) => {
    const parsedUrl = new URL(url, 'http://localhost:5000');
    const path = parsedUrl.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method || 'GET').toUpperCase();
    const authHeader = init.headers?.Authorization || init.headers?.authorization || '';

    const jsonResp = (status, body) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });

    if (path === '/analytics/stats' && method === 'GET') {
      return jsonResp(200, {
        success: true,
        data: {
          totalReports: complaints.length,
          recurringIssues: clusters.length,
          inProgress: complaints.filter((c) => c.status === 'In Progress').length,
          reportedResolutions: 0,
          growthRates: {
            totalReports: `${complaints.length} logged reports`,
            recurringIssues: `${clusters.length} AI cluster groups`,
            inProgress: 'Active civic tracking',
            reportedResolutions: '0% resolution rate',
          },
        },
      });
    }

    if (path === '/community-issues' && method === 'GET') {
      const cat = parsedUrl.searchParams.get('category');
      const items = cat ? clusters.filter((c) => c.category === cat) : clusters;
      return jsonResp(200, { success: true, data: items, meta: { pagination: { totalRecords: items.length } } });
    }

    if (path === '/complaints' && method === 'POST') {
      const body = JSON.parse(init.body || '{}');
      const isEmergency = /police|robbery|112/i.test(`${body.title} ${body.description}`);
      const newId = `JS-2026-${9000 + complaints.length + 1}`;
      const trackingCode = `TRACK-NEW${complaints.length + 1}X`;
      const created = {
        id: newId,
        referenceId: newId,
        trackingCode,
        title: body.title,
        description: body.description,
        category: body.category,
        state: body.state || 'Maharashtra',
        district: body.district || 'Pune',
        area: body.area,
        priority: isEmergency ? 'High' : 'Medium',
        status: 'Submitted',
        submittedDate: '2026-11-25',
        preferredLanguage: body.preferredLanguage || 'English',
        recommendedAuthority: isEmergency ? null : 'Drainage & Stormwater Infrastructure Wing',
        aiAnalysis: {
          confidence: 92,
          detectedCategory: body.category,
          detectedPriority: isEmergency ? 'High' : 'Medium',
          detectedLanguage: body.preferredLanguage || 'English',
          detectedLanguageCode: 'en',
          isOutOfScope: isEmergency,
          outOfScopeReason: isEmergency ? 'Police emergency excluded from municipal scope.' : null,
          emergencyGuidance: isEmergency ? 'CRITICAL NOTICE: Please dial 112 directly.' : null,
        },
        timeline: [{ status: 'Submitted', date: '2026-11-25 10:00 AM', note: 'Complaint logged through JanSetu AI portal.' }],
      };
      complaints.unshift(created);
      return jsonResp(201, {
        success: true,
        data: {
          id: newId,
          referenceId: newId,
          trackingCode,
          title: created.title,
          category: created.category,
          area: created.area,
          state: created.state,
          district: created.district,
          submittedDate: created.submittedDate,
          priority: created.priority,
          status: 'Submitted',
          aiAnalysis: created.aiAnalysis,
          message: 'Complaint registered successfully.',
        },
      });
    }

    if (path === '/complaints/track' && method === 'POST') {
      const body = JSON.parse(init.body || '{}');
      const found = complaints.find(
        (c) => (c.referenceId === body.referenceId || c.id === body.referenceId) && c.trackingCode === body.trackingCode
      );
      if (!found) {
        return jsonResp(404, {
          success: false,
          error: { code: 'INVALID_TRACKING_CREDENTIALS', message: 'Invalid Reference ID or Tracking Code.' },
        });
      }
      const { trackingCode: _tc, ...safeView } = found;
      return jsonResp(200, { success: true, data: safeView });
    }

    if (path === '/auth/login' && method === 'POST') {
      const body = JSON.parse(init.body || '{}');
      if (body.email === 'admin.demo@jansetu.local' && body.password === 'StrongAdminPass') {
        return jsonResp(200, {
          success: true,
          data: {
            token: 'mock.jwt.token',
            expiresIn: 86400,
            admin: { id: 'adm1', name: 'Admin Demo (Supervisor)', email: body.email, role: 'ADMIN' },
          },
        });
      }
      return jsonResp(401, {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
      });
    }

    // Protected admin endpoints
    if (path.startsWith('/auth/me') || path.startsWith('/admin')) {
      if (authHeader !== 'Bearer mock.jwt.token') {
        return jsonResp(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
      }
    }

    if (path === '/auth/me' && method === 'GET') {
      return jsonResp(200, {
        success: true,
        data: { id: 'adm1', name: 'Admin Demo (Supervisor)', email: 'admin.demo@jansetu.local', role: 'ADMIN' },
      });
    }

    if (path === '/admin/analytics' && method === 'GET') {
      return jsonResp(200, {
        success: true,
        data: {
          kpis: {
            totalReports: complaints.length,
            pendingTriage: complaints.filter((c) => c.status === 'Submitted').length,
            inProgress: complaints.filter((c) => c.status === 'In Progress').length,
            reportedResolutions: complaints.filter((c) => c.status === 'Reported Resolved').length,
            recurringIssues: clusters.length,
          },
          trendData: [{ month: 'Nov', submitted: complaints.length, resolved: 0 }],
          categoryData: [{ name: 'Water Supply', value: 50, count: 1, color: '#164DAA' }],
          statusData: [{ status: 'Submitted', count: 1, fill: '#94A3B8' }],
        },
      });
    }

    if (path === '/admin/community-issues' && method === 'GET') {
      return jsonResp(200, { success: true, data: clusters, meta: { pagination: { totalRecords: clusters.length } } });
    }

    if (path === '/admin/complaints' && method === 'GET') {
      const search = (parsedUrl.searchParams.get('search') || '').toLowerCase();
      const filtered = complaints.filter((c) =>
        !search || c.id.toLowerCase().includes(search) || c.title.toLowerCase().includes(search)
      );
      return jsonResp(200, {
        success: true,
        data: filtered.map(({ trackingCode: _tc, ...rest }) => rest),
        meta: { pagination: { currentPage: 1, pageSize: 6, totalRecords: filtered.length, totalPages: 1 } },
      });
    }

    if (path.startsWith('/admin/complaints/') && path.endsWith('/status') && method === 'PATCH') {
      const id = path.split('/')[3];
      const body = JSON.parse(init.body || '{}');
      const target = complaints.find((c) => c.id === id);
      if (!target) return jsonResp(404, { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      if (target.status === 'Submitted' && body.newStatus === 'Verified Resolved') {
        return jsonResp(422, {
          success: false,
          error: { code: 'INVALID_STATUS_TRANSITION', message: "Transition from 'Submitted' to 'Verified Resolved' is not permitted." },
        });
      }
      const prev = target.status;
      target.status = body.newStatus;
      target.timeline.push({ status: body.newStatus, date: '2026-11-25 10:15 AM', note: body.note });
      auditLogs.unshift({
        id: `LOG-${Date.now()}`,
        action: 'STATUS_UPDATE',
        complaintId: id,
        previousStatus: prev,
        newStatus: body.newStatus,
        timestamp: '2026-11-25 10:15:22',
        adminUser: 'Admin Demo (Supervisor)',
        note: body.note,
      });
      const { trackingCode: _tc, ...safeComplaint } = target;
      return jsonResp(200, {
        success: true,
        data: { id, previousStatus: prev, currentStatus: body.newStatus, complaint: safeComplaint },
      });
    }

    if (path.startsWith('/admin/complaints/') && method === 'GET') {
      const id = path.split('/')[3];
      const found = complaints.find((c) => c.id === id);
      if (!found) return jsonResp(404, { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      const { trackingCode: _tc, ...safeView } = found;
      return jsonResp(200, { success: true, data: safeView });
    }

    if (path === '/admin/audit-logs' && method === 'GET') {
      return jsonResp(200, { success: true, data: auditLogs });
    }

    if (path === '/voice/languages' && method === 'GET') {
      return jsonResp(200, {
        success: true,
        data: {
          languages: DEFAULT_VOICE_LANGUAGES,
          providers: { localSttEnabled: true, localTtsEnabled: true, voiceServiceReachable: true },
        },
      });
    }

    if (path === '/voice/transcribe' && method === 'POST') {
      return jsonResp(200, {
        success: true,
        data: {
          transcript:
            'Water has not been coming for three days. My ward number is 13, my state is Karnataka, and my district is Bengaluru Urban.',
          detectedLanguage: 'English',
          detectedLanguageCode: 'en',
          languageConfidence: 96,
          transcriptConfidence: 90,
          qualityStatus: 'good',
          durationSeconds: 4.1,
          rtl: false,
          provider: 'faster-whisper',
          model: 'small-int8',
          recommendHumanReview: false,
          warnings: [],
        },
      });
    }

    if (path === '/voice/extract-complaint' && method === 'POST') {
      const body = JSON.parse(init.body || '{}');
      return jsonResp(200, {
        success: true,
        data: {
          originalTranscript: body.transcript || '',
          detectedLanguage: 'English',
          detectedLanguageCode: 'en',
          title: 'Water Supply Problem',
          description: 'Water has not been coming for three days.',
          category: 'Water Supply',
          categoryCode: 'WATER_SUPPLY',
          state: 'Karnataka',
          district: 'Bengaluru Urban',
          ward: '13',
          area: 'Ward 13',
          locationStatus: 'verified',
          ambiguousLocations: [],
          locationMismatch: null,
          existingFieldConflicts: [],
          warnings: [],
        },
      });
    }

    return jsonResp(404, { success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Not found' } });
  });
}

function setAdminSession() {
  localStorage.setItem('jansetu_admin_token', 'mock.jwt.token');
  localStorage.setItem(
    'jansetu_admin_user',
    JSON.stringify({ id: 'adm1', name: 'Admin Demo (Supervisor)', email: 'admin.demo@jansetu.local', role: 'ADMIN' })
  );
}

describe('JanSetu AI Integrated Frontend Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, 'Test', '/');
    vi.stubGlobal('fetch', createApiMockState());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Citizen dashboard renders branding, hero section, and live stats from backend', async () => {
    render(<App />);
    expect(screen.getAllByText(/JanSetu/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Your Community\./i)).toBeInTheDocument();
    expect(
      (await screen.findAllByText(/Severe low water pressure and shortage in Ward 12/i)).length
    ).toBeGreaterThan(0);
  });

  it('2. Admin login renders and authenticates via JWT backend API', async () => {
    window.history.pushState({}, 'Login', '/admin/login');
    render(<App />);

    expect(screen.getByRole('heading', { name: /Admin Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Authorized Administrator Access/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/admin@jansetu\.local/i), {
      target: { value: 'admin.demo@jansetu.local' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'StrongAdminPass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
      expect(localStorage.getItem('jansetu_admin_token')).toBe('mock.jwt.token');
    });
  });

  it('3. Unauthenticated users cannot access protected /admin route and are redirected to /admin/login', async () => {
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Admin Login/i })).toBeInTheDocument();
  });

  it('4. Authenticated Admin dashboard loads real KPIs, table, and cluster cards', async () => {
    setAdminSession();
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Complaints/i)).toBeInTheDocument();
    expect(await screen.findByText(/Contaminated tap water with foul smell in Block B/i)).toBeInTheDocument();
  });

  it('5. Theme toggle switches between light and dark themes across Citizen, Login, and Admin pages', () => {
    window.history.pushState({}, 'Home', '/');
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByTitle(/Switch to dark mode/i));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('jansetu_theme')).toBe('dark');

    fireEvent.click(screen.getByTitle(/Switch to light mode/i));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    unmount();

    window.history.pushState({}, 'Login', '/admin/login');
    const { unmount: unmountLogin } = render(<App />);
    fireEvent.click(screen.getByTitle(/Switch to dark mode/i));
    expect(localStorage.getItem('jansetu_theme')).toBe('dark');
    unmountLogin();

    setAdminSession();
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);
    fireEvent.click(screen.getByTitle(/Switch to light mode/i));
    expect(localStorage.getItem('jansetu_theme')).toBe('light');
  });

  it('6. Complaint submission validates required fields', async () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Report a Problem/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));

    expect(await screen.findByText(/Please provide a clear title/i)).toBeInTheDocument();
    expect(screen.getByText(/Please specify your area/i)).toBeInTheDocument();
  });

  it('7. Submitting complaint calls API, shows Reference ID & secret Tracking Code, and shows 112 guidance for emergencies', async () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Report a Problem/i })[0]);

    fireEvent.change(screen.getByPlaceholderText(/Broken water pipeline/i), {
      target: { value: 'Violent robbery in market square' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ward 12, Subhash Marg/i), {
      target: { value: 'Ward 2' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
      target: { value: 'Armed attackers damaging shops, please send police squad right away.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));

    expect(await screen.findByText(/Report Submitted Successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/Complaint Reference ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Private Secret Tracking Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Guidance \(Dial 112\)/i)).toBeInTheDocument();
  });

  it('8. Complaint tracking verifies dual credentials via API and rejects wrong tracking code', async () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Track Complaint/i })[0]);

    const refInput = screen.getByPlaceholderText(/JS-2026-8901/i);
    const codeInput = screen.getByPlaceholderText(/TRACK-XXXXXX/i);

    // Wrong credentials
    fireEvent.change(refInput, { target: { value: 'JS-2026-8901' } });
    fireEvent.change(codeInput, { target: { value: 'TRACK-WRONG' } });
    fireEvent.click(screen.getByRole('button', { name: /Lookup Progress/i }));
    expect(await screen.findByText(/Tracking Error/i)).toBeInTheDocument();

    // Valid credentials
    fireEvent.change(codeInput, { target: { value: 'TRACK-901A' } });
    fireEvent.click(screen.getByRole('button', { name: /Lookup Progress/i }));
    expect(await screen.findByText(/Resolution Lifecycle Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Contaminated tap water with foul smell in Block B/i)).toBeInTheDocument();
  });

  it('9. Admin complaints search triggers backend filtering and status drawer persists updates', async () => {
    setAdminSession();
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    expect(await screen.findByText(/Contaminated tap water with foul smell in Block B/i)).toBeInTheDocument();

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Search title, ID, ward/i);
    fireEvent.change(searchInput, { target: { value: 'JS-2026-8906' } });

    await waitFor(() => {
      expect(screen.getByText(/Broken brick masonry on park boundary/i)).toBeInTheDocument();
      expect(screen.queryByText(/Contaminated tap water with foul smell/i)).not.toBeInTheDocument();
    });

    // Open inspect drawer
    const inspectBtn = screen.getAllByRole('button', { name: /Inspect/i })[0];
    fireEvent.click(inspectBtn);

    expect(await screen.findByText(/Administrative Action & Status Update/i)).toBeInTheDocument();

    const noteInput = screen.getByPlaceholderText(/Field inspection ordered/i);
    fireEvent.change(noteInput, { target: { value: 'Verified masonry gap requires repair.' } });

    const statusSelect = screen.getByDisplayValue(/Submitted \(Current\)/i);
    fireEvent.change(statusSelect, { target: { value: 'Verified' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Status/i }));

    await waitFor(() => {
      expect(screen.getByText(/Verified masonry gap requires repair/i)).toBeInTheDocument();
    });
  });

  it('10. Mobile navigation drawer and Admin sidebar collapse/expand behave cleanly', () => {
    const { unmount } = render(<App />);
    const menuToggle = screen.getByLabelText(/Toggle navigation menu/i);
    fireEvent.click(menuToggle);
    expect(screen.getByText(/Admin Login \(Demo\)/i)).toBeInTheDocument();
    fireEvent.click(menuToggle);
    expect(screen.queryByText(/Admin Login \(Demo\)/i)).not.toBeInTheDocument();
    unmount();

    setAdminSession();
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    expect(screen.getByText(/^Civic Intelligence$/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Collapse sidebar/i));
    expect(screen.queryByText(/^Civic Intelligence$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Expand sidebar/i));
    expect(screen.getByText(/^Civic Intelligence$/i)).toBeInTheDocument();
  });

  it('11. Confirmation modal checks Remember by default, allows receipt download/copy, and removes local credentials when unchecked', async () => {
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    const createObjectUrlSpy = vi.fn(() => 'blob:receipt-test-url');
    const revokeObjectUrlSpy = vi.fn();
    URL.createObjectURL = createObjectUrlSpy;
    URL.revokeObjectURL = revokeObjectUrlSpy;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    try {
      render(<App />);
      expect(screen.getByRole('heading', { name: /^My Reports$/i })).toBeInTheDocument();
      expect(screen.getByText(/Your submitted complaints, all in one place\./i)).toBeInTheDocument();
      expect(await screen.findByText(/No saved reports on this device yet/i)).toBeInTheDocument();

      fireEvent.click(screen.getAllByRole('button', { name: /Report a Problem/i })[0]);
      fireEvent.change(screen.getByPlaceholderText(/Broken water pipeline/i), {
        target: { value: 'Overflowing manhole near Station Road' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Ward 12, Subhash Marg/i), {
        target: { value: 'Ward 5' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
        target: { value: 'Sewage water spilling onto main pedestrian crossing since morning.' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));

      expect(await screen.findByText(/Report Submitted Successfully/i)).toBeInTheDocument();

      // Checkbox is checked by default and credentials are automatically persisted on submit
      const rememberCheckbox = screen.getByLabelText(/Remember this report on this device/i);
      expect(rememberCheckbox.checked).toBe(true);
      expect(screen.getByText(/shared or public devices is/i)).toBeInTheDocument();

      const autoSaved = JSON.parse(localStorage.getItem('jansetu_my_reports_v1') || '[]');
      expect(autoSaved).toHaveLength(1);
      expect(autoSaved[0].title).toBe('Overflowing manhole near Station Road');
      expect(autoSaved[0].trackingCode).toBeTruthy();

      // Download receipt and copy buttons remain available
      expect(screen.getByRole('button', { name: /Copy Reference ID/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy Tracking Code/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Download Receipt/i }));
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:receipt-test-url');

      // Uncheck before closing -> must remove locally stored credentials and NOT show in My Reports
      fireEvent.click(rememberCheckbox);
      expect(rememberCheckbox.checked).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: /^Done$/i }));

      expect(JSON.parse(localStorage.getItem('jansetu_my_reports_v1') || '[]')).toHaveLength(0);
      expect(await screen.findByText(/No saved reports on this device yet/i)).toBeInTheDocument();
      expect(screen.queryByText(/Overflowing manhole near Station Road/i)).not.toBeInTheDocument();
    } finally {
      URL.createObjectURL = origCreateObjectURL;
      URL.revokeObjectURL = origRevokeObjectURL;
    }
  });

  it('12. Leaving Remember checked automatically keeps report in My Reports across reloads and syncs live Admin status updates', async () => {
    const mockFetch = createApiMockState();
    vi.stubGlobal('fetch', mockFetch);

    const { unmount } = render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Report a Problem/i })[0]);

    fireEvent.change(screen.getByPlaceholderText(/Broken water pipeline/i), {
      target: { value: 'Clogged stormwater culvert on Link Road' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ward 12, Subhash Marg/i), {
      target: { value: 'Ward 9' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
      target: { value: 'Stormwater drainage culvert blocked after rains causing heavy pooling.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));

    expect(await screen.findByText(/Report Submitted Successfully/i)).toBeInTheDocument();
    const rememberCheckbox = screen.getByLabelText(/Remember this report on this device/i);
    expect(rememberCheckbox.checked).toBe(true);
    // Finish without toggling checkbox -> already saved automatically
    fireEvent.click(screen.getByRole('button', { name: /^Done$/i }));

    // Card renders in My Reports immediately
    expect(await screen.findByText(/Clogged stormwater culvert on Link Road/i)).toBeInTheDocument();
    expect(screen.getByText(/Ward 9/i)).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('jansetu_my_reports_v1') || '[]');
    expect(saved).toHaveLength(1);
    const savedRefId = saved[0].referenceId;
    const savedTrackingCode = saved[0].trackingCode;
    expect(savedTrackingCode).toBeTruthy();

    // Simulate Admin updating that complaint's status on backend
    await mockFetch(`/api/v1/admin/complaints/${savedRefId}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer mock.jwt.token' },
      body: JSON.stringify({ newStatus: 'Verified', note: 'Sanitation inspector verified site blockage.' }),
    });

    // Simulate browser reload / fresh CitizenDashboard mount
    unmount();
    render(<App />);

    expect(await screen.findByText(/Clogged stormwater culvert on Link Road/i)).toBeInTheDocument();
    // Status in My Reports should refresh to Verified via POST /complaints/track
    await waitFor(() => {
      const refreshed = JSON.parse(localStorage.getItem('jansetu_my_reports_v1') || '[]');
      expect(refreshed[0].status).toBe('Verified');
    });

    // Secret tracking code must NEVER appear as card text on the dashboard
    expect(screen.queryByText(savedTrackingCode)).not.toBeInTheDocument();
  });

  it('13. View Details opens dedicated detail modal with AI Advisory authority and Remove deletes local credentials', async () => {
    localStorage.setItem(
      'jansetu_my_reports_v1',
      JSON.stringify([
        {
          id: 'JS-2026-8901',
          referenceId: 'JS-2026-8901',
          trackingCode: 'TRACK-901A',
          title: 'Contaminated tap water with foul smell in Block B',
          category: 'Water Supply',
          area: 'Ward 12',
          submittedDate: '2026-11-20',
          status: 'Submitted',
          priority: 'High',
          savedAt: '2026-11-25T08:00:00.000Z',
        },
      ])
    );

    render(<App />);
    expect(await screen.findByText(/Contaminated tap water with foul smell in Block B/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View Details/i }));

    expect(await screen.findByText(/Recommended Authority/i)).toBeInTheDocument();
    expect(screen.getByText(/^AI Advisory$/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Municipal Water Supply & Sewerage Board/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Pipeline flushing underway/i)).toBeInTheDocument();
    expect(screen.queryByText('TRACK-901A')).not.toBeInTheDocument();

    // Remove report from modal
    const removeButtons = screen.getAllByRole('button', { name: /Remove from My Reports/i });
    fireEvent.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('jansetu_my_reports_v1') || '[]')).toHaveLength(0);
      expect(screen.getByText(/No saved reports on this device yet/i)).toBeInTheDocument();
    });
  });

  it('14. Invalid tracking credentials in My Reports prompt verification without bypassing dual-credential auth', async () => {
    localStorage.setItem(
      'jansetu_my_reports_v1',
      JSON.stringify([
        {
          id: 'JS-2026-8901',
          referenceId: 'JS-2026-8901',
          trackingCode: 'TRACK-WRONG99',
          title: 'Contaminated tap water with foul smell in Block B',
          category: 'Water Supply',
          area: 'Ward 12',
          submittedDate: '2026-11-20',
          status: 'Submitted',
          priority: 'High',
          savedAt: '2026-11-25T08:00:00.000Z',
        },
      ])
    );

    render(<App />);
    expect(
      await screen.findByText(/Credentials invalid or report unavailable/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View Details/i }));
    expect(
      await screen.findByText(/Tracking Credential Verification Required/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/TRACK-XXXXXX/i), {
      target: { value: 'TRACK-901A' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Load/i }));

    expect(await screen.findByText(/Pipeline flushing underway/i)).toBeInTheDocument();
    const updated = JSON.parse(localStorage.getItem('jansetu_my_reports_v1') || '[]');
    expect(updated[0].trackingCode).toBe('TRACK-901A');
  });

  it('15. State and District searchable dropdowns load all Indian states/UTs, enforce cascading selection, clear district on state change, and submit exact field names', async () => {
    const baseMockFetch = createApiMockState();
    let submittedPayload = null;
    vi.stubGlobal('fetch', async (url, init = {}) => {
      if (String(url).endsWith('/complaints') && (init.method || 'GET').toUpperCase() === 'POST') {
        submittedPayload = JSON.parse(init.body || '{}');
      }
      return baseMockFetch(url, init);
    });

    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Report a Problem/i })[0]);

    // District dropdown must remain disabled until a State/UT is selected
    const stateTrigger = screen.getByRole('combobox', { name: /^State$/i });
    const districtTrigger = screen.getByRole('combobox', { name: /District \/ City/i });
    expect(districtTrigger).toBeDisabled();

    // Open State dropdown and verify UTs + States are present and searchable
    fireEvent.click(stateTrigger);
    const stateListbox = screen.getByRole('listbox', { name: /^State$/i });
    expect(within(stateListbox).getAllByRole('option')).toHaveLength(36);

    const stateSearch = screen.getByPlaceholderText(/Search state or union territory/i);
    fireEvent.change(stateSearch, { target: { value: 'Andaman' } });
    expect(within(stateListbox).getByRole('option', { name: /Andaman and Nicobar Islands/i })).toBeInTheDocument();

    fireEvent.change(stateSearch, { target: { value: 'Maharashtra' } });
    fireEvent.click(within(stateListbox).getByRole('option', { name: /Maharashtra/i }));

    // Selecting Maharashtra unlocks District dropdown and loads Maharashtra districts
    expect(districtTrigger).toBeEnabled();
    fireEvent.click(districtTrigger);
    const districtListbox = screen.getByRole('listbox', { name: /District \/ City/i });
    expect(within(districtListbox).getByRole('option', { name: 'Pune' })).toBeInTheDocument();
    expect(within(districtListbox).getByRole('option', { name: 'Nagpur' })).toBeInTheDocument();
    fireEvent.click(within(districtListbox).getByRole('option', { name: 'Pune' }));
    expect(districtTrigger).toHaveTextContent('Pune');

    // Switching State to Karnataka must clear previously selected District ('Pune')
    fireEvent.click(stateTrigger);
    const nextStateListbox = screen.getByRole('listbox', { name: /^State$/i });
    fireEvent.change(screen.getByPlaceholderText(/Search state or union territory/i), {
      target: { value: 'Karnataka' },
    });
    fireEvent.click(within(nextStateListbox).getByRole('option', { name: /Karnataka/i }));
    expect(districtTrigger).toHaveTextContent(/Select District \/ City/i);

    // Open District dropdown -> verify Karnataka districts loaded and Maharashtra districts gone
    fireEvent.click(districtTrigger);
    const nextDistrictListbox = screen.getByRole('listbox', { name: /District \/ City/i });
    expect(within(nextDistrictListbox).queryByRole('option', { name: 'Pune' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Search district or city/i), {
      target: { value: 'Bengaluru Urban' },
    });
    fireEvent.click(within(nextDistrictListbox).getByRole('option', { name: 'Bengaluru Urban' }));

    // Complete form & submit
    fireEvent.change(screen.getByPlaceholderText(/Broken water pipeline/i), {
      target: { value: 'Broken pedestrian signal near MG Road Metro' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ward 12, Subhash Marg/i), {
      target: { value: 'Shanthala Nagar Ward 111' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
      target: { value: 'Pedestrian crossing signal stays dark during peak evening rush hour.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));

    expect(await screen.findByText(/Report Submitted Successfully/i)).toBeInTheDocument();
    expect(submittedPayload).toBeTruthy();
    expect(submittedPayload.state).toBe('Karnataka');
    expect(submittedPayload.district).toBe('Bengaluru Urban');

    // Close modal & inspect saved report in My Reports -> View Details
    fireEvent.click(screen.getByRole('button', { name: /^Done$/i }));
    expect(await screen.findByText(/Broken pedestrian signal near MG Road Metro/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View Details/i }));
    expect(await screen.findByText(/Bengaluru Urban, Karnataka/i)).toBeInTheDocument();
  });

  it('16. Homepage renders Report a Problem, Voice Complaint, Track My Complaint in order and supports both voice entry points cleanly without auto-submit', async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:hero-voice-rec');
    URL.revokeObjectURL = vi.fn();

    let recorderInstance = null;
    class MockMediaRecorder {
      constructor(stream, opts = {}) {
        this.stream = stream;
        this.mimeType = opts.mimeType || 'audio/webm';
        this.state = 'inactive';
        recorderInstance = this;
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        const payload = new Uint8Array(256).fill(68);
        this.ondataavailable?.({ data: new Blob([payload], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    MockMediaRecorder.isTypeSupported = () => true;
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    try {
      render(<App />);

      // Verify exact hero CTA button order: Report a Problem -> Voice Complaint -> Track My Complaint
      const reportBtn = screen.getAllByRole('button', { name: /^Report a Problem$/i })[0];
      const voiceBtn = screen.getByRole('button', { name: /^Voice Complaint$/i });
      const trackBtn = screen.getByRole('button', { name: /^Track My Complaint$/i });
      expect(reportBtn).toBeInTheDocument();
      expect(voiceBtn).toBeInTheDocument();
      expect(trackBtn).toBeInTheDocument();
      expect(
        Boolean(reportBtn.compareDocumentPosition(voiceBtn) & Node.DOCUMENT_POSITION_FOLLOWING)
      ).toBe(true);
      expect(
        Boolean(voiceBtn.compareDocumentPosition(trackBtn) & Node.DOCUMENT_POSITION_FOLLOWING)
      ).toBe(true);

      // Entry Point A: Homepage -> Voice Complaint -> direct voice mode -> record -> extract -> edit -> submit -> track
      fireEvent.click(voiceBtn);
      expect(await screen.findByRole('heading', { name: /Voice Complaint Input/i })).toBeInTheDocument();
      expect(screen.getByTestId('voice-complaint-section')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));
      await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
      fireEvent.click(screen.getByRole('button', { name: /Stop Recording/i }));

      expect(await screen.findByTestId('extracted-fields-preview')).toBeInTheDocument();
      expect(screen.getByLabelText(/Extracted title/i).value).toBe('Water Supply Problem');

      // Correct extracted title before applying; never auto-submits
      fireEvent.change(screen.getByLabelText(/Extracted title/i), {
        target: { value: 'Severe Water Supply Outage in Ward 13' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Apply Extracted Fields to Form/i }));
      expect(screen.queryByText(/Report Submitted Successfully/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));
      expect(await screen.findByText(/Report Submitted Successfully/i)).toBeInTheDocument();

      // Track newly submitted voice complaint cleanly
      fireEvent.click(screen.getByRole('button', { name: /Track This Complaint Now/i }));
      expect(await screen.findByText(/Resolution Lifecycle Timeline/i)).toBeInTheDocument();
      expect(
        screen.getAllByText(/Severe Water Supply Outage in Ward 13/i).length
      ).toBeGreaterThanOrEqual(2);

      // Close tracking modal and return to homepage
      fireEvent.click(screen.getByLabelText(/Close modal/i));

      // Entry Point B: Homepage -> Report a Problem -> normal form with internal voice complaint option preserved
      fireEvent.click(screen.getAllByRole('button', { name: /^Report a Problem$/i })[0]);
      expect(await screen.findByRole('heading', { name: /Report a Community Problem/i })).toBeInTheDocument();
      expect(screen.getByText(/Voice Complaint Input \(Optional\)/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));
      await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
      fireEvent.click(screen.getByRole('button', { name: /Stop Recording/i }));

      expect(await screen.findByTestId('extracted-fields-preview')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Apply Extracted Fields to Form/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));
      expect(await screen.findByText(/Report Submitted Successfully/i)).toBeInTheDocument();
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      delete navigator.mediaDevices;
      delete globalThis.MediaRecorder;
    }
  });
});
