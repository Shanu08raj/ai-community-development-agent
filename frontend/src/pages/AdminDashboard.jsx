import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { KpiCard } from '../components/dashboard/KpiCard';
import { AnalyticsSection } from '../components/dashboard/AnalyticsSection';
import { CommunityIssueCard } from '../components/dashboard/CommunityIssueCard';
import { AuthorityDirectory } from '../components/dashboard/AuthorityDirectory';
import { AuditLogsView } from '../components/dashboard/AuditLogsView';
import { AdminSettings } from '../components/dashboard/AdminSettings';
import { ComplaintsTable } from '../components/complaints/ComplaintsTable';
import { ComplaintDetailDrawer } from '../components/complaints/ComplaintDetailDrawer';
import { complaintService } from '../services/complaintService';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [complaints, setComplaints] = useState([]);
  const [complaintsPagination, setComplaintsPagination] = useState({
    currentPage: 1,
    pageSize: 6,
    totalRecords: 0,
    totalPages: 1,
  });
  const [complaintFilters, setComplaintFilters] = useState({
    search: '',
    category: 'All',
    status: 'All',
    priority: 'All',
    page: 1,
    limit: 6,
    sortBy: 'submittedDate',
    sortOrder: 'desc',
  });

  const [communityIssues, setCommunityIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const handleAuthError = useCallback(
    (err) => {
      if (err?.status === 401 || err?.status === 403) {
        authService.logout();
        addToast('Session expired or unauthorized. Please sign in again.', 'error');
        navigate('/admin/login', { replace: true });
        return true;
      }
      return false;
    },
    [addToast, navigate]
  );

  // Load KPI analytics & community clusters
  useEffect(() => {
    let active = true;
    async function loadOverviewData() {
      setIsLoadingDashboard(true);
      setDashboardError('');
      try {
        await authService.verifySession();
        const [analyticsData, clustersRes] = await Promise.all([
          complaintService.getAdminAnalytics(),
          complaintService.getCommunityIssues({ limit: 30 }),
        ]);
        if (!active) return;
        setAnalytics(analyticsData);
        setCommunityIssues(clustersRes.items || []);
      } catch (err) {
        if (!active) return;
        if (handleAuthError(err)) return;
        setDashboardError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        if (active) setIsLoadingDashboard(false);
      }
    }
    loadOverviewData();
    return () => {
      active = false;
    };
  }, [refreshNonce, handleAuthError]);

  // Load filtered/paginated complaints from backend
  useEffect(() => {
    let active = true;
    async function loadComplaints() {
      setIsLoadingComplaints(true);
      try {
        const res = await complaintService.getComplaints(complaintFilters);
        if (!active) return;
        setComplaints(res.items || []);
        if (res.pagination) {
          setComplaintsPagination(res.pagination);
        }
      } catch (err) {
        if (!active) return;
        if (handleAuthError(err)) return;
        setDashboardError(err.message || 'Failed to load complaints registry.');
      } finally {
        if (active) setIsLoadingComplaints(false);
      }
    }
    loadComplaints();
    return () => {
      active = false;
    };
  }, [complaintFilters, refreshNonce, handleAuthError]);

  const kpis = analytics?.kpis || {
    totalReports: 0,
    pendingTriage: 0,
    inProgress: 0,
    reportedResolutions: 0,
  };

  const handleOpenDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setDrawerOpen(true);
  };

  const handleComplaintUpdated = (updatedComplaint) => {
    setSelectedComplaint(updatedComplaint);
    setRefreshNonce((n) => n + 1);
  };

  const handleRefreshData = () => {
    setRefreshNonce((n) => n + 1);
  };

  const handleGlobalSearch = (q) => {
    setGlobalSearch(q);
    setComplaintFilters((prev) => ({
      ...prev,
      search: q,
      page: 1,
    }));
    if (q && activeTab !== 'complaints') {
      setActiveTab('complaints');
    }
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      searchQuery={globalSearch}
      onSearchChange={handleGlobalSearch}
    >
      <div className="space-y-8 pb-12">
        {dashboardError && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{dashboardError}</span>
          </div>
        )}

        {/* VIEW 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KpiCard
                title="Total Complaints"
                value={isLoadingDashboard ? '...' : kpis.totalReports}
                subtitle="All registered citizen records"
                change="Live MongoDB count"
                icon={FileText}
                colorScheme="blue"
              />
              <KpiCard
                title="Pending Triage"
                value={isLoadingDashboard ? '...' : kpis.pendingTriage}
                subtitle="Awaiting initial verification"
                change="Requires admin review"
                isPositive={false}
                icon={AlertCircle}
                colorScheme="amber"
              />
              <KpiCard
                title="In Progress"
                value={isLoadingDashboard ? '...' : kpis.inProgress}
                subtitle="Forwarded / Active stages"
                change="Active pipeline"
                icon={Clock}
                colorScheme="indigo"
              />
              <KpiCard
                title="Reported Resolved"
                value={isLoadingDashboard ? '...' : kpis.reportedResolutions}
                subtitle="Resolved & verified closures"
                change="Verified lifecycle"
                icon={CheckCircle2}
                colorScheme="emerald"
              />
            </div>

            {/* Analytics Trends */}
            <AnalyticsSection analytics={analytics} isLoading={isLoadingDashboard} />

            {/* Recent Complaints Table */}
            <ComplaintsTable
              complaints={complaints}
              filters={complaintFilters}
              onFiltersChange={setComplaintFilters}
              pagination={complaintsPagination}
              isLoading={isLoadingComplaints}
              onViewDetails={handleOpenDetail}
            />

            {/* AI Identified Recurring Issues Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    AI Recurring Issues & Community Clusters
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    High-priority issue clusters aggregating multiple citizen reports
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('community-issues')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  View All Clusters →
                </button>
              </div>

              {communityIssues.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {communityIssues.slice(0, 3).map((issue) => (
                    <CommunityIssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#263449] text-center text-xs text-slate-500">
                  No community clusters formed yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: COMPLAINTS REGISTRY */}
        {activeTab === 'complaints' && (
          <div className="space-y-6 animate-in fade-in">
            <ComplaintsTable
              complaints={complaints}
              filters={complaintFilters}
              onFiltersChange={setComplaintFilters}
              pagination={complaintsPagination}
              isLoading={isLoadingComplaints}
              onViewDetails={handleOpenDetail}
            />
          </div>
        )}

        {/* VIEW 3: COMMUNITY ISSUES CLUSTERS */}
        {activeTab === 'community-issues' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                AI Community Issue Clusters
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Aggregated civic issues grouped by geographical ward and natural language similarity
              </p>
            </div>

            {communityIssues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communityIssues.map((issue) => (
                  <CommunityIssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#263449] text-center text-xs text-slate-500">
                No community issue clusters found.
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Civic Intelligence Analytics
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Live database visualizations on intake trends, categories, and resolution velocity
              </p>
            </div>
            <AnalyticsSection analytics={analytics} isLoading={isLoadingDashboard} />
          </div>
        )}

        {/* VIEW 5: AUTHORITY DIRECTORY */}
        {activeTab === 'authorities' && (
          <div className="space-y-6 animate-in fade-in">
            <AuthorityDirectory onAuthError={handleAuthError} />
          </div>
        )}

        {/* VIEW 6: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6 animate-in fade-in">
            <AuditLogsView refreshNonce={refreshNonce} onAuthError={handleAuthError} />
          </div>
        )}

        {/* VIEW 7: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in">
            <AdminSettings onRefreshData={handleRefreshData} />
          </div>
        )}
      </div>

      {/* Complaint Detail Drawer / Modal */}
      <ComplaintDetailDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedComplaint(null);
        }}
        complaint={selectedComplaint}
        onComplaintUpdated={handleComplaintUpdated}
      />
    </AdminLayout>
  );
};
