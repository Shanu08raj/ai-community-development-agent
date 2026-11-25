import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ShieldCheck,
  PlusCircle,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { KpiCard } from '../components/dashboard/KpiCard';
import { CommunityIssueCard } from '../components/dashboard/CommunityIssueCard';
import { MyReportsSection } from '../components/complaints/MyReportsSection';
import { complaintService } from '../services/complaintService';
import { ISSUE_CATEGORIES } from '../data/mockData';

export const CitizenDashboard = () => {
  const {
    onOpenSubmitModal,
    onOpenTrackModal,
    reportsRevision = 0,
    onReportsChanged,
  } = useOutletContext();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stats, setStats] = useState({
    totalReports: 0,
    recurringIssues: 0,
    inProgress: 0,
    reportedResolutions: 0,
    growthRates: {
      totalReports: 'Loading...',
      recurringIssues: 'Loading...',
      inProgress: 'Loading...',
      reportedResolutions: 'Loading...',
    },
  });
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setIsLoading(true);
      setError('');
      try {
        const [statsData, issuesRes] = await Promise.all([
          complaintService.getPublicStats(),
          complaintService.getPublicCommunityIssues({
            category: selectedCategory === 'All' ? undefined : selectedCategory,
            limit: 12,
          }),
        ]);
        if (!active) return;
        if (statsData) setStats(statsData);
        setIssues(issuesRes.items || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load community intelligence data from backend.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadDashboard();
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  const featuredIssue = issues[0] || null;

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO SECTION */}
      <section
        id="hero"
        className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden border-b border-slate-100 dark:border-[#263449]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Powered Civic Problem Clustering</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#172033] dark:text-[#F8FAFC] leading-tight">
                Your Community.{' '}
                <span className="text-[#164DAA] dark:text-[#3B82F6]">
                  Your Voice.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#64748B] dark:text-[#94A3B8] max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Report local problems, discover recurring issues affecting your neighborhood through AI aggregation, and follow community progress transparently.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button
                  size="lg"
                  variant="primary"
                  leftIcon={<PlusCircle className="w-5 h-5" />}
                  onClick={onOpenSubmitModal}
                  className="w-full sm:w-auto"
                >
                  Report a Problem
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  leftIcon={<Search className="w-5 h-5 text-slate-500" />}
                  onClick={() => onOpenTrackModal()}
                  className="w-full sm:w-auto"
                >
                  Track My Complaint
                </Button>
              </div>

              {/* Trust signals */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#64748B] dark:text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No login required for citizens</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <span>Zero public exposure of personal data</span>
                </div>
              </div>
            </div>

            {/* Right Live Cluster Highlight Card */}
            <div className="lg:col-span-5">
              <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-50 to-slate-50 dark:from-[#111827] dark:to-[#151F32] border border-blue-100 dark:border-[#263449] shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      JS
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {featuredIssue ? `Community Issue Cluster ${featuredIssue.id}` : 'Community Issue Intelligence'}
                      </h3>
                      <p className="text-[10px] text-slate-500">Live AI aggregation feed</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {featuredIssue ? `${featuredIssue.priority} Priority` : 'Active'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {featuredIssue ? featuredIssue.title : 'Aggregating community reports in real time'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {featuredIssue
                      ? featuredIssue.summary
                      : 'Submit a civic issue to see localized AI clustering and advisory authority mapping.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block font-medium">Clustered Reports</span>
                    <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                      {featuredIssue ? `${featuredIssue.relatedReportsCount} Citizens` : `${stats.totalReports} Total`}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block font-medium">AI Match Confidence</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {featuredIssue ? `${featuredIssue.aiConfidence}%` : 'Active'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-600/10 dark:bg-blue-900/30 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
                  <span className="truncate max-w-[200px]">
                    Advisory: {featuredIssue?.recommendedAuthority || 'Municipal Civic Authority'}
                  </span>
                  <span className="font-semibold flex items-center gap-1 shrink-0">
                    {featuredIssue?.status || 'Submitted'} <Clock className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMMUNITY STATISTICS */}
      <section id="statistics" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center sm:text-left mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[#172033] dark:text-[#F8FAFC]">
            Live Community Statistics
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Transparency in numbers across municipal wards
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KpiCard
            title="Total Community Reports"
            value={Number(stats.totalReports || 0).toLocaleString()}
            subtitle="Citizen reports filed locally"
            change={stats.growthRates?.totalReports}
            icon={TrendingUp}
            colorScheme="blue"
          />
          <KpiCard
            title="Recurring Community Issues"
            value={stats.recurringIssues}
            subtitle="AI clusters affecting multiple citizens"
            change={stats.growthRates?.recurringIssues}
            icon={Users}
            colorScheme="amber"
          />
          <KpiCard
            title="Issues In Progress"
            value={stats.inProgress}
            subtitle="Currently undergoing civic attention"
            change={stats.growthRates?.inProgress}
            icon={Clock}
            colorScheme="indigo"
          />
          <KpiCard
            title="Reported Resolutions"
            value={stats.reportedResolutions}
            subtitle="Problems reported resolved"
            change={stats.growthRates?.reportedResolutions}
            icon={CheckCircle2}
            colorScheme="emerald"
          />
        </div>
      </section>

      {/* 3. MY REPORTS (Opt-In Saved Local Reports) */}
      <MyReportsSection
        reportsRevision={reportsRevision}
        onReportsChanged={onReportsChanged}
        onOpenSubmitModal={onOpenSubmitModal}
        onOpenTrackModal={onOpenTrackModal}
      />

      {/* 4. COMMUNITY ISSUES (Key Differentiating Feature) */}
      <section id="community-issues" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 mb-1">
              <Cpu className="w-3.5 h-3.5" />
              Aggregated Intelligence
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#172033] dark:text-[#F8FAFC]">
              Community Issues in Your Area
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-2xl mt-1">
              Rather than exposing individual citizens’ complaints, JanSetu AI highlights
              systemic problems affecting multiple households while preserving full privacy.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSubmitModal}
            leftIcon={<PlusCircle className="w-4 h-4 text-blue-600" />}
            className="self-start md:self-end text-xs"
          >
            Add My Report
          </Button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {ISSUE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#164DAA] dark:bg-[#3B82F6] text-white shadow-xs'
                  : 'bg-white dark:bg-[#151F32] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#263449] hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Issues Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-[#263449]"
              />
            ))}
          </div>
        ) : issues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {issues.map((issue) => (
              <CommunityIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <div className="mt-6 p-8 rounded-2xl border border-slate-200 dark:border-[#263449] text-center text-xs text-slate-500 dark:text-slate-400">
            No community issue clusters found for this category yet.
          </div>
        )}
      </section>

      {/* 4. HOW IT WORKS */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
      >
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-[#263449] text-center">
          <div className="max-w-2xl mx-auto space-y-2 mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Civic Technology Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">
              How JanSetu AI Powers Civic Action
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
              A 4-step transparent cycle turning individual citizen concerns into amplified community action.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs relative">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Report a Problem
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Submit details without needing an account. Receive an instant Reference ID and confidential tracking code.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs relative">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                AI Understands the Issue
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Natural language processing categorizes the problem, estimates priority severity, and recommends the relevant local authority.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs relative">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Related Reports Identified
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Similar reports in the same ward are grouped into high-impact community clusters, preventing isolated duplicates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-sm mb-4">
                04
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Progress Is Tracked
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Citizens track real-time resolution stages from acknowledgement through human verification and resolution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#164DAA] to-[#2563EB] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Notice a problem in your street?
            </h3>
            <p className="text-sm text-blue-100 max-w-xl">
              Report it in less than 2 minutes. Help create data-driven civic intelligence that communities and administrators can act on.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              onClick={onOpenSubmitModal}
              className="w-full sm:w-auto bg-white text-blue-800 hover:bg-blue-50 border-transparent font-bold"
            >
              Report a Problem Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
