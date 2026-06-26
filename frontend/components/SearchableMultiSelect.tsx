import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export type SearchableMultiSelectOption = { value: string; label: string };

function normalizeOptions(
  options: string[] | SearchableMultiSelectOption[],
  optionLabels?: Record<string, string>
): SearchableMultiSelectOption[] {
  if (options.length === 0) return [];
  if (typeof options[0] === 'string') {
    return (options as string[]).map((value) => ({
      value,
      label: optionLabels?.[value] ?? value
    }));
  }
  return options as SearchableMultiSelectOption[];
}

export interface SearchableMultiSelectProps {
  selected: string[];
  onChange: (values: string[]) => void;
  options: string[] | SearchableMultiSelectOption[];
  optionLabels?: Record<string, string>;
  placeholder: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  emptyText?: string;
  className?: string;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  selected,
  onChange,
  options,
  optionLabels,
  placeholder,
  searchPlaceholder = 'Ara',
  noResultsText = 'Sonuç bulunamadı',
  emptyText = '—',
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedOptions = useMemo(
    () => normalizeOptions(options, optionLabels),
    [options, optionLabels]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const labelByValue = useMemo(() => {
    const map = new Map<string, string>();
    normalizedOptions.forEach((opt) => map.set(opt.value, opt.label));
    selected.forEach((value) => {
      if (!map.has(value)) map.set(value, optionLabels?.[value] ?? value);
    });
    return map;
  }, [normalizedOptions, selected, optionLabels]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.trim().toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [normalizedOptions, searchQuery]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]);
  };

  const remove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== value));
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full min-h-[42px] border border-gray-200 rounded-lg px-3 py-2 bg-white text-left text-sm focus:ring-2 focus:ring-blue-500 outline-none flex flex-wrap items-center gap-1.5"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          selected.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium max-w-full"
            >
              <span className="truncate">{labelByValue.get(value) ?? value}</span>
              <button type="button" onClick={(e) => remove(value, e)} className="hover:bg-blue-100 rounded p-0.5 shrink-0">
                <X size={12} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={16} className="ml-auto text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="py-1 max-h-48 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {searchQuery.trim() ? noResultsText : emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    selected.includes(opt.value) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {selected.includes(opt.value) && <span className="text-blue-600 shrink-0">✓</span>}
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
