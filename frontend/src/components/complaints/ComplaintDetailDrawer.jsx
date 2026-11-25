import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { COMPLAINT_STATUSES } from '../../data/mockData';
import { complaintService } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  MapPin,
  Building2,
  Cpu,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  PhoneCall,
} from 'lucide-react';

export const ComplaintDetailDrawer = ({
  isOpen,
  onClose,
  complaint,
  onComplaintUpdated,
}) => {
  const { addToast } = useToast();
  const [fetchedRecord, setFetchedRecord] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    if (!isOpen || !complaint?.id) return;

    let active = true;
    complaintService
      .getComplaintDetail(complaint.id)
      .then((fullData) => {
        if (active && fullData) {
          setFetchedRecord({ id: complaint.id, data: fullData });
        }
      })
      .catch(() => {
        // Keep base row object if detail call encounters temporary error
      });

    return () => {
      active = false;
    };
  }, [isOpen, complaint?.id]);

  const detail =
    fetchedRecord && fetchedRecord.id === complaint?.id
      ? fetchedRecord.data
      : complaint;

  const handleClose = () => {
    setSelectedStatus('');
    setStatusNote('');
    setUpdateError('');
    setFetchedRecord(null);
    onClose();
  };

  if (!isOpen || !detail) return null;

  const currentStatus = detail.status;
  const aiInfo = detail.aiAnalysis || {};

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (isUpdating) return;
    setUpdateError('');

    const newStatus = selectedStatus || currentStatus;
    if (newStatus === currentStatus && !statusNote.trim()) {
      addToast('Please select a new status or enter a supervisory update note.', 'info');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await complaintService.updateComplaintStatus(
        detail.id,
        newStatus,
        statusNote
      );

      if (result.success) {
        addToast(`Complaint ${detail.id} status updated to ${newStatus}.`, 'success');
        setStatusNote('');
        setSelectedStatus('');
        if (result.complaint) {
          setFetchedRecord({ id: detail.id, data: result.complaint });
        }
        if (onComplaintUpdated) {
          onComplaintUpdated(result.complaint || detail);
        }
      } else {
        setUpdateError(result.error || 'Failed to update status.');
        addToast(result.error || 'Failed to update status.', 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Complaint ${detail.id}`}
      subtitle={`Submitted on ${detail.submittedDate} • ${detail.area}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Core details card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#263449] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-[#151F32] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                {detail.id}
              </span>
              <StatusBadge status={detail.status} />
              <PriorityBadge priority={detail.priority} />
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {detail.submittedDate}
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {detail.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {detail.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
              <span className="text-[11px] text-slate-400 block font-medium">Category</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {detail.category}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
              <span className="text-[11px] text-slate-400 block font-medium">Location</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                {detail.area}, {detail.district || 'Pune'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
              <span className="text-[11px] text-slate-400 block font-medium">Language Detected</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {aiInfo.detectedLanguage || detail.preferredLanguage || 'English'}
                {aiInfo.detectedLanguageCode ? ` (${aiInfo.detectedLanguageCode})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Out-of-Scope / Emergency Advisory Notice */}
        {aiInfo.isOutOfScope && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
            <PhoneCall className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Out-of-Scope Advisory Flag</p>
              <p>{aiInfo.outOfScopeReason}</p>
              {aiInfo.emergencyGuidance && <p className="font-semibold">{aiInfo.emergencyGuidance}</p>}
            </div>
          </div>
        )}

        {/* AI Analysis and Recommended Authority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                AI Intelligence Advisory
              </span>
              {aiInfo.engineUsed && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/60 text-blue-700 dark:text-blue-300">
                  {aiInfo.engineUsed}
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Confidence Score:</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                {aiInfo.confidence ?? detail.aiConfidence ?? 0}%
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
              {aiInfo.priorityReason || 'Advisory classification generated for human triage.'}
            </div>
            {aiInfo.clusterReason && (
              <div className="text-[11px] text-blue-700 dark:text-blue-300 pt-1 border-t border-blue-200/50 dark:border-blue-900/40">
                Cluster: {aiInfo.clusterReason}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Recommended Local Authority
            </div>
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {aiInfo.recommendedAuthority || detail.recommendedAuthority || 'Pending Manual Assignment'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Advisory suggestion only. Official forwarding or resolution requires explicit human administrator approval.
            </div>
          </div>
        </div>

        {/* Admin Action: Update Status */}
        <form onSubmit={handleStatusChange} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Administrative Action & Status Update</span>
            <span className="text-[11px] font-normal text-slate-400">Persists & records AuditLog</span>
          </h4>

          {updateError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Change Resolution Status
              </label>
              <select
                value={selectedStatus || currentStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {COMPLAINT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st} {st === currentStatus ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supervisory Note / Action Log
              </label>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Field inspection ordered; contractor dispatched"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Human-approved transitions update MongoDB and create an AuditLog.</span>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isUpdating}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Update Status
            </Button>
          </div>
        </form>

        {/* Timeline Log */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Audit & Status Timeline History
          </h4>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {detail.timeline && detail.timeline.length > 0 ? (
              detail.timeline.map((ev, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-[#151F32] flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {ev.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{ev.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {ev.note}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No timeline entries yet.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
