import React, { useMemo, useState } from 'react';
import { University } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { formatAmountBound } from '../utils/amountRange';

interface UniversityCommissionsPageProps {
  universities: University[];
}

export const UniversityCommissionsPage: React.FC<UniversityCommissionsPageProps> = ({ universities }) => {
  const { t, translateDegree } = useTranslation();
  const [universityFilter, setUniversityFilter] = useState<string[]>([]);

  const rows = useMemo(() => {
    return universities
      .flatMap((university) =>
        (university.degreeCommissions || []).map((row, index) => ({
          id: `${university.id}-${row.degree || 'all'}-${row.amountFrom ?? 'open'}-${row.amountTo ?? 'open'}-${index}`,
          universityId: university.id,
          universityName: university.name,
          degree: row.degree || '',
          commissionKind: row.commissionKind,
          commissionValue: row.commissionValue,
          amountFrom: row.amountFrom,
          amountTo: row.amountTo,
          bonusMin: row.bonusMin,
          bonusMax: row.bonusMax
        }))
      )
      .filter((row) => universityFilter.length === 0 || universityFilter.includes(row.universityId))
      .sort((a, b) => {
        const byUniversity = a.universityName.localeCompare(b.universityName, 'tr', { sensitivity: 'base' });
        if (byUniversity !== 0) return byUniversity;
        const aDegree = a.degree ? translateDegree(a.degree) : 'Tümü / Seçilmedi';
        const bDegree = b.degree ? translateDegree(b.degree) : 'Tümü / Seçilmedi';
        return aDegree.localeCompare(bDegree, 'tr', { sensitivity: 'base' });
      });
  }, [universities, universityFilter, translateDegree]);

  const universityOptions = useMemo(
    () => [...universities]
      .sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }))
      .map((university) => ({ value: university.id, label: university.name })),
    [universities]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Üniversite Komisyonları</h2>
        <p className="text-gray-500">Üniversitelerin derece komisyon oranları tek listede</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm max-w-md">
        <SearchableMultiSelect
          selected={universityFilter}
          onChange={setUniversityFilter}
          options={universityOptions}
          placeholder={`Üniversite (${t.filterAll})`}
          searchPlaceholder={t.search}
          noResultsText={t.searchNoResults}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Üniversite</th>
                <th className="px-4 py-3 text-left">Derece</th>
                <th className="px-4 py-3 text-left">Komisyon türü</th>
                <th className="px-4 py-3 text-left">Tutar / Oran</th>
                <th className="px-4 py-3 text-left">Başlangıç tutarı</th>
                <th className="px-4 py-3 text-left">Bitiş tutarı</th>
                <th className="px-4 py-3 text-left">Bonus Min</th>
                <th className="px-4 py-3 text-left">Bonus Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.universityName}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {row.degree ? translateDegree(row.degree) : 'Tümü / Seçilmedi'}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{row.commissionKind === 'rate' ? 'Oran' : 'Sabit tutar'}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {row.commissionKind === 'rate' ? `${row.commissionValue}%` : row.commissionValue}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{formatAmountBound(row.amountFrom)}</td>
                  <td className="px-4 py-3 text-gray-900">{formatAmountBound(row.amountTo)}</td>
                  <td className="px-4 py-3 text-gray-900">{row.bonusMin != null ? row.bonusMin : '—'}</td>
                  <td className="px-4 py-3 text-gray-900">{row.bonusMax != null ? row.bonusMax : '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
