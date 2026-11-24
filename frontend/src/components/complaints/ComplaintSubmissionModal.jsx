import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { complaintService } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';
import {
  UploadCloud,
  CheckCircle2,
  Copy,
  AlertCircle,
  Info,
  ShieldAlert,
} from 'lucide-react';

const CATEGORIES = [
  'Water Supply',
  'Roads and Infrastructure',
  'Waste Management',
  'Drainage and Sanitation',
  'Streetlights',
  'Other',
];

export const ComplaintSubmissionModal = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Water Supply',
    state: 'Maharashtra',
    district: 'Pune',
    area: '',
    preferredLanguage: 'English',
    contactInfo: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Water Supply',
      state: 'Maharashtra',
      district: 'Pune',
      area: '',
      preferredLanguage: 'English',
      contactInfo: '',
    });
    setSelectedFile(null);
    setErrors({});
    setSubmittedData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Please provide a clear title for the issue.';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters.';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe the problem in detail.';
    } else if (formData.description.trim().length < 15) {
      newErrors.description = 'Description must be at least 15 characters so AI can analyze it properly.';
    }

    if (!formData.area.trim()) {
      newErrors.area = 'Please specify your area, ward, or neighborhood.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const result = complaintService.submitComplaint(formData);
      setIsSubmitting(false);
      setSubmittedData(result);
      addToast('Community report logged successfully in demo session!', 'success');
    }, 600);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard!`, 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={submittedData ? 'Report Submitted Successfully' : 'Report a Community Problem'}
      subtitle={
        submittedData
          ? 'Save your tracking credentials to check community progress.'
          : 'AI will analyze your report and cluster it with similar neighborhood issues.'
      }
      maxWidth="max-w-2xl"
    >
      {submittedData ? (
        /* SUCCESS SCREEN */
        <div className="space-y-6 py-2">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Complaint Registered Locally (Demo Mode)
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                Your report has been saved to your browser demo storage and queued for AI clustering. No public account is needed to track its progress.
              </p>
            </div>
          </div>

          {/* Credentials Display */}
          <div className="bg-slate-50 dark:bg-[#0B1120] rounded-xl p-5 border border-slate-200 dark:border-[#263449] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-[#151F32] rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Complaint Reference ID
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                  {submittedData.referenceId}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => copyToClipboard(submittedData.referenceId, 'Reference ID')}
              >
                Copy ID
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-[#151F32] rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Private Secret Tracking Code
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {submittedData.trackingCode}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Keep this confidential; required for status tracking.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => copyToClipboard(submittedData.trackingCode, 'Tracking Code')}
              >
                Copy Code
              </Button>
            </div>
          </div>

          {/* Civic Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Demo Disclaimer:</strong> JanSetu AI is an independent community intelligence system. This complaint is not officially forwarded to a government department.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#263449]">
            <Button variant="secondary" onClick={handleClose}>
              Done
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (onSuccess) onSuccess(submittedData);
              }}
            >
              Track This Complaint Now
            </Button>
          </div>
        </div>
      ) : (
        /* FORM SCREEN */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Complaint Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Broken water pipeline leaking near Block C market"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.title
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-300 dark:border-[#263449]'
              }`}
            />
            {errors.title && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
              </p>
            )}
          </div>

          {/* Category & Ward */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Area / Ward / Neighborhood <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g. Ward 12, Subhash Marg"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.area
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-300 dark:border-[#263449]'
                }`}
              />
              {errors.area && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.area}
                </p>
              )}
            </div>
          </div>

          {/* State & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                District / City
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue, how long it has persisted, and how it impacts neighbors..."
              className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-300 dark:border-[#263449]'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.description}
              </p>
            )}
          </div>

          {/* Optional Contact & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Preferred Language
              </label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="English">English</option>
                <option value="Hindi">हिन्दी (Hindi)</option>
                <option value="Marathi">मराठी (Marathi)</option>
                <option value="Tamil">தமிழ் (Tamil)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Contact Info <span className="text-slate-400 font-normal">(Optional demo contact)</span>
              </label>
              <input
                type="text"
                value={formData.contactInfo}
                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                placeholder="Phone or email (kept private)"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Optional Image Upload UI */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Attach Photo <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-[#263449] rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0].name);
                  }
                }}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {selectedFile ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Attached: {selectedFile}
                    </span>
                  ) : (
                    'Click to upload or drag & drop photo'
                  )}
                </span>
                <span className="text-[11px] text-slate-400">
                  PNG, JPG up to 10MB (Sample image attachment)
                </span>
              </label>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <span>
              Your identity remains private. Only aggregated neighborhood issue details and general ward locations are made visible to the community.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#263449]">
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Complaint
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
