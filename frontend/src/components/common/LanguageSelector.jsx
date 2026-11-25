import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const LanguageSelector = ({ className = '' }) => {
  const { languageMeta, languages, setSelectedLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151F32] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select language"
      >
        <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline">{languageMeta.nativeName}</span>
        <span className="sm:hidden">{languageMeta.code.toUpperCase()}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            Language / भाषा (22 Scheduled + English)
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setSelectedLanguage(lang.code);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-medium block truncate">{lang.nativeName}</span>
                  <span className="text-slate-400 text-[10px]">
                    {lang.name}
                    {lang.sttAvailable || lang.ttsAvailable ? ' • Voice' : ''}
                  </span>
                </div>
                {languageMeta.code === lang.code && (
                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
