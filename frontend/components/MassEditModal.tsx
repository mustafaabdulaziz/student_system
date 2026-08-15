import React, { useEffect, useMemo, useState } from 'react';
import { FileEdit, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export type MassEditFieldType = 'select' | 'number' | 'boolean' | 'text';
export type MassEditValueMode = 'amount' | 'rate';

export interface MassEditFieldDef {
  key: string;
  label: string;
  type: MassEditFieldType;
  options?: { value: string; label: string }[];
  nullable?: boolean;
  placeholder?: string;
  /** Show amount/rate toggle for number fields (e.g. commissions) */
  supportsRateMode?: boolean;
}

export type MassEditApplyOptions = {
  valueMode?: MassEditValueMode;
};

interface MassEditModalProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  fields: MassEditFieldDef[];
  onApply: (fieldKey: string, value: unknown, options?: MassEditApplyOptions) => Promise<void>;
  applying?: boolean;
}

export const MassEditModal: React.FC<MassEditModalProps> = ({
  open,
  onClose,
  selectedCount,
  fields,
  onApply,
  applying = false
}) => {
  const { t } = useTranslation();
  const [fieldKey, setFieldKey] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [valueMode, setValueMode] = useState<MassEditValueMode>('amount');
  const [error, setError] = useState('');

  const activeField = useMemo(
    () => fields.find((f) => f.key === fieldKey) ?? null,
    [fields, fieldKey]
  );
  const showRateMode = !!(activeField?.supportsRateMode && activeField.type === 'number');

  useEffect(() => {
    if (!open) {
      setFieldKey('');
      setRawValue('');
      setValueMode('amount');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    setRawValue('');
    setValueMode('amount');
    setError('');
  }, [fieldKey]);

  const parseValue = (): unknown | null => {
    if (!activeField) return null;
    if (activeField.type === 'boolean') {
      if (rawValue === '') return null;
      return rawValue === 'true';
    }
    if (activeField.type === 'number') {
      if (rawValue.trim() === '') {
        return activeField.nullable ? null : null;
      }
      const n = parseFloat(rawValue);
      if (Number.isNaN(n)) return null;
      return n;
    }
    if (activeField.type === 'select') {
      if (rawValue === '' && activeField.nullable) return null;
      if (rawValue === '') return null;
      return rawValue;
    }
    const trimmed = rawValue.trim();
    if (!trimmed) return null;
    return trimmed;
  };

  const handleApply = async () => {
    setError('');
    if (!activeField) {
      setError(t.selectField);
      return;
    }
    const value = parseValue();
    if (value === null && activeField.type !== 'select') {
      if (activeField.type === 'number' && activeField.nullable && rawValue.trim() === '') {
        await onApply(activeField.key, null, showRateMode ? { valueMode } : undefined);
        return;
      }
      if (activeField.type === 'select' && activeField.nullable && rawValue === '') {
        await onApply(activeField.key, null);
        return;
      }
      setError(t.massEditValueRequired);
      return;
    }
    if (value === null && activeField.type === 'select' && !activeField.nullable) {
      setError(t.massEditValueRequired);
      return;
    }
    if (showRateMode && valueMode === 'rate' && typeof value === 'number' && value < 0) {
      setError(t.massEditValueRequired);
      return;
    }
    await onApply(activeField.key, value, showRateMode ? { valueMode } : undefined);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileEdit size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800">{t.massEdit}</h3>
              <p className="text-xs text-gray-500">{selectedCount} {t.massEditSelectedRecords}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={applying} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.massEditField}</label>
            <select
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              disabled={applying}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{t.selectField}</option>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>

          {activeField && showRateMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.massEditValueType}</label>
              <select
                value={valueMode}
                onChange={(e) => setValueMode(e.target.value as MassEditValueMode)}
                disabled={applying}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="amount">{t.massEditFixedAmount}</option>
                <option value="rate">{t.massEditRate}</option>
              </select>
              {valueMode === 'rate' && (
                <p className="mt-1.5 text-xs text-gray-500">
                  {activeField.key === 'grossCommission'
                    ? t.massEditGrossRateHint
                    : activeField.key === 'agencyCommission'
                      ? t.massEditAgencyRateHint
                      : ''}
                </p>
              )}
            </div>
          )}

          {activeField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {showRateMode && valueMode === 'rate' ? t.massEditRateValue : t.massEditNewValue}
              </label>
              {activeField.type === 'select' && (
                <select
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  disabled={applying}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {activeField.nullable && <option value="">—</option>}
                  {(activeField.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {activeField.type === 'boolean' && (
                <select
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  disabled={applying}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">{t.selectField}</option>
                  <option value="true">{t.yes}</option>
                  <option value="false">{t.no}</option>
                </select>
              )}
              {activeField.type === 'number' && (
                <input
                  type="number"
                  step="any"
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  disabled={applying}
                  placeholder={
                    showRateMode && valueMode === 'rate'
                      ? t.massEditRatePlaceholder
                      : activeField.placeholder
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
              {activeField.type === 'text' && (
                <input
                  type="text"
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  disabled={applying}
                  placeholder={activeField.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={applying || !fieldKey}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {applying ? t.loading : t.massEditApply}
          </button>
        </div>
      </div>
    </div>
  );
};
