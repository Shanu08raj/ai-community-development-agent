import { useState } from 'react';
import { Globe, Info } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { AudioRecorder } from './AudioRecorder';
import { TranscriptPreview } from './TranscriptPreview';

export const VoiceInput = ({
  selectedLanguage,
  onLanguageChange,
  onTranscriptConfirmed,
  onExtractFields,
  isExtracting = false,
  onInsertTranscript,
  onAppendTranscript,
  onClearTranscript,
}) => {
  const { languages, getLanguageMeta } = useLanguage();
  const [localSpeechLang, setLocalSpeechLang] = useState('auto');
  const [editedText, setEditedText] = useState('');

  const speechLang = selectedLanguage !== undefined ? selectedLanguage : localSpeechLang;

  const recognition = useSpeechRecognition({
    language: speechLang,
    onTranscriptReady: (res) => {
      setEditedText(res?.transcript || '');
      if (onTranscriptConfirmed) {
        onTranscriptConfirmed(res);
      }
    },
  });

  const activeLangMeta = speechLang !== 'auto' ? getLanguageMeta(speechLang) : null;
  const sttUnsupportedLocally = activeLangMeta && !activeLangMeta.sttAvailable;

  return (
    <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
            Voice Complaint Input (Optional)
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Speak in your preferred language, review the transcript, and edit before submitting.
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <select
            value={speechLang}
            onChange={(e) => {
              const val = e.target.value;
              setLocalSpeechLang(val);
              if (onLanguageChange) onLanguageChange(val);
            }}
            aria-label="Speech recognition language"
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[220px]"
          >
            <option value="auto">Auto-Detect Spoken Language</option>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.nativeName})
                {!lang.sttAvailable ? ' — Typing / Cloud' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sttUnsupportedLocally && (
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{activeLangMeta.limitations}</span>
        </div>
      )}

      <AudioRecorder
        isSupported={recognition.isSupported}
        status={recognition.status}
        durationSeconds={recognition.durationSeconds}
        maxDurationSeconds={recognition.maxDurationSeconds}
        audioUrl={recognition.audioUrl}
        error={recognition.error}
        disabled={Boolean(sttUnsupportedLocally)}
        onStart={recognition.startRecording}
        onStop={recognition.stopRecording}
        onCancel={recognition.cancelRecording}
        onDiscard={recognition.clearTranscript}
      />

      <TranscriptPreview
        transcriptData={recognition.transcriptData}
        editedText={editedText}
        onEditText={setEditedText}
        isExtracting={isExtracting}
        canRetranscribe={recognition.canRetranscribe}
        onRetranscribe={(nextCode) => {
          if (onLanguageChange) onLanguageChange(nextCode);
          else setLocalSpeechLang(nextCode);
          recognition.retranscribeWithLanguage(nextCode);
        }}
        onExtractFields={
          onExtractFields
            ? () => onExtractFields(editedText, recognition.transcriptData)
            : undefined
        }
        onApplyToDescription={() => {
          if (onInsertTranscript) {
            onInsertTranscript(editedText, recognition.transcriptData);
          }
        }}
        onAppendToDescription={() => {
          if (onAppendTranscript) {
            onAppendTranscript(editedText, recognition.transcriptData);
          }
        }}
        onRetry={() => {
          recognition.clearTranscript();
          setEditedText('');
          recognition.startRecording();
        }}
        onClear={() => {
          recognition.clearTranscript();
          setEditedText('');
          if (onClearTranscript) onClearTranscript();
        }}
      />
    </div>
  );
};
