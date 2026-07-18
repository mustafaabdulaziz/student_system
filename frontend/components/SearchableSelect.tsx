import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Ara',
  noResultsText = 'Sonuç bulunamadı',
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((option) => option.value === value)?.label || value;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr');
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.label.toLocaleLowerCase('tr').includes(normalizedQuery)
    );
  }, [options, query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="w-full min-h-[42px] border border-blue-100 rounded-lg px-3 py-2.5 bg-white text-left focus:ring-2 focus:ring-blue-400 outline-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown size={17} className="ml-auto shrink-0 text-gray-500" />
      </button>

      {open && !disabled && (
        <div className="absolute z-40 mt-1 w-full min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 bg-gray-50/70 p-2">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-auto py-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-gray-500">{noResultsText}</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-blue-50 ${
                    option.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Check size={15} className="ml-auto shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
