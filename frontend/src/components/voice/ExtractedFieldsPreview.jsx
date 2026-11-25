import { AlertTriangle, CheckCircle2, MapPin, Sparkles, X } from 'lucide-react';
import { ISSUE_CATEGORIES } from '../../data/mockData';
import { INDIA_STATES, INDIA_UNION_TERRITORIES, getDistrictsForState } from '../../data/indiaLocations';
import { Button } from '../common/Button';

const ALL_STATES = [...INDIA_STATES, ...INDIA_UNION_TERRITORIES];
const COMPLAINT_CATEGORIES = ISSUE_CATEGORIES.filter((c) => c !== 'All');

export const ExtractedFieldsPreview = ({
  extracted,
  onChangeField,
  onResolveLocation,
  onApplyEmptyOnly,
  onApplyAll,
  onDismiss,
}) => {
  if (!extracted) return null;

  const validDistricts = getDistrictsForState(extracted.state || '');
  const hasConflicts = Array.isArray(extracted.existingFieldConflicts) && extracted.existingFieldConflicts.length > 0;

  return (
    <div
      data-testid="extracted-fields-preview"
      className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/70 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Structured Complaint Preview (Editable Before Applying)
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close extracted fields preview"
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {extracted.warnings?.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
          {extracted.warnings.map((w, idx) => (
            <p key={idx} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </p>
          ))}
        </div>
      )}

      {extracted.ambiguousLocations?.length > 0 && (
        <div className="p-2.5 rounded-lg bg-white dark:bg-[#151F32] border border-amber-300 dark:border-amber-700 space-y-1.5">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Select matching location from speech:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {extracted.ambiguousLocations.map((cand, idx) => (
              <button
                key={`${cand.state}-${cand.district}-${idx}`}
                type="button"
                onClick={() => onResolveLocation(cand.state, cand.district)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer"
              >
                {cand.district ? `${cand.district}, ${cand.state}` : cand.state}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Suggested Title
          </label>
          <input
            type="text"
            aria-label="Extracted title"
            value={extracted.title || ''}
            onChange={(e) => onChangeField('title', e.target.value)}
            placeholder="No title extracted"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Suggested Category
          </label>
          <select
            aria-label="Extracted category"
            value={extracted.category || ''}
            onChange={(e) => onChangeField('category', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100"
          >
            <option value="">-- Not detected --</option>
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Suggested State
          </label>
          <select
            aria-label="Extracted state"
            value={extracted.state || ''}
            onChange={(e) => {
              onChangeField('state', e.target.value);
              onChangeField('district', '');
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100"
          >
            <option value="">-- Not detected --</option>
            {ALL_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Suggested District
          </label>
          <select
            aria-label="Extracted district"
            value={extracted.district || ''}
            disabled={!extracted.state}
            onChange={(e) => onChangeField('district', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 disabled:opacity-50"
          >
            <option value="">-- Select district --</option>
            {validDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Suggested Ward Number
          </label>
          <input
            type="text"
            aria-label="Extracted ward"
            value={extracted.ward || ''}
            onChange={(e) => onChangeField('ward', e.target.value)}
            placeholder="Not spoken"
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Original Transcript (Preserved)
          </label>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0B1120] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#263449] line-clamp-2">
            {extracted.originalTranscript}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
          Suggested Description
        </label>
        <textarea
          rows={2}
          aria-label="Extracted description"
          value={extracted.description || ''}
          onChange={(e) => onChangeField('description', e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100"
        />
      </div>

      {hasConflicts && (
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-200">
          You already typed values in: <strong>{extracted.existingFieldConflicts.join(', ')}</strong>. Choose whether to fill only empty fields or replace them.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {hasConflicts ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={onApplyEmptyOnly}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Fill Empty Fields Only
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onApplyAll}
              className="text-xs"
            >
              Overwrite Existing Fields
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={onApplyAll}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Apply Extracted Fields to Form
          </Button>
        )}
      </div>
    </div>
  );
};
