import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { VoiceInput } from '../components/voice/VoiceInput';
import { VoiceOutput } from '../components/voice/VoiceOutput';
import { ComplaintSubmissionModal } from '../components/complaints/ComplaintSubmissionModal';
import { ToastProvider } from '../context/ToastContext';
import { DEFAULT_VOICE_LANGUAGES } from '../data/voiceLanguages';
import { getVoiceGuideText } from '../data/voiceGuides';

function renderWithProviders(ui) {
  return render(
    <LanguageProvider>
      <ToastProvider>{ui}</ToastProvider>
    </LanguageProvider>
  );
}

describe('Multilingual Voice Capability Registry', () => {
  it('includes English plus all 22 Eighth Schedule languages with honest capability flags and RTL support', () => {
    expect(DEFAULT_VOICE_LANGUAGES).toHaveLength(23);
    const eightScheduleCount = DEFAULT_VOICE_LANGUAGES.filter((l) => l.scheduledEighth).length;
    expect(eightScheduleCount).toBe(22);

    const urdu = DEFAULT_VOICE_LANGUAGES.find((l) => l.code === 'ur');
    expect(urdu?.rtl).toBe(true);

    const manipuri = DEFAULT_VOICE_LANGUAGES.find((l) => l.code === 'mni');
    expect(manipuri?.sttAvailable).toBe(false);
    expect(manipuri?.limitations).toMatch(/Manipuri/i);
  });
});

describe('VoiceInput (Speech-to-Text) workflows', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete navigator.mediaDevices;
    delete globalThis.MediaRecorder;
  });

  it('degrades gracefully when MediaRecorder / microphone API is unsupported', () => {
    delete navigator.mediaDevices;
    renderWithProviders(<VoiceInput />);

    const speakBtn = screen.getByRole('button', { name: /Speak Your Complaint/i });
    expect(speakBtn).toBeDisabled();
    expect(screen.getByText(/Voice recording is unavailable in this browser/i)).toBeInTheDocument();
  });

  it('handles microphone permission denial cleanly with actionable message', async () => {
    vi.stubGlobal('MediaRecorder', class MockMediaRecorder {});
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
        ),
      },
    });

    renderWithProviders(<VoiceInput />);
    fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));

    expect(await screen.findByText(/Microphone permission was denied/i)).toBeInTheDocument();
  });

  it('rejects empty recordings cleanly without issuing STT API upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    let recorderInstance = null;
    class MockMediaRecorder {
      constructor(stream, opts = {}) {
        this.stream = stream;
        this.mimeType = opts.mimeType || 'audio/webm';
        this.state = 'inactive';
        recorderInstance = this;
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['tiny'], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    MockMediaRecorder.isTypeSupported = () => true;
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    renderWithProviders(<VoiceInput />);
    fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));
    await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
    fireEvent.click(screen.getByRole('button', { name: /Stop Recording/i }));

    expect(await screen.findByText(/Recording appears empty/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/transcribe'))).toBe(false);
  });

  it('transcribes spoken audio into editable preview, handles cancellation & low confidence, and NEVER auto-submits', async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:voice-rec');
    URL.revokeObjectURL = vi.fn();

    let submittedComplaints = 0;
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/voice/languages')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
          }),
        };
      }
      if (String(url).includes('/voice/transcribe')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              transcript: 'मुख्य रस्त्यावर मोठा खड्डा आहे',
              detectedLanguage: 'Marathi',
              detectedLanguageCode: 'mr',
              languageConfidence: 91,
              transcriptConfidence: 48,
              qualityStatus: 'low_confidence',
              durationSeconds: 3.2,
              rtl: false,
              provider: 'faster-whisper',
              model: 'base-int8',
              recommendHumanReview: true,
              warnings: ['Recognition confidence is low. Please review carefully.'],
            },
          }),
        };
      }
      if (String(url).endsWith('/complaints')) {
        submittedComplaints += 1;
      }
      return { ok: false, json: async () => ({ success: false }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    let recorderInstance = null;
    class MockMediaRecorder {
      constructor(stream, opts = {}) {
        this.stream = stream;
        this.mimeType = opts.mimeType || 'audio/webm';
        this.state = 'inactive';
        recorderInstance = this;
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        const payload = new Uint8Array(256).fill(65);
        this.ondataavailable?.({ data: new Blob([payload], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    MockMediaRecorder.isTypeSupported = () => true;
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    try {
      renderWithProviders(
        <ComplaintSubmissionModal isOpen onClose={vi.fn()} />
      );

      // Test cancellation cleanly
      fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));
      await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
      fireEvent.click(screen.getByRole('button', { name: /Cancel voice recording/i }));
      expect(screen.queryByText(/Transcript Preview/i)).not.toBeInTheDocument();

      // Record & transcribe cleanly
      fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));
      await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
      fireEvent.click(screen.getByRole('button', { name: /Stop Recording/i }));

      expect(await screen.findByText(/Transcript Preview/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidence: 48%/i)).toBeInTheDocument();
      expect(screen.getByText(/Recognition confidence is low/i)).toBeInTheDocument();

      // Transcript is NOT auto-submitted
      expect(submittedComplaints).toBe(0);

      // Edit transcript before inserting into Complaint description
      const previewBox = screen.getByLabelText(/Editable voice transcript preview/i);
      fireEvent.change(previewBox, {
        target: { value: 'मुख्य रस्त्यावर मोठा खड्डा आहे तातडीने दुरुस्ती करा' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Use in Description/i }));

      const descField = screen.getByPlaceholderText(/Describe the issue/i);
      expect(descField.value).toBe('मुख्य रस्त्यावर मोठा खड्डा आहे तातडीने दुरुस्ती करा');
      expect(submittedComplaints).toBe(0);
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });
});

describe('VoiceOutput (Text-to-Speech) workflows', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.Audio;
    delete globalThis.SpeechSynthesisUtterance;
  });

  it('never auto-plays audio and supports server synthesis with Pause, Resume, Stop, and speed', async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:tts-audio');
    URL.revokeObjectURL = vi.fn();

    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();
    let lastAudioInstance = null;

    class MockAudio {
      constructor(src) {
        this.src = src;
        this.paused = false;
        this.playbackRate = 1.0;
        this.onended = null;
        this.onerror = null;
        lastAudioInstance = this;
      }
      play() {
        this.paused = false;
        return playMock();
      }
      pause() {
        this.paused = true;
        pauseMock();
      }
    }
    vi.stubGlobal('Audio', MockAudio);

    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/voice/languages')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
          }),
        };
      }
      if (String(url).includes('/voice/synthesize')) {
        return {
          ok: true,
          headers: new Headers({
            'X-Voice-Provider': 'piper-tts',
            'X-Voice-Id': 'hi_IN-rohan-medium',
            'X-Voice-Language': 'hi',
          }),
          blob: async () => new Blob([new Uint8Array(120)], { type: 'audio/wav' }),
        };
      }
      return { ok: false };
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      renderWithProviders(
        <VoiceOutput text="नागरिक शिकायत सफलतापूर्वक दर्ज हो गई है।" label="Listen Guide" language="hi" />
      );

      // Must NOT play automatically before user interaction
      expect(playMock).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Listen Guide/i }));
      await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
      expect(lastAudioInstance?.src).toBe('blob:tts-audio');

      // Pause & Resume & Speed change & Stop
      fireEvent.click(screen.getByRole('button', { name: /Pause spoken audio/i }));
      expect(pauseMock).toHaveBeenCalledTimes(1);

      fireEvent.change(screen.getByLabelText(/Playback speed/i), { target: { value: '1.25' } });
      expect(lastAudioInstance.playbackRate).toBe(1.25);

      fireEvent.click(screen.getByRole('button', { name: /Resume spoken audio/i }));
      expect(playMock).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByRole('button', { name: /Stop spoken audio/i }));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tts-audio');
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('refuses to silently speak in an unrelated language when both server TTS and matching browser voice are unavailable', async () => {
    const speakMock = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ name: 'Microsoft David English', lang: 'en-US' }],
        speak: speakMock,
        cancel: vi.fn(),
      },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', class {});

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/voice/languages')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
            }),
          };
        }
        return {
          ok: false,
          status: 422,
          json: async () => ({
            success: false,
            error: {
              code: 'TTS_VOICE_UNAVAILABLE',
              message: 'No local neural voice is available for Tamil.',
              details: [{ browserFallbackAllowed: true }],
            },
          }),
        };
      })
    );

    renderWithProviders(
      <VoiceOutput text="தெருவிளக்கு எரியவில்லை" label="Listen Tamil" language="ta" />
    );

    fireEvent.click(screen.getByRole('button', { name: /Listen Tamil/i }));
    expect(
      await screen.findByText(/No local neural voice is available for Tamil/i)
    ).toBeInTheDocument();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it('uses matching browser speechSynthesis voice cleanly when server voice is unavailable and supports RTL transcripts', async () => {
    const speakMock = vi.fn();
    const pauseMock = vi.fn();
    const resumeMock = vi.fn();
    const cancelMock = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [{ name: 'Tamil India Voice', lang: 'ta-IN' }],
        speak: speakMock,
        pause: pauseMock,
        resume: resumeMock,
        cancel: cancelMock,
      },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) {
        this.text = text;
      }
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/voice/languages')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
            }),
          };
        }
        return {
          ok: false,
          status: 422,
          json: async () => ({
            success: false,
            error: {
              code: 'TTS_VOICE_UNAVAILABLE',
              message: 'No local neural voice is available for Tamil.',
              details: [{ browserFallbackAllowed: true }],
            },
          }),
        };
      })
    );

    renderWithProviders(
      <VoiceOutput text="தெருவிளக்கு எரியவில்லை" label="Listen Tamil" language="ta" />
    );

    fireEvent.click(screen.getByRole('button', { name: /Listen Tamil/i }));
    await waitFor(() => expect(speakMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Using browser voice \(Tamil India Voice\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pause spoken audio/i }));
    expect(pauseMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Resume spoken audio/i }));
    expect(resumeMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Stop spoken audio/i }));
    expect(cancelMock).toHaveBeenCalled();
  });
});

describe('VoiceInput RTL & Error Resilience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete navigator.mediaDevices;
    delete globalThis.MediaRecorder;
  });

  it('renders Urdu transcript preview with RTL direction and degrades cleanly on server error without blocking text entry', async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:ur-rec');
    URL.revokeObjectURL = vi.fn();

    let callNum = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/voice/languages')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
            }),
          };
        }
        if (String(url).includes('/voice/transcribe')) {
          callNum += 1;
          if (callNum === 1) {
            return {
              ok: false,
              status: 503,
              json: async () => ({
                success: false,
                error: { message: 'Voice STT model offline temporarily.' },
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                transcript: 'وارڈ 12 میں گندا پانی آ رہا ہے',
                detectedLanguage: 'Urdu',
                detectedLanguageCode: 'ur',
                languageConfidence: 92,
                transcriptConfidence: 82,
                qualityStatus: 'good',
                durationSeconds: 2.1,
                rtl: true,
                provider: 'faster-whisper',
                model: 'base-int8',
                recommendHumanReview: false,
                warnings: [],
              },
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      })
    );

    let recorderInstance = null;
    class MockMediaRecorder {
      constructor(stream, opts = {}) {
        this.stream = stream;
        this.mimeType = opts.mimeType || 'audio/webm';
        this.state = 'inactive';
        recorderInstance = this;
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        const payload = new Uint8Array(256).fill(66);
        this.ondataavailable?.({ data: new Blob([payload], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    MockMediaRecorder.isTypeSupported = () => true;
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    try {
      renderWithProviders(<VoiceInput />);

      // First recording -> 503 actionable error shown cleanly
      fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));
      await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
      fireEvent.click(screen.getByRole('button', { name: /Stop Recording/i }));
      expect(await screen.findByText(/Voice STT model offline temporarily/i)).toBeInTheDocument();

      // Retry recording -> Urdu RTL preview shown
      fireEvent.click(screen.getByRole('button', { name: /Record Again/i }));
      await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
      fireEvent.click(screen.getByRole('button', { name: /Stop Recording/i }));

      const previewBox = await screen.findByLabelText(/Editable voice transcript preview/i);
      expect(previewBox).toHaveAttribute('dir', 'rtl');
      expect(previewBox.value).toBe('وارڈ 12 میں گندا پانی آ رہا ہے');
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });
});

describe('Structured Extraction, Retranscription & App-Wide Language Sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete navigator.mediaDevices;
    delete globalThis.MediaRecorder;
    delete globalThis.Audio;
  });

  it('extracts structured fields from spoken complaint, supports ambiguous location resolution, re-transcribe, and submits exact values without auto-submitting', async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:extract-rec');
    URL.revokeObjectURL = vi.fn();

    const transcribeLangs = [];
    let submittedPayload = null;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) => {
        if (String(url).includes('/voice/languages')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
            }),
          };
        }
        if (String(url).includes('/voice/transcribe')) {
          const langVal = init.body?.get?.('language') || 'auto';
          transcribeLangs.push(langVal);
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                transcript:
                  'I have a water supply problem. Water has not been coming for three days. My ward number is 13, my state is Karnataka and my district is Bangalore.',
                detectedLanguage: 'English',
                detectedLanguageCode: 'en',
                languageConfidence: 96,
                transcriptConfidence: 88,
                qualityStatus: 'good',
                durationSeconds: 4.5,
                rtl: false,
                provider: 'faster-whisper',
                model: 'small-int8',
                recommendHumanReview: false,
                warnings: [],
              },
            }),
          };
        }
        if (String(url).includes('/voice/extract-complaint')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                originalTranscript:
                  'I have a water supply problem. Water has not been coming for three days. My ward number is 13, my state is Karnataka and my district is Bangalore.',
                detectedLanguage: 'English',
                detectedLanguageCode: 'en',
                title: 'Water Supply Problem',
                description: 'Water has not been coming for three days.',
                category: 'Water Supply',
                categoryCode: 'WATER_SUPPLY',
                state: 'Karnataka',
                district: null,
                ward: '13',
                area: 'Ward 13',
                locationStatus: 'ambiguous',
                ambiguousLocations: [
                  { field: 'district', state: 'Karnataka', district: 'Bengaluru Urban' },
                  { field: 'district', state: 'Karnataka', district: 'Bengaluru Rural' },
                ],
                locationMismatch: null,
                existingFieldConflicts: [],
                warnings: ['Location is ambiguous across multiple districts.'],
              },
            }),
          };
        }
        if (String(url).endsWith('/complaints') && init.method === 'POST') {
          submittedPayload = JSON.parse(init.body || '{}');
          return {
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              data: {
                id: 'JS-2026-9101',
                referenceId: 'JS-2026-9101',
                trackingCode: 'TRACK-9101X',
                complaint: submittedPayload,
                aiAnalysis: { detectedPriority: 'High' },
              },
            }),
          };
        }
        return { ok: false, json: async () => ({ success: false }) };
      })
    );

    let recorderInstance = null;
    class MockMediaRecorder {
      constructor(stream, opts = {}) {
        this.stream = stream;
        this.mimeType = opts.mimeType || 'audio/webm';
        this.state = 'inactive';
        recorderInstance = this;
      }
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        const payload = new Uint8Array(256).fill(67);
        this.ondataavailable?.({ data: new Blob([payload], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    MockMediaRecorder.isTypeSupported = () => true;
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    try {
      renderWithProviders(<ComplaintSubmissionModal isOpen onClose={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /Speak Your Complaint/i }));
      await waitFor(() => expect(recorderInstance?.state).toBe('recording'));
      fireEvent.click(screen.getByRole('button', { name: /Stop Recording/i }));

      // Structured preview opens automatically and displays ambiguous district resolution chips
      expect(await screen.findByTestId('extracted-fields-preview')).toBeInTheDocument();
      expect(screen.getByLabelText(/Extracted title/i).value).toBe('Water Supply Problem');
      expect(screen.getByLabelText(/Extracted ward/i).value).toBe('13');

      // Test Re-transcribe with explicit corrected language before resolving ambiguity
      fireEvent.change(screen.getByLabelText(/Correct detected spoken language/i), {
        target: { value: 'hi' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Re-transcribe/i }));
      await waitFor(() => expect(transcribeLangs).toContain('hi'));
      expect(await screen.findByTestId('extracted-fields-preview')).toBeInTheDocument();

      // Resolving ambiguity sets Bengaluru Urban cleanly
      fireEvent.click(screen.getByRole('button', { name: /Bengaluru Urban, Karnataka/i }));
      expect(screen.getByLabelText(/Extracted district/i).value).toBe('Bengaluru Urban');

      // Never auto-submits before explicit user action
      expect(submittedPayload).toBeNull();

      // Apply extracted fields to main form
      fireEvent.click(screen.getByRole('button', { name: /Apply Extracted Fields to Form/i }));

      expect(screen.getByPlaceholderText(/Broken water pipeline/i).value).toBe('Water Supply Problem');
      expect(screen.getByPlaceholderText(/Ward 12, Subhash Marg/i).value).toBe('Ward 13');
      expect(screen.getByPlaceholderText(/Describe the issue/i).value).toBe(
        'Water has not been coming for three days.'
      );
      expect(screen.getByRole('combobox', { name: /^State$/i })).toHaveTextContent('Karnataka');
      expect(screen.getByRole('combobox', { name: /District \/ City/i })).toHaveTextContent('Bengaluru Urban');

      // Explicit submit sends all populated fields
      fireEvent.click(screen.getByRole('button', { name: /^Submit Complaint$/i }));
      await waitFor(() => expect(submittedPayload).not.toBeNull());
      expect(submittedPayload.title).toBe('Water Supply Problem');
      expect(submittedPayload.state).toBe('Karnataka');
      expect(submittedPayload.district).toBe('Bengaluru Urban');
      expect(submittedPayload.area).toBe('Ward 13');
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('syncs global LanguageSelector changes directly into VoiceOutput TTS synthesis language', async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:hi-audio');
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'Audio',
      class {
        constructor() {
          this.playbackRate = 1.0;
        }
        play() {
          return Promise.resolve();
        }
        pause() {}
      }
    );

    const synthBodies = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init = {}) => {
        if (String(url).includes('/voice/languages')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: { languages: DEFAULT_VOICE_LANGUAGES, providers: {} },
            }),
          };
        }
        if (String(url).includes('/voice/synthesize')) {
          synthBodies.push(JSON.parse(init.body || '{}'));
          return {
            ok: true,
            headers: new Headers({ 'X-Voice-Provider': 'piper-tts', 'X-Voice-Language': 'hi' }),
            blob: async () => new Blob([new Uint8Array(120)], { type: 'audio/wav' }),
          };
        }
        return { ok: false };
      })
    );

    const GuideWithGlobalLanguage = () => {
      return (
        <div>
          <LanguageSelector />
          <VoiceOutput label="Listen Portal Guide" text={getVoiceGuideText('portalGuide', 'hi')} />
        </div>
      );
    };

    try {
      renderWithProviders(<GuideWithGlobalLanguage />);
      fireEvent.click(screen.getByRole('button', { name: /Select language/i }));
      fireEvent.click(screen.getByText(/हिन्दी/i));

      fireEvent.click(screen.getByRole('button', { name: /Listen Portal Guide/i }));
      await waitFor(() => expect(synthBodies.length).toBe(1));
      expect(synthBodies[0].language).toBe('hi');
      expect(synthBodies[0].text).toContain('जनसेतु एआई');
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });
});
