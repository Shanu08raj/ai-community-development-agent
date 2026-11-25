import { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { useLanguage } from '../../context/LanguageContext';

export const TranscriptPreview = ({
  transcriptData,
  editedText,
  onEditText,
  onApplyToDescription,
  onAppendToDescription,
  onExtractFields,
  isExtracting = false,
  canRetranscribe = false,
  onRetranscribe,
  onClear,
  onRetry,
}) => {
  const { languages } = useLanguage();
  const [langSelection, setLangSelection] = useState(null);

  if (!transcriptData) return null;

  const detectedFallback =
    transcriptData?.detectedLanguageCode && transcriptData.detectedLanguageCode !== 'und'
      ? transcriptData.detectedLanguageCode
      : 'en';
  const overrideLang =
    langSelection && langSelection.forData === transcriptData
      ? langSelection.code
      : detectedFallback;

  const {
    detectedLanguage,
    detectedLanguageCode,
    languageConfidence,
    transcriptConfidence,
    qualityStatus,
    provider,
    model,
    rtl,
    warnings = [],
    recommendHumanReview,
  } = transcriptData;

  const isLowQuality = qualityStatus === 'low_confidence' || qualityStatus === 'empty';
  const lowLangConfidence =
    detectedLanguageCode === 'und' || (typeof languageConfidence === 'number' && languageConfidence < 65);

  return (
    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-blue-200 dark:border-blue-900/70 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Transcript Preview
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            {detectedLanguage || 'Detected'}
            {typeof languageConfidence === 'number' ? ` (${languageConfidence}%)` : ''}
          </span>
          {typeof transcriptConfidence === 'number' && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isLowQuality
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              Confidence: {transcriptConfidence}%
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400">
          {provider} ({model})
        </span>
      </div>

      {(warnings.length > 0 || recommendHumanReview || lowLangConfidence) && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {warnings[0] ||
              (lowLangConfidence
                ? 'Language detection confidence is low. Please verify or select the exact spoken language and re-transcribe or retry.'
                : 'Please review and edit the transcribed text carefully before applying it.')}
          </span>
        </div>
      )}

      {onRetranscribe && canRetranscribe && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] bg-white dark:bg-[#151F32] p-2 rounded-lg border border-slate-200 dark:border-[#263449]">
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            Wrong detected language?
          </span>
          <select
            value={overrideLang}
            onChange={(e) =>
              setLangSelection({ forData: transcriptData, code: e.target.value })
            }
            aria-label="Correct detected spoken language"
            className="px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100"
          >
            {languages
              .filter((l) => l.sttAvailable)
              .map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.nativeName})
                </option>
              ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onRetranscribe(overrideLang)}
            leftIcon={<RefreshCw className="w-3 h-3" />}
            className="text-[11px] py-1"
          >
            Re-transcribe
          </Button>
        </div>
      )}

      <textarea
        rows={2}
        dir={rtl ? 'rtl' : 'ltr'}
        value={editedText}
        onChange={(e) => onEditText(e.target.value)}
        aria-label="Editable voice transcript preview"
        placeholder="Spoken transcript appears here for you to edit before inserting..."
        className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onExtractFields && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isExtracting}
              disabled={!editedText?.trim()}
              onClick={onExtractFields}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Extract & Fill Fields
            </Button>
          )}
          <Button
            type="button"
            variant={onExtractFields ? 'outline' : 'primary'}
            size="sm"
            disabled={!editedText?.trim()}
            onClick={onApplyToDescription}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Use in Description
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!editedText?.trim()}
            onClick={onAppendToDescription}
            className="text-xs"
          >
            Append Text
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Retry
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            className="text-xs text-rose-600 dark:text-rose-400"
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
};
