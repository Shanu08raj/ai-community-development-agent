import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export const SearchableSelect = ({
  id,
  label,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  error = '',
  emptyMessage = 'No matching options found.',
}) => {
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedOptions = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'string'
          ? { value: opt, label: opt, meta: '' }
          : { value: opt.value, label: opt.label, meta: opt.meta || '' }
      ),
    [options]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.meta && opt.meta.toLowerCase().includes(q))
    );
  }, [normalizedOptions, query]);

  const menuOpen = isOpen && !disabled;

  const selectedOption = useMemo(
    () => normalizedOptions.find((opt) => opt.value === value) || null,
    [normalizedOptions, value]
  );

  useEffect(() => {
    if (!menuOpen) return;
    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setQuery('');
    } else {
      setIsOpen(true);
      setQuery('');
      setActiveIndex(0);
    }
  };

  const handleSelect = (nextValue) => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (onChange) onChange(nextValue);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (onChange) onChange('');
  };

  const handleKeyDown = (e) => {
    if (disabled || !menuOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setQuery('');
      return;
    }

    if (filteredOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[activeIndex] || filteredOptions[0];
      if (target) handleSelect(target.value);
    }
  };

  const listboxId = `${id}-listbox`;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
      >
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <div className="relative">
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-controls={menuOpen ? listboxId : undefined}
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full px-3.5 py-2 text-left text-sm rounded-lg border flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            disabled
              ? 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-[#1E293B] text-slate-400 dark:text-slate-500 cursor-not-allowed'
              : error
              ? 'bg-white dark:bg-[#0B1120] border-rose-400 focus:ring-rose-400 text-slate-800 dark:text-slate-100 cursor-pointer'
              : 'bg-white dark:bg-[#0B1120] border-slate-300 dark:border-[#263449] text-slate-800 dark:text-slate-100 cursor-pointer'
          } ${selectedOption && !disabled ? 'pr-14' : 'pr-9'}`}
        >
          <span
            className={`truncate ${
              selectedOption
                ? 'text-slate-800 dark:text-slate-100'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </button>

        {selectedOption && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`Clear ${label}`}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${
            menuOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </div>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-[#263449] bg-slate-50/70 dark:bg-[#0B1120]/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="max-h-52 overflow-y-auto py-1"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : isActive
                        ? 'bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.meta && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0B1120] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#263449]">
                          {opt.meta}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
