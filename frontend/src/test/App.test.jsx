import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { complaintService } from '../services/complaintService';

describe('JanSetu AI Platform Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    complaintService.resetDemoData();
    window.history.pushState({}, 'Test', '/');
  });

  // Test 1: Citizen dashboard renders
  it('1. Citizen dashboard renders with core branding and hero section', () => {
    render(<App />);
    expect(screen.getAllByText(/JanSetu/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Your Community\./i)).toBeInTheDocument();
    expect(screen.getByText(/Your Voice\./i)).toBeInTheDocument();
  });

  // Test 2: Admin login page renders
  it('2. Admin login page renders with demo notice and form fields', async () => {
    window.history.pushState({}, 'Login', '/admin/login');
    render(<App />);

    expect(screen.getByRole('heading', { name: /Admin Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Demonstration Mode Active/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin@jansetu\.local/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Dashboard/i })).toBeInTheDocument();
  });

  // Test 3: Admin dashboard renders
  it('3. Admin dashboard renders with KPI cards and overview sections', async () => {
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Complaints/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Triage/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Complaints Registry/i)).toBeInTheDocument();
  });

  // Test 4: Route navigation works
  it('4. Route navigation works between citizen portal, login, and admin', async () => {
    window.history.pushState({}, 'Home', '/');
    render(<App />);

    // Click Admin Login button
    const adminLink = screen.getAllByRole('link', { name: /Admin Login/i })[0];
    fireEvent.click(adminLink);

    expect(screen.getByRole('heading', { name: /Admin Login/i })).toBeInTheDocument();

    // Submit demo login form to navigate to /admin
    const signInBtn = screen.getByRole('button', { name: /Sign In to Dashboard/i });
    fireEvent.click(signInBtn);

    await waitFor(() => {
      expect(screen.getByText(/Admin Overview/i)).toBeInTheDocument();
    });
  });

  // Test 5: Theme toggle works across routes
  it('5. Theme toggle switches between light and dark themes on Citizen, Login, and Admin pages', () => {
    // 5a. Citizen Dashboard
    window.history.pushState({}, 'Home', '/');
    const { unmount } = render(<App />);
    const toggleBtn = screen.getByTitle(/Switch to dark mode/i);
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('jansetu_theme')).toBe('dark');

    const lightToggle = screen.getByTitle(/Switch to light mode/i);
    fireEvent.click(lightToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('jansetu_theme')).toBe('light');

    unmount();

    // 5b. Admin Login page
    window.history.pushState({}, 'Login', '/admin/login');
    const { unmount: unmountLogin } = render(<App />);
    const loginToggle = screen.getByTitle(/Switch to dark mode/i);
    fireEvent.click(loginToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('jansetu_theme')).toBe('dark');
    unmountLogin();

    // 5c. Admin Dashboard
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);
    const adminToggle = screen.getByTitle(/Switch to light mode/i);
    fireEvent.click(adminToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('jansetu_theme')).toBe('light');
  });

  // Test 6: Theme persists after refresh
  it('6. Theme preference persists in localStorage', () => {
    render(<App />);
    const toggleBtn = screen.getByTitle(/Switch to dark mode/i);
    fireEvent.click(toggleBtn);

    expect(localStorage.getItem('jansetu_theme')).toBe('dark');
  });

  // Test 7: Complaint submission validates required fields
  it('7. Complaint submission form validates required fields', async () => {
    render(<App />);
    const reportBtns = screen.getAllByRole('button', { name: /Report a Problem/i });
    fireEvent.click(reportBtns[0]);

    // Click submit with empty form
    const submitBtn = screen.getByRole('button', { name: /^Submit Complaint$/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please provide a clear title/i)).toBeInTheDocument();
    expect(screen.getByText(/Please specify your area/i)).toBeInTheDocument();
  });

  // Test 8: Demo complaint submission generates tracking credentials
  it('8. Submitting a complaint generates demo tracking credentials', async () => {
    render(<App />);
    const reportBtns = screen.getAllByRole('button', { name: /Report a Problem/i });
    fireEvent.click(reportBtns[0]);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Broken water pipeline/i), {
      target: { value: 'Broken drainage lid on 5th cross street' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ward 12, Subhash Marg/i), {
      target: { value: 'Ward 4, North Zone' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe the issue/i), {
      target: { value: 'Water has been stagnant for 3 days causing terrible foul odor for the residents.' },
    });

    const submitBtn = screen.getByRole('button', { name: /^Submit Complaint$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Report Submitted Successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/Complaint Reference ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Private Secret Tracking Code/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // Test 9: Complaint tracking works with valid credentials
  it('9. Complaint tracking works with valid credentials', async () => {
    render(<App />);
    const trackBtns = screen.getAllByRole('button', { name: /Track Complaint/i });
    fireEvent.click(trackBtns[0]);

    // Use Sample Demo credentials
    const sampleLink = screen.getByText(/Use Sample Demo Credentials/i);
    fireEvent.click(sampleLink);

    await waitFor(() => {
      expect(screen.getByText(/Resolution Lifecycle Timeline/i)).toBeInTheDocument();
      expect(screen.getByText(/Contaminated tap water with foul smell in Block B/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // Test 10: Invalid tracking credentials show an error
  it('10. Invalid tracking credentials display a clear error message', async () => {
    render(<App />);
    const trackBtns = screen.getAllByRole('button', { name: /Track Complaint/i });
    fireEvent.click(trackBtns[0]);

    const refInput = screen.getByPlaceholderText(/JS-2026-8901/i);
    const codeInput = screen.getByPlaceholderText(/TRACK-901A/i);

    fireEvent.change(refInput, { target: { value: 'JS-INVALID' } });
    fireEvent.change(codeInput, { target: { value: 'TRACK-BAD' } });

    const lookupBtn = screen.getByRole('button', { name: /Lookup Progress/i });
    fireEvent.click(lookupBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tracking Error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // Test 11: Admin filters work
  it('11. Admin complaints table filters work by category and search', async () => {
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Search title, ID, ward/i);
    fireEvent.change(searchInput, { target: { value: 'JS-2026-8901' } });

    expect(screen.getByText(/Contaminated tap water with foul smell in Block B/i)).toBeInTheDocument();
    expect(screen.queryByText(/Commercial waste bin overflow/i)).not.toBeInTheDocument();
  });

  // Test 12: Admin status updates work
  it('12. Admin can update complaint status and UI reflects change', async () => {
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    // Inspect first complaint
    const inspectBtns = screen.getAllByRole('button', { name: /Inspect/i });
    fireEvent.click(inspectBtns[0]);

    expect(await screen.findByText(/Administrative Action & Status Update/i)).toBeInTheDocument();

    const updateBtn = screen.getByRole('button', { name: /Update Status/i });
    const noteInput = screen.getByPlaceholderText(/Field inspection ordered/i);

    fireEvent.change(noteInput, { target: { value: 'Supervisor verified road repair crew on site.' } });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Supervisor verified road repair crew on site/i)).toBeInTheDocument();
    });
  });

  // Test 13: Audit log updates after status changes
  it('13. Audit logs record status changes', async () => {
    complaintService.updateComplaintStatus('JS-2026-8901', 'Reported Resolved', 'Test resolution by officer');
    const logs = complaintService.getAuditLogs();
    const latestLog = logs[0];

    expect(latestLog.complaintId).toBe('JS-2026-8901');
    expect(latestLog.newStatus).toBe('Reported Resolved');
    expect(latestLog.note).toBe('Test resolution by officer');
  });

  // Test 14: Mobile navigation opens and closes
  it('14. Mobile navigation drawer opens and closes properly', () => {
    render(<App />);
    const menuToggle = screen.getByLabelText(/Toggle navigation menu/i);
    fireEvent.click(menuToggle);

    expect(screen.getByText(/Admin Login \(Demo\)/i)).toBeInTheDocument();

    // Close menu by clicking toggle again
    fireEvent.click(menuToggle);
    expect(screen.queryByText(/Admin Login \(Demo\)/i)).not.toBeInTheDocument();
  });

  // Test 15: Admin sidebar collapse and expand behavior
  it('15. Admin sidebar collapses cleanly without logo clipping and expands back', () => {
    window.history.pushState({}, 'Admin', '/admin');
    render(<App />);

    // Initially expanded - shows brand heading "JanSetu Admin" and collapse button
    expect(screen.getByRole('heading', { name: /JanSetu Admin/i })).toBeInTheDocument();
    const collapseBtn = screen.getByLabelText(/Collapse sidebar/i);
    expect(collapseBtn).toBeInTheDocument();

    // Collapse the sidebar
    fireEvent.click(collapseBtn);

    // Text and collapse button should be hidden completely, no clipping fragments
    expect(screen.queryByRole('heading', { name: /JanSetu Admin/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Collapse sidebar/i)).not.toBeInTheDocument();

    // Expand button is displayed and accessible
    const expandBtn = screen.getByLabelText(/Expand sidebar/i);
    expect(expandBtn).toBeInTheDocument();

    // Expand again
    fireEvent.click(expandBtn);
    expect(screen.getByRole('heading', { name: /JanSetu Admin/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Collapse sidebar/i)).toBeInTheDocument();
  });
});
