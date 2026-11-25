import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { VoiceOutput } from '../voice/VoiceOutput';
import { useLanguage } from '../../context/LanguageContext';
import { buildReportDetailSpeechText } from '../../data/voiceGuides';
import { complaintService } from '../../services/complaintService';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  KeyRound,
  Loader2,
  MapPin,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const CitizenReportDetailModal = ({
  isOpen,
  onClose,
  report,
  onReportSynced,
  onTrackingCodeUpdated,
  onRemoveReport,
}) => {
  const { selectedLanguage } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [manualCode, setManualCode] = useState('');

  const fetchAuthenticatedDetails = useCallback(
    async (refId, codeToUse) => {
      if (!refId) return;

      if (!codeToUse) {
        setDetail(null);
        setErrorState({
          needsCredential: true,
          message:
            'Private tracking code is not stored locally for this report. Enter your tracking code to authenticate and load details.',
        });
        return;
      }

      setIsLoading(true);
      setErrorState(null);
      try {
        const res = await complaintService.trackComplaint(refId, codeToUse);
        if (res.success && res.complaint) {
          setDetail(res.complaint);
          if (onReportSynced) {
            onReportSynced(refId, res.complaint);
          }
          if (manualCode && onTrackingCodeUpdated) {
            onTrackingCodeUpdated(refId, codeToUse);
            setManualCode('');
          }
        } else {
          setDetail(null);
          const isCredentialFailure =
            res.status === 404 ||
            res.status === 422 ||
            res.code === 'INVALID_TRACKING_CREDENTIALS';
          setErrorState({
            needsCredential: isCredentialFailure,
            message:
              res.error ||
              'Unable to authenticate report details with the provided tracking credentials.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [manualCode, onReportSynced, onTrackingCodeUpdated]
  );

  useEffect(() => {
    if (!isOpen || !report?.referenceId) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        fetchAuthenticatedDetails(report.referenceId, report.trackingCode);
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, report?.referenceId, report?.trackingCode, fetchAuthenticatedDetails]);

  const handleClose = () => {
    setDetail(null);
    setErrorState(null);
    setManualCode('');
    onClose();
  };

  const handleManualVerify = (e) => {
    e.preventDefault();
    const cleaned = manualCode.trim().toUpperCase();
    if (!cleaned || !report?.referenceId) return;
    fetchAuthenticatedDetails(report.referenceId, cleaned);
  };

  const handleRemove = () => {
    if (report?.referenceId && onRemoveReport) {
      onRemoveReport(report.referenceId);
    }
    handleClose();
  };

  if (!isOpen || !report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Report ${report.referenceId}`}
      subtitle="Verified citizen report status, AI advisory details, and resolution timeline."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            <span>Retrieving latest complaint details securely from backend...</span>
          </div>
        )}

        {!isLoading && errorState && (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  {errorState.needsCredential
                    ? 'Tracking Credential Verification Required'
                    : 'Unable to Load Report Details'}
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  {errorState.message}
                </p>
              </div>
            </div>

            {errorState.needsCredential ? (
              <form onSubmit={handleManualVerify} className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Enter Private Tracking Code (e.g. TRACK-XXXXXX)"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="sm">
                    Verify &amp; Load
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() =>
                  fetchAuthenticatedDetails(report.referenceId, report.trackingCode)
                }
              >
                Retry Lookup
              </Button>
            )}
          </div>
        )}

        {!isLoading && detail && (
          <div className="space-y-5 animate-in fade-in">
            {detail.aiAnalysis?.emergencyGuidance && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200">
                <PhoneCall className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Emergency Notice (Dial 112)</p>
                  <p className="mt-0.5">{detail.aiAnalysis.emergencyGuidance}</p>
                </div>
              </div>
            )}

            {/* Primary Summary Card */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#263449] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-[#263449] pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-white dark:bg-[#151F32] border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300">
                    {detail.referenceId || detail.id}
                  </span>
                  <StatusBadge status={detail.status} />
                  <PriorityBadge priority={detail.priority} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Submitted: {detail.submittedDate}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {detail.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line">
                  {detail.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
                  <span className="text-[11px] text-slate-400 block font-medium">Category</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {detail.category}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
                  <span className="text-[11px] text-slate-400 block font-medium">Area / Ward</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{detail.area}</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
                  <span className="text-[11px] text-slate-400 block font-medium">District &amp; State</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {[detail.district, detail.state].filter(Boolean).join(', ')}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
                  <span className="text-[11px] text-slate-400 block font-medium">Detected Language</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      {detail.aiAnalysis?.detectedLanguage || detail.preferredLanguage || 'English'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* AI Advisory Recommended Authority */}
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Recommended Authority</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <Sparkles className="w-3 h-3" />
                  AI Advisory
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                {detail.recommendedAuthority || 'Pending Manual Assignment'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  This recommendation is an AI advisory only. JanSetu AI is an independent civic platform and official verification or forwarding requires human administrator review.
                </span>
              </p>
            </div>

            <VoiceOutput
              label="Listen to Complaint Details"
              language={selectedLanguage || detail.aiAnalysis?.detectedLanguageCode || detail.preferredLanguage}
              compact
              text={buildReportDetailSpeechText(
                {
                  id: detail.referenceId || detail.id,
                  title: detail.title,
                  status: detail.status,
                  priority: detail.priority,
                  area: detail.area,
                  district: detail.district,
                  state: detail.state,
                  description: detail.description,
                  recommendedAuthority: detail.recommendedAuthority,
                  latestStatus: detail.timeline?.length
                    ? detail.timeline[detail.timeline.length - 1].status
                    : '',
                  latestNote: detail.timeline?.length
                    ? detail.timeline[detail.timeline.length - 1].note
                    : '',
                },
                selectedLanguage || detail.aiAnalysis?.detectedLanguageCode || detail.preferredLanguage
              )}
            />

            {/* Lifecycle Timeline */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Status &amp; Progress Timeline
              </h4>

              <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {detail.timeline && detail.timeline.length > 0 ? (
                  detail.timeline.map((event, idx) => {
                    const isLast = idx === detail.timeline.length - 1;
                    return (
                      <div key={idx} className="relative">
                        <div
                          className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isLast
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-emerald-500 border-emerald-500 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                              {event.status}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {event.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {event.note}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No timeline entries yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#263449]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 w-full sm:w-auto"
          >
            Remove from My Reports
          </Button>
          <Button variant="secondary" size="sm" onClick={handleClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
