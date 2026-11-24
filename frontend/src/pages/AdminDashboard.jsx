import { useState } from 'react';
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
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [complaints, setComplaints] = useState(() => complaintService.getComplaints());
  const [communityIssues, setCommunityIssues] = useState(() => complaintService.getCommunityIssues());
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Derived KPI metrics
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(
    (c) => c.status === 'Submitted' || c.status === 'Verified'
  ).length;
  const inProgressCount = complaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'Acknowledged' || c.status === 'Forwarded'
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === 'Reported Resolved' || c.status === 'Verified Resolved'
  ).length;

  const handleOpenDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setDrawerOpen(true);
  };

  const handleComplaintUpdated = (updatedComplaint) => {
    // Refresh local complaints state
    const refreshed = complaintService.getComplaints();
    setComplaints(refreshed);
    setSelectedComplaint(updatedComplaint);
  };

  const handleResetData = () => {
    setComplaints(complaintService.getComplaints());
    setCommunityIssues(complaintService.getCommunityIssues());
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      searchQuery={globalSearch}
      onSearchChange={(q) => {
        setGlobalSearch(q);
        // If user searches from top nav, switch to complaints view
        if (q && activeTab !== 'complaints') {
          setActiveTab('complaints');
        }
      }}
    >
      <div className="space-y-8 pb-12">
        {/* VIEW 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <KpiCard
                title="Total Complaints"
                value={totalCount}
                subtitle="All registered citizen records"
                change="+12% this week"
                icon={FileText}
                colorScheme="blue"
              />
              <KpiCard
                title="Pending Triage"
                value={pendingCount}
                subtitle="Awaiting initial verification"
                change="Immediate action"
                isPositive={false}
                icon={AlertCircle}
                colorScheme="amber"
              />
              <KpiCard
                title="In Progress"
                value={inProgressCount}
                subtitle="Assigned to municipal teams"
                change="Active pipeline"
                icon={Clock}
                colorScheme="indigo"
              />
              <KpiCard
                title="Reported Resolved"
                value={resolvedCount}
                subtitle="Remediated by authorities"
                change="+5 this week"
                icon={CheckCircle2}
                colorScheme="emerald"
              />
            </div>

            {/* Analytics Trends */}
            <AnalyticsSection />

            {/* Recent Complaints Table */}
            <ComplaintsTable
              complaints={complaints}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communityIssues.slice(0, 3).map((issue) => (
                  <CommunityIssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: COMPLAINTS REGISTRY */}
        {activeTab === 'complaints' && (
          <div className="space-y-6 animate-in fade-in">
            <ComplaintsTable
              complaints={complaints}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityIssues.map((issue) => (
                <CommunityIssueCard key={issue.id} issue={issue} />
              ))}
            </div>
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
                Comprehensive data visualizations on intake trends, categories, and resolution velocity
              </p>
            </div>
            <AnalyticsSection />
          </div>
        )}

        {/* VIEW 5: AUTHORITY DIRECTORY */}
        {activeTab === 'authorities' && (
          <div className="space-y-6 animate-in fade-in">
            <AuthorityDirectory />
          </div>
        )}

        {/* VIEW 6: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6 animate-in fade-in">
            <AuditLogsView />
          </div>
        )}

        {/* VIEW 7: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in">
            <AdminSettings onResetData={handleResetData} />
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
