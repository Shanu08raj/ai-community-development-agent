import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_VOICE_LANGUAGES, findLanguageEntry } from '../data/voiceLanguages';
import { voiceService } from '../services/voiceService';

const LANG_STORAGE_KEY = 'jansetu_preferred_language';

const LanguageContext = createContext({
  selectedLanguage: 'en',
  languageMeta: DEFAULT_VOICE_LANGUAGES[0],
  languages: DEFAULT_VOICE_LANGUAGES,
  providers: {},
  isLoadingLanguages: false,
  setSelectedLanguage: () => {},
  getLanguageMeta: () => DEFAULT_VOICE_LANGUAGES[0],
});

export const LanguageProvider = ({ children }) => {
  const [selectedLanguage, setSelectedLanguageState] = useState(() => {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });
  const [languages, setLanguages] = useState(DEFAULT_VOICE_LANGUAGES);
  const [providers, setProviders] = useState({});
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadRegistry() {
      setIsLoadingLanguages(true);
      try {
        const res = await voiceService.getLanguages();
        if (!active) return;
        if (Array.isArray(res?.languages) && res.languages.length > 0) {
          // Merge live provider status onto static defaults preserving bcp47/scripts
          const merged = res.languages.map((remote) => {
            const localFallback =
              DEFAULT_VOICE_LANGUAGES.find((d) => d.code === remote.code) || {};
            return {
              ...localFallback,
              ...remote,
              bcp47: localFallback.bcp47 || `${remote.code}-IN`,
            };
          });
          setLanguages(merged);
        }
        if (res?.providers) {
          setProviders(res.providers);
        }
      } catch {
        // Retain static defaults if voice capability probe fails offline
      } finally {
        if (active) setIsLoadingLanguages(false);
      }
    }
    loadRegistry();
    return () => {
      active = false;
    };
  }, []);

  const setSelectedLanguage = useCallback(
    (codeOrName) => {
      const match = findLanguageEntry(languages, codeOrName);
      setSelectedLanguageState(match.code);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, match.code);
      } catch {
        // Ignore storage errors cleanly
      }
    },
    [languages]
  );

  const getLanguageMeta = useCallback(
    (codeOrName) => findLanguageEntry(languages, codeOrName || selectedLanguage),
    [languages, selectedLanguage]
  );

  const languageMeta = useMemo(
    () => findLanguageEntry(languages, selectedLanguage),
    [languages, selectedLanguage]
  );

  const value = useMemo(
    () => ({
      selectedLanguage: languageMeta.code,
      languageMeta,
      languages,
      providers,
      isLoadingLanguages,
      setSelectedLanguage,
      getLanguageMeta,
    }),
    [languageMeta, languages, providers, isLoadingLanguages, setSelectedLanguage, getLanguageMeta]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage() {
  return useContext(LanguageContext);
}
