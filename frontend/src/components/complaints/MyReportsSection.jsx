import { useCallback, useEffect, useState } from 'react';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { CitizenReportDetailModal } from './CitizenReportDetailModal';
import { complaintService } from '../../services/complaintService';
import { myReportsService } from '../../services/myReportsService';
import { useToast } from '../../context/ToastContext';
import {
  AlertCircle,
  Bookmark,
  Calendar,
  Eye,
  FileText,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

export const MyReportsSection = ({
  reportsRevision = 0,
  onReportsChanged,
  onOpenSubmitModal,
  onOpenTrackModal,
}) => {
  const { addToast } = useToast();
  const [savedReports, setSavedReports] = useState(() =>
    myReportsService.getSavedReports()
  );
  const [syncStates, setSyncStates] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const refreshSavedReports = useCallback(async () => {
    const localList = myReportsService.getSavedReports();
    setSavedReports((prev) =>
      prev.length === 0 && localList.length === 0 ? prev : localList
    );

    if (localList.length === 0) {
      setSyncStates((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    setIsRefreshing(true);
    try {
      const results = await Promise.all(
        localList.map(async (item) => {
          if (!item.trackingCode) {
            return {
              referenceId: item.referenceId,
              sync: { needsReverification: true, message: 'Tracking code needed' },
            };
          }
          const res = await complaintService.trackComplaint(
            item.referenceId,
            item.trackingCode
          );
          if (res.success && res.complaint) {
            myReportsService.syncReportFromBackend(
              item.referenceId,
              res.complaint
            );
            return {
              referenceId: item.referenceId,
              sync: { synced: true },
            };
          }
          if (res.status === 404 || res.code === 'INVALID_TRACKING_CREDENTIALS') {
            return {
              referenceId: item.referenceId,
              sync: {
                needsReverification: true,
                message: 'Credentials invalid or report unavailable',
              },
            };
          }
          return {
            referenceId: item.referenceId,
            sync: {
              offline: true,
              message: 'Showing last cached status',
            },
          };
        })
      );

      const nextSyncMap = {};
      for (const entry of results) {
        nextSyncMap[entry.referenceId] = entry.sync;
      }
      setSyncStates(nextSyncMap);
      setSavedReports(myReportsService.getSavedReports());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        refreshSavedReports();
      }
    });
    return () => {
      active = false;
    };
  }, [reportsRevision, refreshSavedReports]);

  const handleOpenDetails = (report) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const handleRemoveReport = (referenceId) => {
    const next = myReportsService.removeReport(referenceId);
    setSavedReports(next);
    setSyncStates((prev) => {
      const copy = { ...prev };
      delete copy[referenceId];
      return copy;
    });
    if (selectedReport?.referenceId === referenceId) {
      setDetailOpen(false);
      setSelectedReport(null);
    }
    if (onReportsChanged) onReportsChanged();
    addToast(`Removed ${referenceId} from My Reports on this device.`, 'info');
  };

  const handleReportSynced = useCallback((referenceId, backendComplaint) => {
    const next = myReportsService.syncReportFromBackend(
      referenceId,
      backendComplaint
    );
    setSavedReports(next);
    setSyncStates((prev) => ({ ...prev, [referenceId]: { synced: true } }));
  }, []);

  const handleTrackingCodeUpdated = useCallback((referenceId, newCode) => {
    const next = myReportsService.updateTrackingCode(referenceId, newCode);
    setSavedReports(next);
    setSelectedReport(
      next.find((r) => r.referenceId === referenceId) || null
    );
  }, []);

  return (
    <section
      id="my-reports"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      aria-labelledby="my-reports-heading"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 mb-1">
            <Bookmark className="w-3.5 h-3.5" />
            Saved on This Device
          </div>
          <div className="flex items-center gap-2.5">
            <h2
              id="my-reports-heading"
              className="text-xl sm:text-2xl font-bold text-[#172033] dark:text-[#F8FAFC]"
            >
              My Reports
            </h2>
            {savedReports.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {savedReports.length}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            Your submitted complaints, all in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
          {savedReports.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSavedReports}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Refresh Statuses
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenTrackModal && onOpenTrackModal()}
            leftIcon={<Search className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Track by ID
          </Button>
        </div>
      </div>

      {savedReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedReports.map((report) => {
            const sync = syncStates[report.referenceId] || {};
            return (
              <div
                key={report.referenceId}
                className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top meta tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0B1120] text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-[#263449]">
                        {report.referenceId}
                      </span>
                      <PriorityBadge priority={report.priority} size="sm" />
                    </div>
                    <StatusBadge status={report.status} size="sm" />
                  </div>

                  {/* Category pill */}
                  <div className="mb-2">
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {report.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {report.title}
                  </h4>

                  {/* Ward and Date info */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-[#263449] space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        Area / Ward:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {report.area}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        Submitted:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {report.submittedDate}
                      </span>
                    </div>
                  </div>

                  {sync.needsReverification && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{sync.message}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetails(report)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    className="text-xs flex-1"
                  >
                    View Details
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleRemoveReport(report.referenceId)}
                    title="Remove from My Reports"
                    aria-label={`Remove ${report.referenceId} from My Reports`}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#151F32] border border-dashed border-slate-300 dark:border-[#263449] flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-start gap-4 text-center sm:text-left">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                No saved reports on this device yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                For your privacy, complaints are never stored locally without permission. After submitting a report, check{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  “Remember this report on this device”
                </strong>{' '}
                to see your saved reports here anytime.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenSubmitModal}
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="text-xs"
            >
              Report a Problem
            </Button>
          </div>
        </div>
      )}

      {/* Authenticated Report Detail Modal */}
      <CitizenReportDetailModal
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onReportSynced={handleReportSynced}
        onTrackingCodeUpdated={handleTrackingCodeUpdated}
        onRemoveReport={handleRemoveReport}
      />
    </section>
  );
};
