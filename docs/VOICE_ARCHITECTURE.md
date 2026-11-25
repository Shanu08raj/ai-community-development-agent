# JanSetu AI — Multilingual Voice Architecture (STT, Structured Extraction & TTS)

JanSetu AI provides optional, privacy-first multilingual **Speech-to-Text (STT)**, **Structured Complaint Extraction**, and **Text-to-Speech (TTS)** across **English + all 22 Eighth Schedule Indian languages**, engineered for constrained consumer hardware (**NVIDIA GeForce MX250 2 GB VRAM / 8 GB system RAM / Windows & Linux**) without breaking typed complaint intake or risking automatic complaint submission.

---

## 1. Selected Voice Stack & Provider Comparison

| Component | Engine / Provider | Execution Profile & Size | Hardware & Accuracy Assessment |
|---|---|---|---|
| **Local STT (Active Default)** | `faster-whisper` `1.2.1` + `ctranslate2` `4.9.1` (`small` INT8 CPU; `base` fallback) | **CPU (`int8`)**, `small` `model.bin` `461.15 MB` (`base` `138.49 MB`) | Zero VRAM footprint; in-memory `PyAV 19.0.2` decoding handles WebM/Opus, OGG, WAV, MP3, M4A, and FLAC without `ffmpeg.exe`. Eliminates `base`'s Perso-Arabic/Katakana script corruption on Hindi/Marathi and lifts English/Tamil accuracy. Uses greedy `beam_size=1` + `no_repeat_ngram_size=3` on Dravidian/Assamese scripts to avoid >30s beam loops. |
| **Structured Extraction** | Deterministic Python Extractor (`complaint_extraction_service.py`) | Zero-VRAM deterministic regex, alias, Indic digit & fuzzy matching | Extracts editable `title`, `description`, `category`, `state`, `district`, and `ward` from spoken transcripts using all 36 Indian states/UTs and districts (`india_locations.json`), flags district-state mismatches & ambiguity, never invents/infers ward numbers, and protects existing typed fields. |
| **Local TTS** | `piper-tts` `1.8.0` + `onnxruntime` `1.32.0` (`medium` ONNX VITS voices) | **CPU**, 22,050 Hz PCM WAV, LRU cache bounded at `2` models | Sub-second warm synthesis (~266–399 ms); preloads `en` (`60.27 MB`), `hi` (`60.03 MB`), `mr` (`73.21 MB`), `te` (`60.03 MB`). |
| **Browser Fallback TTS** | Web Speech API (`window.speechSynthesis`) | Client-side **strictly when exact language/locale voice match exists** | Listens asynchronously to `voiceschanged`; refuses to substitute English voices for Hindi, Tamil, Kannada, Assamese, etc., and informs citizens honestly when unavailable. |
| **Optional Cloud Provider** | Digital India **BHASHINI** (ULCA / Dhruva REST inference) | **Disabled by default** (`ENABLE_BHASHINI=false`) | Registered MeitY ULCA portal accounts receive free PoC/low-volume trial keys under strict rate limits; production high-throughput tiers require institutional coordination. Used only as optional fallback for languages lacking local weights (e.g., `mni`, `kn`, `ta` TTS, `or`, `sat`). |
| **Evaluated Alternative (Not Bundled)** | AI4Bharat `IndicConformer-600M` multilingual ONNX | MIT License; all 22 languages; `~740 MB` INT8 (`~2.4 GB` FP32) | Requires **~2.5 GB RAM** (`INT8`) or **3.3–4.0 GB RAM** (`FP32`) post-load, risking swap/OOM alongside Windows + Chrome + Vite + Express + Piper on an **8 GB RAM** laptop. Documented as a future server-side upgrade for >=16 GB hosts. |

---

## 2. Measured Hardware Benchmarks (Observed Local Runs)

Measured directly on the development laptop (**Windows 11, Intel Core i5-10210U, 8 GB RAM, CPU `int8` inference**, 0 MB GPU VRAM allocated):

### 2.1 Memory Footprint (`WorkingSetSize` RSS)
- **Python baseline (service imports):** `52.56 MB` RSS
- **After Piper TTS (bounded LRU cap = 2 loaded voices):** `479.01 MB` RSS
- **Piper TTS + `faster-whisper` `base` INT8:** `597.41 MB` RSS
- **Standalone `faster-whisper` `small` INT8 (`~300 MB` model footprint):** `383.51 MB` RSS (combined with Piper LRU=2 stays within `~750–850 MB` RSS — safe on 8 GB host RAM).

### 2.2 Piper TTS Synthesis Latency (22,050 Hz PCM WAV)

| Language | Voice ID | Sample Duration | Cold Load + Synth | Warm Synth (`1.25x` speed) |
|---|---|---|---|---|
| English (`en`) | `en_US-lessac-medium` (`60.27 MB`) | `3.67s` | `1602.5 ms` | `266.0 ms` |
| Hindi (`hi`) | `hi_IN-rohan-medium` (`60.03 MB`) | `5.62s` | `1200.6 ms` | `398.9 ms` |
| Marathi (`mr`) | `mr_IN-google-medium` (`73.21 MB`) | `4.92s` | `1270.7 ms` | `366.6 ms` |
| Telugu (`te`) | `te_IN-maya-medium` (`60.03 MB`) | `5.57s` | `1259.3 ms` | `387.0 ms` |

### 2.3 Whisper `base` vs Whisper `small` (INT8 CPU) Measured Comparison

Benchmarked against both local Piper TTS audio and natural Indian neural speech (`en`, `hi`, `mr`, `ta`, `kn`, `te`):

| Language | Whisper `base` (`138.49 MB`) | Whisper `small` (`461.15 MB`) | Verdict & Routing Policy |
|---|---|---|---|
| **English (`en`)** | `54%` conf (`1.45s` Piper); misrecognized `"Karnataka"` as `"Grenadica"` | **`73%` conf** (`4.03s` explicit / `7.26s` auto); accurately captured `"Bengaluru Urban District, Karnataka"` | **Verified (`small`)** |
| **Hindi (`hi`)** | `50–59%` conf (`1.55–2.08s`); **corrupted output with Perso-Arabic + Katakana/Hangul** (`"میری وعد... پائپライ..."`) | **`52–70%` conf** (`5.52–5.55s` explicit); **pure Devanagari script** (`"मेरे वाड बारह में पानी की मुखे पाइप लाईं..."`) | **Verified Devanagari (`small`)**; human review encouraged |
| **Marathi (`mr`)** | `48%` conf (`1.49–1.74s`); Romanized Latin (`explicit`) or Perso-Arabic (`auto`) | **`59–68%` conf** (`4.77–4.91s` explicit); **Devanagari output** (`auto` still confuses with Hindi `0.68–0.88`) | **Partial (`small`)**; explicit Marathi selection + edit recommended |
| **Tamil (`ta`)** | `58%` conf (`1.57s`); partial Tamil script with phonetic errors | **`70%` conf** (`4.52s` `beam=1`, `auto` det `ta` `99%`); clean Tamil Unicode + `"12"` | **Verified STT (`small`)**; no local Piper TTS |
| **Kannada (`kn`)** | `36%` conf (`8.69s`); mixed Tamil + Hebrew + Arabic + Devanagari corruption | `27%` conf (`32.68s` `beam=1`, `36.59s` `auto`); Kannada Unicode but low accuracy & slow | **Low Accuracy Locally**; strong warning + typing/Bhashini recommended |
| **Telugu (`te`)** | `42–46%` conf (`1.50–5.34s`); Romanized Latin or mixed Tamil/Arabic | `30–31%` conf (`17.50–24.63s` `beam=1`; `80.83s` `beam=3`); Telugu script hallucinations | **Low Accuracy Locally**; uses `beam=1` timeout guard + typing/Bhashini recommended |
| **Assamese (`as`)** | Not locally reliable (no local voice) | Limited Whisper training coverage; high human-review warning | **Low Accuracy Locally**; typing or optional Bhashini |
| **Manipuri (`mni`)** | Unsupported (`whisperCode: None`) | Unsupported (`whisperCode: None`) | **Typing / Optional Bhashini Only** |
| **Silence (`0.6s`)** | `< 100 ms`, `0%` (`empty`) | `< 100 ms`, `0%` (`empty`) | Silero VAD returns `empty` cleanly |

---

## 3. Unified Application-Wide Language & Voice Flow

1. **Single Source of Truth (`LanguageContext.jsx`):** Global navbar `LanguageSelector` persists `selectedLanguage` in `localStorage` and synchronizes live capabilities from `GET /api/v1/voice/languages`.
2. **STT Synchronization:** `ComplaintSubmissionModal` initializes spoken language (`speechLang`) and `preferredLanguage` from `selectedLanguage` (retaining `Auto-Detect Spoken Language` and per-recording **"Wrong detected language? -> Re-transcribe"** correction without re-recording).
3. **Structured Field Extraction (`POST /api/v1/voice/extract-complaint`):** Runs automatically after transcription and on **"Extract & Fill Fields"**, opening an editable `ExtractedFieldsPreview` card covering Title, Category, State, District, Ward, and cleaned Description, with ambiguity resolution chips and conflict protection (`Fill Empty Fields Only` vs `Overwrite Existing Fields`). **Never auto-submits.**
4. **TTS Synchronization (`useTextToSpeech.js` & `voiceGuides.js`):** Every `VoiceOutput` button (Portal Guide, 4-Step Workflow Guide, Form Guide, Confirmation Summary, Community Issue Cards, Tracking Modal, Saved Report Details) passes the selected language and localized text templates across all 8 primary languages (`en`, `hi`, `mr`, `te`, `kn`, `ta`, `as`, `mni`), supporting Play, Pause, Resume, Stop, Replay, and Speed (`0.75x`, `1x`, `1.25x`).

---

## 4. Honest 23-Language Capability Matrix (English + 22 Eighth Schedule)

| Support Tier | Languages | STT Status | TTS Status | Citizen UI Behavior |
|---|---|---|---|---|
| **Local Tested — Verified** | `en` (English) | `local_whisper_verified` (`small` 73%) | `local_piper_verified` (`en_US-lessac-medium`) | Full mic STT + structured extraction + native Piper TTS |
| **Local Tested — Hindi Devanagari Verified** | `hi` (Hindi) | `local_whisper_small_verified_deva` (`small` 52–70% Devanagari) | `local_piper_verified` (`hi_IN-rohan-medium`) | Devanagari STT with review notice + native Hindi Piper TTS |
| **Local Tested — Marathi Partial** | `mr` (Marathi) | `local_whisper_small_partial` (`small` 59–68% Devanagari) | `local_piper_verified` (`mr_IN-google-medium`) | Devanagari STT (best with explicit `mr`) + native Marathi Piper TTS |
| **Local Tested — Tamil STT Verified / No Local TTS** | `ta` (Tamil) | `local_whisper_small_verified` (`small` 70% Tamil script) | `browser_or_bhashini_optional` | Tamil mic STT verified; TTS plays only via matching browser Tamil voice or optional Bhashini |
| **Local Tested — TTS Verified / Low STT Accuracy** | `te` (Telugu) | `local_whisper_low_accuracy` (`30–46%` conf locally) | `local_piper_verified` (`te_IN-maya-medium`) | Native Telugu Piper TTS verified; STT warns low confidence & encourages editing/typing |
| **Local Tested / Limited — Low STT & No Local TTS** | `kn` (Kannada), `as` (Assamese) | `local_whisper_low_accuracy` | `browser_or_bhashini_optional` | Honest warning + typing/Bhashini recommended; never speaks English fallback |
| **Local Untested — Whisper + On-Demand Piper** | `bn` (Bengali), `ml` (Malayalam), `ne` (Nepali), `ur` (Urdu, RTL) | `local_whisper_untested` | `local_piper_on_demand` (`PIPER_AUTO_DOWNLOAD=true`) | On-demand cache when enabled; matching browser fallback otherwise; `ur` renders RTL |
| **Local Untested — Whisper + Browser/Cloud Only** | `gu`, `pa`, `sa` (exp.), `sd` (exp., RTL) | `local_whisper_untested` | `browser_or_bhashini_optional` | Human review flag active; `sd` supports RTL |
| **Typed Text + Optional Bhashini Cloud Only** | `mni` (Manipuri), `brx`, `doi`, `ks` (RTL), `kok`, `mai`, `or`, `sat` | `cloud_optional_or_typing` | `cloud_optional_only` / `browser_or_bhashini_optional` | Explicit notice instead of broken offline decoding; full typed script & LangGraph support |

---

## 5. Privacy, Security & Operational Controls

1. **No Raw Audio Persistence:** `multer.memoryStorage()` holds uploaded audio strictly in RAM; `stt_service.py` decodes in-memory via `io.BytesIO`; `tts_service.py` deletes temp WAV files immediately in `finally:` and sends `Cache-Control: no-store`.
2. **Never Auto-Submit:** Speech populates `TranscriptPreview` and `ExtractedFieldsPreview` for explicit citizen review before submission.
3. **Confidential Data Exclusion:** `VoiceOutput` never reads private tracking codes, passwords, or admin internal notes.
4. **Abuse Protection:** `voiceSttLimiter` (`30 req / 10 min`) and `voiceTtsLimiter` (`90 req / 10 min`), `64 B..10 MB` size limits, `<= 120s` audio limit, magic-byte validation, and `X-Internal-Secret` authentication on Express -> FastAPI calls.
5. **Quick Disable Switch:** Set `ENABLE_VOICE_STT=false` and/or `ENABLE_VOICE_TTS=false` in `ai-service/.env` to revert to text-only operation cleanly.
