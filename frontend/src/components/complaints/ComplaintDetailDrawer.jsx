import React, { useState } from 'react';
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
} from 'lucide-react';

export const ComplaintDetailDrawer = ({
  isOpen,
  onClose,
  complaint,
  onComplaintUpdated,
}) => {
  const { addToast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!complaint) return null;

  const currentStatus = complaint.status;

  const handleStatusChange = (e) => {
    e.preventDefault();
    const newStatus = selectedStatus || currentStatus;

    if (newStatus === currentStatus && !statusNote.trim()) {
      addToast('Please select a new status or enter a supervisory update note.', 'info');
      return;
    }

    setIsUpdating(true);
    setTimeout(() => {
      const result = complaintService.updateComplaintStatus(
        complaint.id,
        newStatus,
        statusNote
      );
      setIsUpdating(false);

      if (result.success) {
        addToast(`Complaint ${complaint.id} status updated to ${newStatus}.`, 'success');
        setStatusNote('');
        if (onComplaintUpdated) {
          onComplaintUpdated(result.complaint);
        }
      } else {
        addToast(result.error || 'Failed to update status', 'error');
      }
    }, 400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Complaint ${complaint.id}`}
      subtitle={`Submitted on ${complaint.submittedDate} • ${complaint.area}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Core details card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#263449] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-[#151F32] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                {complaint.id}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {complaint.submittedDate}
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {complaint.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {complaint.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
              <span className="text-[11px] text-slate-400 block font-medium">Category</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {complaint.category}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
              <span className="text-[11px] text-slate-400 block font-medium">Location</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                {complaint.area}, {complaint.district || 'Pune'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449]">
              <span className="text-[11px] text-slate-400 block font-medium">Language & Citizen</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {complaint.preferredLanguage || 'English'} ({complaint.contactInfo || 'Confidential'})
              </span>
            </div>
          </div>
        </div>

        {/* AI Analysis and Recommended Authority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
              <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              AI Intelligence Classification
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Cluster Confidence:</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                {complaint.aiConfidence || 94}% (Demo AI Model)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Automatically clustered with related ward reports based on natural language similarity and geographical proximity.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Recommended Local Authority
            </div>
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {complaint.recommendedAuthority || 'Local Municipal Ward Division'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Suggestion generated by jurisdiction mapping. Official forwarding requires manual administrator review.
            </div>
          </div>
        </div>

        {/* Admin Action: Update Status */}
        <form onSubmit={handleStatusChange} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Administrative Action & Status Update</span>
            <span className="text-[11px] font-normal text-slate-400">Updates local demo audit trail</span>
          </h4>

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
              <span>Demo changes persist in localStorage and update audit logs.</span>
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
            {complaint.timeline && complaint.timeline.length > 0 ? (
              complaint.timeline.map((ev, i) => (
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
