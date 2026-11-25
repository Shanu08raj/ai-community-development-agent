import { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { VoiceControls } from './VoiceControls';

export const VoiceOutput = ({
  text,
  label = 'Listen',
  language,
  compact = true,
  className = '',
  showControlsInline = false,
}) => {
  const [expanded, setExpanded] = useState(showControlsInline);
  const tts = useTextToSpeech({ initialLanguage: language });

  const isPlaying = tts.status === 'playing' || tts.status === 'paused';
  const isLoading = tts.status === 'loading';

  const handleTrigger = () => {
    if (!expanded) {
      setExpanded(true);
    }
    if (isPlaying) {
      tts.stop();
    } else {
      tts.play(text, language);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={handleTrigger}
        disabled={!text?.trim()}
        aria-label={isPlaying ? `Stop reading: ${label}` : label}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors cursor-pointer disabled:opacity-50 ${
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          isPlaying
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            : 'bg-white dark:bg-[#151F32] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#263449] hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        )}
        <span>{isLoading ? 'Loading Audio...' : isPlaying ? 'Stop Audio' : label}</span>
      </button>

      {expanded && (
        <VoiceControls
          tts={tts}
          text={text}
          compact={compact}
          showLanguagePicker={!language}
        />
      )}
    </div>
  );
};
