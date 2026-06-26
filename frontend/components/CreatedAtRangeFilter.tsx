import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { FILTER_DATE_PRESETS, getDatePreset } from '../utils/datePresets';

interface CreatedAtRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Quick preset buttons above or below the date inputs */
  presetPosition?: 'above' | 'below';
  /** Optional filter rendered before the date inputs (e.g. agent) */
  leadingFilter?: React.ReactNode;
}

export const CreatedAtRangeFilter: React.FC<CreatedAtRangeFilterProps> = ({
  from,
  to,
  onFromChange,
  onToChange,
  presetPosition = 'below',
  leadingFilter
}) => {
  const { t } = useTranslation();

  const applyPreset = (presetId: string) => {
    const range = getDatePreset(presetId);
    onFromChange(range.from);
    onToChange(range.to);
  };

  const presetButtons = (
    <div className="flex flex-wrap gap-1.5">
      {FILTER_DATE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => applyPreset(preset.id)}
          className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 transition-colors"
        >
          {t[preset.labelKey as keyof typeof t] as string}
        </button>
      ))}
    </div>
  );

  const dateInputs = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedFrom}</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedTo}</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
      </div>
    </div>
  );

  if (leadingFilter) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        <div>{leadingFilter}</div>
        <div className="sm:col-span-2 space-y-2">
          {presetPosition === 'above' && presetButtons}
          {dateInputs}
          {presetPosition === 'below' && presetButtons}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {presetPosition === 'above' && presetButtons}
      {dateInputs}
      {presetPosition === 'below' && presetButtons}
    </div>
  );
};
