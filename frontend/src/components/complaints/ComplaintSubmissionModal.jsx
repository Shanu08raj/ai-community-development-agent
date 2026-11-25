import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SearchableSelect } from '../common/SearchableSelect';
import { INDIA_LOCATIONS, getDistrictsForState } from '../../data/indiaLocations';
import { complaintService } from '../../services/complaintService';
import { myReportsService } from '../../services/myReportsService';
import { downloadComplaintReceipt } from '../../utils/receiptGenerator';
import { useToast } from '../../context/ToastContext';
import {
  UploadCloud,
  CheckCircle2,
  Copy,
  AlertCircle,
  Info,
  ShieldAlert,
  PhoneCall,
  Download,
  BookmarkCheck,
} from 'lucide-react';

const CATEGORIES = [
  'Water Supply',
  'Roads and Infrastructure',
  'Waste Management',
  'Drainage and Sanitation',
  'Streetlights',
  'Other',
];

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'हिन्दी (Hindi)' },
  { value: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'Tamil', label: 'தமிழ் (Tamil)' },
  { value: 'Telugu', label: 'తెలుగు (Telugu)' },
  { value: 'Marathi', label: 'मराठी (Marathi)' },
  { value: 'Assamese', label: 'অসমীয়া (Assamese)' },
  { value: 'Manipuri (Meitei)', label: 'মৈতৈলোন্ (Manipuri / Meitei)' },
];

const STATE_OPTIONS = INDIA_LOCATIONS.map((loc) => ({
  value: loc.name,
  label: loc.name,
  meta: loc.type === 'Union Territory' ? 'UT' : 'State',
}));

export const ComplaintSubmissionModal = ({
  isOpen,
  onClose,
  onSuccess,
  onReportsChanged,
}) => {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Water Supply',
    state: '',
    district: '',
    area: '',
    preferredLanguage: 'English',
    contactInfo: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [rememberOnDevice, setRememberOnDevice] = useState(true);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Water Supply',
      state: '',
      district: '',
      area: '',
      preferredLanguage: 'English',
      contactInfo: '',
    });
    setSelectedFile(null);
    setErrors({});
    setSubmitError('');
    setSubmittedData(null);
    setRememberOnDevice(true);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !validate()) return;

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const result = await complaintService.submitComplaint(formData);
      const snapshot = {
        title: result.complaint?.title || formData.title.trim(),
        category: result.complaint?.category || formData.category,
        area: result.complaint?.area || formData.area.trim(),
        state: result.complaint?.state || formData.state.trim() || 'Maharashtra',
        district: result.complaint?.district || formData.district.trim() || 'Pune',
        submittedDate:
          result.complaint?.submittedDate || new Date().toISOString().split('T')[0],
        status: result.complaint?.status || 'Submitted',
        priority:
          result.complaint?.priority ||
          result.aiAnalysis?.detectedPriority ||
          'Medium',
      };

      // Automatically save locally by default after confirmed backend 201 creation
      setRememberOnDevice(true);
      if (result.referenceId && result.trackingCode) {
        myReportsService.saveReport({
          referenceId: result.referenceId,
          trackingCode: result.trackingCode,
          ...snapshot,
        });
        if (onReportsChanged) {
          onReportsChanged();
        }
      }

      setSubmittedData({
        ...result,
        snapshot,
      });
      addToast('Community report submitted and queued for review!', 'success');
    } catch (err) {
      const msg = err.message || 'Unable to submit complaint. Please verify inputs and try again.';
      setSubmitError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard!`, 'info');
  };

  const handleToggleRemember = (checked) => {
    if (!submittedData?.referenceId || !submittedData?.trackingCode) return;

    setRememberOnDevice(checked);
    if (checked) {
      myReportsService.saveReport({
        referenceId: submittedData.referenceId,
        trackingCode: submittedData.trackingCode,
        ...submittedData.snapshot,
      });
      addToast('Saved report locally to My Reports on this device.', 'success');
    } else {
      myReportsService.removeReport(submittedData.referenceId);
      addToast('Removed saved report credentials from this device.', 'info');
    }

    if (onReportsChanged) {
      onReportsChanged();
    }
  };

  const handleDownloadReceipt = () => {
    if (!submittedData?.referenceId || !submittedData?.trackingCode) return;
    const { filename } = downloadComplaintReceipt({
      referenceId: submittedData.referenceId,
      trackingCode: submittedData.trackingCode,
      ...submittedData.snapshot,
    });
    addToast(`Downloaded confidential receipt (${filename}).`, 'success');
  };

  const districtOptions = getDistrictsForState(formData.state);

  const handleStateChange = (nextState) => {
    setFormData((prev) => ({
      ...prev,
      state: nextState,
      district: '',
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={submittedData ? 'Report Submitted Successfully' : 'Report a Community Problem'}
      subtitle={
        submittedData
          ? 'Save your tracking credentials now. The secret tracking code is shown only once.'
          : 'AI will analyze your report and suggest relevant clustering and local authorities for human review.'
      }
      maxWidth="max-w-2xl"
    >
      {submittedData ? (
        /* SUCCESS SCREEN */
        <div className="space-y-5 py-2">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Complaint Registered
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                {submittedData.message ||
                  'Your report has been persisted and analyzed for civic clustering. No account is needed to track its progress.'}
              </p>
            </div>
          </div>

          {submittedData.aiAnalysis?.emergencyGuidance && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200">
              <PhoneCall className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Emergency Guidance (Dial 112)</p>
                <p>{submittedData.aiAnalysis.emergencyGuidance}</p>
              </div>
            </div>
          )}

          {submittedData.aiAnalysis?.isOutOfScope && !submittedData.aiAnalysis?.emergencyGuidance && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Scope Notice:</strong> {submittedData.aiAnalysis.outOfScopeReason}
              </span>
            </div>
          )}

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
                Copy Reference ID
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
                  Treat as a confidential bearer secret — it cannot be recovered from the server later.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => copyToClipboard(submittedData.trackingCode, 'Tracking Code')}
              >
                Copy Tracking Code
              </Button>
            </div>

            {/* Download Receipt CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Download an offline receipt containing both credentials and confidentiality warnings.
              </p>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadReceipt}
                className="shrink-0"
              >
                Download Receipt
              </Button>
            </div>
          </div>

          {/* Explicit Opt-In Device Memory Toggle */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberOnDevice}
                onChange={(e) => handleToggleRemember(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  Remember this report on this device
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Saves your Reference ID and Private Tracking Code locally in browser storage so this complaint appears in <strong>My Reports</strong> across page refreshes and browser restarts. Uncheck if you do not want to save this report locally.
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Security Notice:</strong> Local browser storage is not encrypted and may be accessible to other users or scripts in this browser. Saving credentials on shared or public devices is <strong>not recommended</strong> — uncheck this option before finishing.
                </p>
              </div>
            </label>
          </div>

          {/* Civic Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Advisory Disclaimer:</strong> JanSetu AI is an independent community intelligence system. This submission is not automatically forwarded to a government portal without human administrator verification.
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
                const payload = submittedData;
                resetForm();
                if (onSuccess && payload) onSuccess(payload);
              }}
            >
              Track This Complaint Now
            </Button>
          </div>
        </div>
      ) : (
        /* FORM SCREEN */
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

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
                Area / Ward <span className="text-rose-500">*</span>
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
            <SearchableSelect
              id="complaint-state"
              label="State"
              value={formData.state}
              onChange={handleStateChange}
              options={STATE_OPTIONS}
              placeholder="Select State or Union Territory"
              searchPlaceholder="Search state or union territory..."
              emptyMessage="No matching state or UT found."
            />
            <SearchableSelect
              id="complaint-district"
              label="District / City"
              value={formData.district}
              onChange={(nextDistrict) =>
                setFormData((prev) => ({ ...prev, district: nextDistrict }))
              }
              options={districtOptions}
              disabled={!formData.state}
              placeholder={
                formData.state
                  ? 'Select District / City'
                  : 'Select a State / UT first'
              }
              searchPlaceholder="Search district or city..."
              emptyMessage="No matching district found."
            />
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
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Contact Info <span className="text-slate-400 font-normal">(Optional private contact)</span>
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
                  PNG, JPG up to 10MB (Optional preview attachment)
                </span>
              </label>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <span>
              Your identity remains private. Only aggregated neighborhood issue details and general ward locations are visible to the public community.
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
