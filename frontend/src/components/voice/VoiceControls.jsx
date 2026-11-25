import { AlertCircle, Loader2, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const SPEED_OPTIONS = [
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1x' },
  { value: 1.25, label: '1.25x' },
];

export const VoiceControls = ({
  tts,
  text,
  compact = false,
  showLanguagePicker = true,
}) => {
  const { languages } = useLanguage();
  const {
    languageCode,
    languageMeta,
    setLanguageCode,
    voiceId,
    setVoiceId,
    validPiperVoices = [],
    voiceAvailability,
    speed,
    setSpeed,
    status,
    activeProvider,
    notice,
    error,
    play,
    replay,
    pause,
    resume,
    stop,
  } = tts;

  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const isLoading = status === 'loading';

  return (
    <div
      className={`rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#263449] ${
        compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-2.5'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {!isPlaying && !isPaused ? (
            <button
              type="button"
              onClick={() => play(text)}
              disabled={isLoading || !text?.trim()}
              aria-label="Play spoken audio"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#164DAA] hover:bg-[#123D88] text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? 'Generating...' : 'Play'}</span>
            </button>
          ) : (
            <>
              {isPlaying ? (
                <button
                  type="button"
                  onClick={pause}
                  aria-label="Pause spoken audio"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resume}
                  aria-label="Resume spoken audio"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={stop}
                aria-label="Stop spoken audio"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => replay(text)}
            disabled={isLoading || !text?.trim()}
            aria-label="Replay spoken audio"
            title="Replay audio from start"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>

          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            {activeProvider || voiceAvailability?.label || languageMeta?.name}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showLanguagePicker && (
            <select
              value={languageCode}
              onChange={(e) => {
                setLanguageCode(e.target.value);
                setVoiceId('');
              }}
              aria-label="Playback language"
              className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          )}

          {validPiperVoices.length > 1 && (
            <select
              value={voiceId || validPiperVoices[0]?.id || ''}
              onChange={(e) => setVoiceId(e.target.value)}
              aria-label="Voice selection"
              className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {validPiperVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Playback speed"
            className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SPEED_OPTIONS.map((sp) => (
              <option key={sp.value} value={sp.value}>
                {sp.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">{notice}</p>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
