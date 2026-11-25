import { Loader2, Mic, RotateCcw, ShieldCheck, Square, Trash2, X } from 'lucide-react';
import { Button } from '../common/Button';

function formatSeconds(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AudioRecorder = ({
  isSupported,
  status,
  durationSeconds,
  maxDurationSeconds,
  audioUrl,
  error,
  disabled = false,
  onStart,
  onStop,
  onCancel,
  onDiscard,
}) => {
  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {!isRecording && !isProcessing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isSupported || disabled}
            onClick={onStart}
            leftIcon={<Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            className="min-h-[42px] px-4 font-semibold border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50"
          >
            {audioUrl ? 'Record Again' : 'Speak Your Complaint'}
          </Button>
        )}

        {isRecording && (
          <>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onStop}
              leftIcon={<Square className="w-3.5 h-3.5 fill-current" />}
              className="min-h-[42px] px-4 font-semibold"
            >
              Stop Recording
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              aria-label="Cancel voice recording"
              leftIcon={<X className="w-3.5 h-3.5" />}
              className="min-h-[42px]"
            >
              Cancel
            </Button>

            <div
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              <span>
                Recording {formatSeconds(durationSeconds)} / {formatSeconds(maxDurationSeconds)}
              </span>
            </div>
          </>
        )}

        {isProcessing && (
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-700 dark:text-blue-300"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transcribing speech safely...</span>
            <button
              type="button"
              onClick={onCancel}
              className="ml-1 underline text-[11px] hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Audio replay & discard */}
      {audioUrl && !isRecording && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#263449]">
          <audio
            controls
            src={audioUrl}
            aria-label="Recorded complaint audio playback"
            className="h-8 flex-1 min-w-[200px]"
          />
          <button
            type="button"
            onClick={onStart}
            disabled={isProcessing}
            title="Retry recording"
            aria-label="Retry recording"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={isProcessing}
            title="Discard recording"
            aria-label="Discard recording"
            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isSupported && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          Voice recording is unavailable in this browser. You can type your complaint directly below.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          Audio is processed solely to generate an editable transcript and deleted immediately afterward — nothing is stored or submitted automatically.
        </span>
      </p>
    </div>
  );
};
