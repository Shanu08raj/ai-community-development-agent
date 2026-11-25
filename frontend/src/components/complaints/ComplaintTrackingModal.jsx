import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { VoiceOutput } from '../voice/VoiceOutput';
import { useLanguage } from '../../context/LanguageContext';
import { buildTrackingSpeechText } from '../../data/voiceGuides';
import { complaintService } from '../../services/complaintService';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  Building2,
  PhoneCall,
} from 'lucide-react';

export const ComplaintTrackingModal = ({ isOpen, onClose, initialData = null }) => {
  const { selectedLanguage } = useLanguage();
  const [referenceId, setReferenceId] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleLookup = useCallback(async (ref = referenceId, code = trackingCode) => {
    setError('');
    setIsSearching(true);
    try {
      const response = await complaintService.trackComplaint(ref, code);
      if (response.success) {
        setResult(response.complaint);
      } else {
        setResult(null);
        setError(response.error);
      }
    } finally {
      setIsSearching(false);
    }
  }, [referenceId, trackingCode]);

  useEffect(() => {
    if (initialData?.referenceId || initialData?.trackingCode) {
      const ref = initialData.referenceId || '';
      const code = initialData.trackingCode || '';
      const timer = setTimeout(() => {
        setReferenceId(ref);
        setTrackingCode(code);
        if (ref && code) {
          handleLookup(ref, code);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [initialData, handleLookup]);

  const handleClose = () => {
    setReferenceId('');
    setTrackingCode('');
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Track Complaint Status"
      subtitle="Enter both your Reference ID and confidential Tracking Code to inspect live progress."
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Input box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#263449]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Complaint Reference ID
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. JS-2026-8901"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-800 dark:text-slate-100 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Private Tracking Code
              </label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="e.g. TRACK-XXXXXX"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-800 dark:text-slate-100 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Dual-credential verification protects citizen privacy.
            </span>

            <Button
              variant="primary"
              size="sm"
              isLoading={isSearching}
              leftIcon={<Search className="w-4 h-4" />}
              onClick={() => handleLookup()}
            >
              Lookup Progress
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  Tracking Error
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                  {error}
                </p>
              </div>
            </div>
            <VoiceOutput label="Listen to Error" language={selectedLanguage} text={error} compact />
          </div>
        )}

        {/* Results section */}
        {result && (
          <div className="space-y-6 animate-in fade-in">
            {result.aiAnalysis?.emergencyGuidance && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200">
                <PhoneCall className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Emergency Notice</p>
                  <p className="mt-0.5">{result.aiAnalysis.emergencyGuidance}</p>
                </div>
              </div>
            )}

            {/* Header summary card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-[#263449] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {result.id}
                  </span>
                  <StatusBadge status={result.status} />
                  <PriorityBadge priority={result.priority} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Submitted: {result.submittedDate}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {result.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {result.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-[#263449]">
                  <span className="text-[11px] text-slate-400 block font-medium">Category</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {result.category}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-[#263449]">
                  <span className="text-[11px] text-slate-400 block font-medium">Area / Ward</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    {result.area}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-[#263449]">
                  <span className="text-[11px] text-slate-400 block font-medium">Recommended Authority</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    {result.recommendedAuthority || 'Pending Review'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-[#263449]">
                <VoiceOutput
                  label="Listen to Tracking Updates"
                  language={selectedLanguage || result.aiAnalysis?.detectedLanguageCode || result.preferredLanguage}
                  compact
                  text={buildTrackingSpeechText(
                    {
                      id: result.id,
                      title: result.title,
                      status: result.status,
                      priority: result.priority,
                      area: result.area,
                      recommendedAuthority: result.recommendedAuthority,
                      latestStatus: result.timeline?.length ? result.timeline[result.timeline.length - 1].status : '',
                      latestNote: result.timeline?.length ? result.timeline[result.timeline.length - 1].note : '',
                    },
                    selectedLanguage || result.aiAnalysis?.detectedLanguageCode || result.preferredLanguage
                  )}
                />
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Resolution Lifecycle Timeline
              </h4>

              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {result.timeline && result.timeline.length > 0 ? (
                  result.timeline.map((event, idx) => {
                    const isLast = idx === result.timeline.length - 1;
                    return (
                      <div key={idx} className="relative group">
                        <div
                          className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
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
      </div>
    </Modal>
  );
};
