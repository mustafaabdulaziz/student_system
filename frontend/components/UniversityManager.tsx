import React, { useState, useRef, useEffect } from 'react';
import { University, Program, User, UserRole, UniversityDegreeCommission } from '../types';
import { canManageCatalog, canSeeFinance } from '../utils/roles';
import {
  Plus, Globe, Sparkles, X, Image, Pencil, Trash2,
  BookOpen, Clock, DollarSign, Calendar, ChevronLeft,
  MapPin, ExternalLink, GraduationCap, Search, LayoutGrid, List, ArrowLeft, ChevronUp, ChevronDown
} from 'lucide-react';
import { generateUniversityDescription } from '../services/geminiService';
import { useTranslation } from '../hooks/useTranslation';
import * as XLSX from 'xlsx';
import { SavedQuickFilters } from './SavedQuickFilters';

const DEGREE_COMMISSION_OPTIONS = ['Diploma', 'Bachelor', 'Master', 'PhD'] as const;

type DegreeCommissionFormRow = {
  degree: '' | typeof DEGREE_COMMISSION_OPTIONS[number];
  commissionKind: '' | 'rate' | 'amount';
  commissionValue: string;
  bonusMin: string;
  bonusMax: string;
};

const EMPTY_DEGREE_COMMISSION_ROW: DegreeCommissionFormRow = {
  degree: '',
  commissionKind: '',
  commissionValue: '',
  bonusMin: '',
  bonusMax: ''
};

interface UniversityManagerProps {
  universities: University[];
  programs: Program[];
  onAddUniversity: (uni: University) => void;
  onEditUniversity: (uni: University) => void | Promise<boolean>;
  onDeleteUniversity: (id: string) => void;
  currentUser?: User | null;
}

const EMPTY_FORM: Partial<University> & {
  educationVatRateInput?: string;
  abroadVatRateInput?: string;
  commissionValueInput?: string;
  bonusMaxInput?: string;
  bonusMinInput?: string;
} = {
  name: '', website: '', country: 'Turkey', city: '', description: '', logo: undefined,
  educationVatRate: null,
  abroadVatRate: null,
  commissionKind: null,
  commissionValue: null,
  bonusMax: null,
  bonusMin: null,
  educationVatRateInput: '',
  abroadVatRateInput: '',
  commissionValueInput: '',
  bonusMaxInput: '',
  bonusMinInput: ''
};

const DEGREE_COLORS: Record<string, string> = {
  Bachelor: 'bg-blue-50 text-blue-700',
  Master: 'bg-purple-50 text-purple-700',
  PhD: 'bg-pink-50 text-pink-700',
  CombinedPhD: 'bg-indigo-50 text-indigo-700',
  Diploma: 'bg-yellow-50 text-yellow-700',
};

const LANG_COLORS: Record<string, string> = {
  English: 'bg-green-50 text-green-700',
  Turkish: 'bg-red-50 text-red-700',
  Arabic: 'bg-orange-50 text-orange-700',
};

const UNIVERSITY_EXCEL_COLUMNS = [
  'üniversite adı',
  'ülke',
  'şehir',
  'web sitesi',
  'açıklama',
  'eğitim kdv oranı',
  'yurtdışı kdv oranı',
  'komisyon türü',
  'tutar / oran'
] as const;

const normalizeExcelText = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ');
};

const parseExcelCountry = (value: unknown): 'Turkey' | 'Cyprus' | null => {
  const v = normalizeExcelText(value);
  if (['turkiye', 'turkey'].includes(v)) return 'Turkey';
  if (['kibris', 'cyprus'].includes(v)) return 'Cyprus';
  return null;
};

const parseExcelCommissionKind = (value: unknown): 'amount' | 'rate' | null => {
  const v = normalizeExcelText(value);
  if (!v) return null;
  if (['sabit tutar', 'sabit', 'amount'].includes(v)) return 'amount';
  if (['oran', 'rate'].includes(v)) return 'rate';
  return null;
};

export const UniversityManager: React.FC<UniversityManagerProps> = ({
  universities, programs,
  onAddUniversity, onEditUniversity, onDeleteUniversity, currentUser
}) => {
  const { t, translateDegree } = useTranslation();
  const canManage = canManageCatalog(currentUser?.role);
  const canEditFinance = canSeeFinance(currentUser?.role);
  const getCountryLabel = (country?: string) => {
    if (country === 'Turkey') return t.countryTurkey;
    if (country === 'Cyprus') return t.countryCyprus;
    return country || '—';
  };

  /* -------- Modals & View State -------- */
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailUni, setDetailUni] = useState<University | null>(null); // inline detail form

  useEffect(() => {
    if (!detailUni) return;
    const fresh = universities.find((u) => u.id === detailUni.id);
    if (!fresh) return;
    setDetailUni((prev) => {
      if (!prev || prev.id !== fresh.id) return fresh;
      return {
        ...fresh,
        educationVatRate: fresh.educationVatRate ?? prev.educationVatRate,
        abroadVatRate: fresh.abroadVatRate ?? prev.abroadVatRate,
        commissionKind: fresh.commissionKind ?? prev.commissionKind,
        commissionValue: fresh.commissionValue ?? prev.commissionValue,
        bonusMax: fresh.bonusMax ?? prev.bonusMax,
        bonusMin: fresh.bonusMin ?? prev.bonusMin,
        degreeCommissions: fresh.degreeCommissions ?? prev.degreeCommissions,
      };
    });
  }, [universities, detailUni?.id]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'kanban'>('tree');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  /* -------- Form State -------- */
  const [formData, setFormData] = useState<Partial<University>>(EMPTY_FORM);
  const [degreeCommissionRows, setDegreeCommissionRows] = useState<DegreeCommissionFormRow[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  /* -------- Logo helpers -------- */
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert(t.invalidImageFile); return; }
    if (file.size > 2 * 1024 * 1024) { alert(t.logoFormatHint); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setLogoPreview(b64); setLogoBase64(b64);
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveLogo = () => {
    setLogoPreview(null); setLogoBase64(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  /* -------- Open / Close modal -------- */
  const openAdd = () => {
    setDetailUni(null);
    setFormData(EMPTY_FORM); setLogoPreview(null); setLogoBase64(null);
    setDegreeCommissionRows([]);
    setEditingId(null); setModalMode('add');
  };
  const openEdit = (uni: University, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailUni(null);
    setFormData({
      ...uni,
      educationVatRateInput: uni.educationVatRate != null && !Number.isNaN(uni.educationVatRate) ? String(uni.educationVatRate) : '',
      abroadVatRateInput: uni.abroadVatRate != null && !Number.isNaN(uni.abroadVatRate) ? String(uni.abroadVatRate) : '',
      commissionValueInput: uni.commissionValue != null && !Number.isNaN(uni.commissionValue) ? String(uni.commissionValue) : '',
      bonusMaxInput: uni.bonusMax != null && !Number.isNaN(uni.bonusMax) ? String(uni.bonusMax) : '',
      bonusMinInput: uni.bonusMin != null && !Number.isNaN(uni.bonusMin) ? String(uni.bonusMin) : ''
    } as Partial<University> & {
      educationVatRateInput?: string;
      abroadVatRateInput?: string;
      commissionValueInput?: string;
      bonusMaxInput?: string;
      bonusMinInput?: string;
    });
    setDegreeCommissionRows(
      (uni.degreeCommissions || []).map((row) => ({
        degree: row.degree,
        commissionKind: row.commissionKind,
        commissionValue: String(row.commissionValue),
        bonusMin: row.bonusMin != null && !Number.isNaN(Number(row.bonusMin)) ? String(row.bonusMin) : '',
        bonusMax: row.bonusMax != null && !Number.isNaN(Number(row.bonusMax)) ? String(row.bonusMax) : ''
      }))
    );
    setLogoPreview(uni.logo || null); setLogoBase64(uni.logo || null);
    setEditingId(uni.id); setModalMode('edit');
  };
  const closeModal = () => {
    setModalMode(null); setEditingId(null); setFormData(EMPTY_FORM);
    setDegreeCommissionRows([]);
    setLogoPreview(null); setLogoBase64(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const parseDegreeCommissions = (): UniversityDegreeCommission[] | null => {
    const out: UniversityDegreeCommission[] = [];
    const seen = new Set<string>();
    for (const row of degreeCommissionRows) {
      const degree = row.degree;
      const kind = row.commissionKind;
      const raw = row.commissionValue.trim();
      const bonusMinRaw = (row.bonusMin || '').trim();
      const bonusMaxRaw = (row.bonusMax || '').trim();
      const empty = !degree && !kind && raw === '' && bonusMinRaw === '' && bonusMaxRaw === '';
      if (empty) continue;
      if (!degree || !kind || raw === '') {
        alert('Derece komisyon satırlarında derece, komisyon türü ve tutar/oran zorunludur.');
        return null;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        alert('Derece komisyon tutar/oran değeri geçerli bir sayı olmalıdır.');
        return null;
      }
      let bonusMin: number | null = null;
      let bonusMax: number | null = null;
      if (bonusMinRaw !== '') {
        bonusMin = Number(bonusMinRaw);
        if (!Number.isFinite(bonusMin)) {
          alert('Bonus Min değeri geçerli bir sayı olmalıdır.');
          return null;
        }
      }
      if (bonusMaxRaw !== '') {
        bonusMax = Number(bonusMaxRaw);
        if (!Number.isFinite(bonusMax)) {
          alert('Bonus Max değeri geçerli bir sayı olmalıdır.');
          return null;
        }
      }
      if (seen.has(degree)) {
        alert('Aynı derece için birden fazla komisyon satırı eklenemez.');
        return null;
      }
      seen.add(degree);
      out.push({ degree, commissionKind: kind, commissionValue: value, bonusMin, bonusMax });
    }
    return out;
  };

  /* -------- AI description -------- */
  const handleAiDescription = async () => {
    if (!formData.name || !formData.country) return;
    setLoadingAi(true);
    const desc = await generateUniversityDescription(formData.name, formData.country);
    setFormData(prev => ({ ...prev, description: desc }));
    setLoadingAi(false);
  };

  /* -------- Submit -------- */
  const parseAdminFinance = (): Pick<University, 'educationVatRate' | 'abroadVatRate' | 'commissionKind' | 'commissionValue' | 'bonusMax' | 'bonusMin'> => {
    const ext = formData as Partial<University> & {
      educationVatRateInput?: string;
      abroadVatRateInput?: string;
      commissionValueInput?: string;
      bonusMaxInput?: string;
      bonusMinInput?: string;
    };
    const vatRaw = (ext.educationVatRateInput ?? '').toString().trim();
    const educationVatRate = vatRaw === '' ? null : parseInt(vatRaw, 10);
    const abroadVatRaw = (ext.abroadVatRateInput ?? '').toString().trim();
    const abroadVatRate = abroadVatRaw === '' ? null : parseFloat(abroadVatRaw);
    const kind = (formData.commissionKind || '').toString().trim() as '' | 'amount' | 'rate';
    const commRaw = (ext.commissionValueInput ?? '').toString().trim();
    const commissionValue = commRaw === '' ? null : parseFloat(commRaw);
    const commissionKind = kind === 'amount' || kind === 'rate' ? kind : null;
    const bonusMaxRaw = (ext.bonusMaxInput ?? '').toString().trim();
    const bonusMinRaw = (ext.bonusMinInput ?? '').toString().trim();
    const bonusMax = bonusMaxRaw === '' ? null : parseFloat(bonusMaxRaw);
    const bonusMin = bonusMinRaw === '' ? null : parseFloat(bonusMinRaw);
    return {
      educationVatRate: vatRaw === '' || Number.isNaN(educationVatRate as number) ? null : educationVatRate,
      abroadVatRate: abroadVatRaw === '' || Number.isNaN(abroadVatRate as number) ? null : abroadVatRate,
      commissionKind,
      commissionValue: commRaw === '' || Number.isNaN(commissionValue as number) ? null : commissionValue,
      bonusMax: bonusMaxRaw === '' || Number.isNaN(bonusMax as number) ? null : bonusMax,
      bonusMin: bonusMinRaw === '' || Number.isNaN(bonusMin as number) ? null : bonusMin
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.website || !formData.country || !formData.description) return;
    const adminFin = canEditFinance ? parseAdminFinance() : {
      educationVatRate: null,
      abroadVatRate: null,
      commissionKind: null,
      commissionValue: null,
      bonusMax: null,
      bonusMin: null
    };
    if (canEditFinance) {
      const ext = formData as Partial<University> & {
        educationVatRateInput?: string;
        abroadVatRateInput?: string;
        commissionValueInput?: string;
        bonusMaxInput?: string;
        bonusMinInput?: string;
      };
      const vatRaw = (ext.educationVatRateInput ?? '').toString().trim();
      if (vatRaw !== '' && adminFin.educationVatRate === null) {
        alert('Eğitim KDV oranı geçerli bir tam sayı olmalıdır.');
        return;
      }
      const abroadVatRaw = (ext.abroadVatRateInput ?? '').toString().trim();
      if (abroadVatRaw !== '' && adminFin.abroadVatRate === null) {
        alert('Yurtdışı KDV oranı geçerli bir sayı olmalıdır.');
        return;
      }
      if (adminFin.commissionKind && adminFin.commissionValue === null) {
        alert('Komisyon türü seçildiğinde tutar veya oran değeri girilmelidir.');
        return;
      }
      if (adminFin.commissionValue !== null && !adminFin.commissionKind) {
        alert('Komisyon değeri için önce tür seçin (tutar veya oran).');
        return;
      }
      const bonusMaxRaw = (ext.bonusMaxInput ?? '').toString().trim();
      const bonusMinRaw = (ext.bonusMinInput ?? '').toString().trim();
      if (bonusMaxRaw !== '' && adminFin.bonusMax === null) {
        alert('Bonus Max geçerli bir sayı olmalıdır.');
        return;
      }
      if (bonusMinRaw !== '' && adminFin.bonusMin === null) {
        alert('Bonus Min geçerli bir sayı olmalıdır.');
        return;
      }
    }
    const degreeCommissions = canEditFinance ? parseDegreeCommissions() : [];
    if (canEditFinance && degreeCommissions === null) return;
    const uniData: University = {
      id: editingId || Date.now().toString(),
      name: formData.name, website: formData.website,
      country: formData.country as 'Turkey' | 'Cyprus',
      city: formData.city || '',
      description: formData.description,
      logo: logoBase64 || undefined,
      ...(canEditFinance ? adminFin : {}),
      ...(canEditFinance ? { degreeCommissions: degreeCommissions || [] } : {})
    };
    if (modalMode === 'edit') {
      const saved = await Promise.resolve(onEditUniversity(uniData));
      if (saved) {
        setDetailUni(uniData);
        closeModal();
      }
      return;
    }
    onAddUniversity(uniData);
    closeModal();
  };

  /* -------- Excel Import -------- */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportToExcel = () => {
    const rows = universities.map((u) => ({
      'üniversite adı': u.name || '',
      'ülke': u.country === 'Cyprus' ? 'Kıbrıs' : 'Türkiye',
      'şehir': u.city || '',
      'web sitesi': u.website || '',
      'açıklama': u.description || '',
      'eğitim kdv oranı': u.educationVatRate ?? '',
      'yurtdışı kdv oranı': u.abroadVatRate ?? '',
      'komisyon türü': u.commissionKind === 'amount' ? 'Sabit Tutar' : u.commissionKind === 'rate' ? 'Oran' : '',
      'tutar / oran': u.commissionValue ?? ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows, { header: [...UNIVERSITY_EXCEL_COLUMNS] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Universiteler');
    XLSX.writeFile(wb, 'universiteler.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as Array<Array<string | number>>;

      if (matrix.length === 0) {
        alert('Excel dosyası boş.');
        return;
      }

      const header = (matrix[0] || []).map(normalizeExcelText);
      const expected = [...UNIVERSITY_EXCEL_COLUMNS].map(normalizeExcelText);
      const headerMatches = expected.every((col, idx) => header[idx] === col);
      if (!headerMatches) {
        alert(`Sütun sırası hatalı. Beklenen sıra:\n${UNIVERSITY_EXCEL_COLUMNS.join(', ')}`);
        return;
      }

      let imported = 0;
      const errors: string[] = [];

      for (let i = 1; i < matrix.length; i += 1) {
        const row = matrix[i] || [];
        const rowNo = i + 1;

        const name = String(row[0] ?? '').trim();
        const country = parseExcelCountry(row[1]);
        const city = String(row[2] ?? '').trim();
        const website = String(row[3] ?? '').trim();
        const description = String(row[4] ?? '').trim();
        const educationVatRaw = String(row[5] ?? '').trim();
        const abroadVatRaw = String(row[6] ?? '').trim();
        const commissionKind = parseExcelCommissionKind(row[7]);
        const commissionValueRaw = String(row[8] ?? '').trim();

        const isCompletelyEmpty = [name, row[1], city, website, description, educationVatRaw, abroadVatRaw, row[7], commissionValueRaw]
          .every((v) => String(v ?? '').trim() === '');
        if (isCompletelyEmpty) continue;

        if (!name) {
          errors.push(`Satır ${rowNo}: Üniversite adı boş.`);
          continue;
        }
        if (!country) {
          errors.push(`Satır ${rowNo}: Ülke Türkiye/Kıbrıs olmalı.`);
          continue;
        }
        if (!website) {
          errors.push(`Satır ${rowNo}: Web sitesi boş.`);
          continue;
        }
        if (!description) {
          errors.push(`Satır ${rowNo}: Açıklama boş.`);
          continue;
        }

        const educationVatRate =
          educationVatRaw === '' ? null : Number.isNaN(Number(educationVatRaw)) ? null : parseInt(educationVatRaw, 10);
        if (educationVatRaw !== '' && educationVatRate === null) {
          errors.push(`Satır ${rowNo}: Eğitim KDV oranı sayı olmalı.`);
          continue;
        }

        const abroadVatRate =
          abroadVatRaw === '' ? null : Number.isNaN(Number(abroadVatRaw)) ? null : parseFloat(abroadVatRaw);
        if (abroadVatRaw !== '' && abroadVatRate === null) {
          errors.push(`Satır ${rowNo}: Yurtdışı KDV oranı sayı olmalı.`);
          continue;
        }

        const commissionValue =
          commissionValueRaw === '' ? null : Number.isNaN(Number(commissionValueRaw)) ? null : Number(commissionValueRaw);
        if (commissionValueRaw !== '' && commissionValue === null) {
          errors.push(`Satır ${rowNo}: Tutar/Oran sayı olmalı.`);
          continue;
        }
        if (commissionKind && commissionValue == null) {
          errors.push(`Satır ${rowNo}: Komisyon türü varsa Tutar/Oran gerekli.`);
          continue;
        }
        if (!commissionKind && commissionValue != null) {
          errors.push(`Satır ${rowNo}: Tutar/Oran varsa Komisyon türü gerekli.`);
          continue;
        }

        onAddUniversity({
          id: `${Date.now()}-${i}`,
          name,
          country,
          city,
          website,
          description,
          educationVatRate,
          abroadVatRate,
          commissionKind,
          commissionValue
        });
        imported += 1;
      }

      if (errors.length > 0) {
        alert(`Import tamamlandı.\nBaşarılı: ${imported}\nHatalı: ${errors.length}\n\n${errors.slice(0, 10).join('\n')}`);
      } else {
        alert(`${imported} üniversite içe aktarıldı.`);
      }
    } catch {
      alert(t.errorConnection);
    }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* -------- Delete -------- */
  const handleDeleteConfirm = () => {
    if (!confirmDeleteId) return;
    onDeleteUniversity(confirmDeleteId);
    if (detailUni?.id === confirmDeleteId) setDetailUni(null);
    setConfirmDeleteId(null);
  };

  /* -------- Helpers -------- */
  /* -------- Body Scroll Lock (only for delete confirm overlay) -------- */
  useEffect(() => {
    if (confirmDeleteId) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [confirmDeleteId]);

  const uniPrograms = (uniId: string) => programs.filter(p => p.universityId === uniId && !p.isArchived);

  const filteredUniversities = universities.filter(uni =>
    !searchQuery.trim() || uni.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const sortedUniversities = (() => {
    if (!sortBy) return filteredUniversities;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredUniversities].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortBy) {
        case 'name': va = a.name.toLowerCase(); vb = b.name.toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'country': va = (a.country || '').toLowerCase(); vb = (b.country || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'city': va = (a.city || '').toLowerCase(); vb = (b.city || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'website': va = (a.website || '').toLowerCase(); vb = (b.website || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'programs': va = programs.filter(p => p.universityId === a.id && !p.isArchived).length; vb = programs.filter(p => p.universityId === b.id && !p.isArchived).length; return dir * ((va as number) - (vb as number));
        default: return 0;
      }
    });
  })();
  const byCountry = sortedUniversities.reduce<Record<string, University[]>>((acc, uni) => {
    const c = uni.country || 'Other';
    if (!acc[c]) acc[c] = [];
    acc[c].push(uni);
    return acc;
  }, {});
  const toggleSort = (key: string) => {
    setSortBy(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };
  const SortHeader = ({ colKey, label }: { colKey: string; label: string }) => (
    <span
      role="button"
      tabIndex={0}
      onClick={() => toggleSort(colKey)}
      onKeyDown={e => e.key === 'Enter' && toggleSort(colKey)}
      className="font-bold text-gray-900 cursor-pointer select-none hover:text-gray-700 inline-flex items-center gap-0.5"
    >
      {label}
      {sortBy === colKey ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <span className="opacity-30"><ChevronDown size={12} /></span>}
    </span>
  );

  const LogoBox = ({ uni, size = 'lg' }: { uni: University; size?: 'sm' | 'lg' }) => {
    const cls = size === 'lg'
      ? 'h-16 w-16 text-2xl rounded-xl'
      : 'h-12 w-12 text-lg rounded-lg';
    return (
      <div className={`${cls} overflow-hidden flex items-center justify-center bg-blue-50 text-blue-600 font-bold flex-shrink-0 border border-blue-100`}>
        {uni.logo
          ? <img src={uni.logo} alt={uni.name} className="h-full w-full object-contain p-1"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = uni.name.substring(0, 2).toUpperCase(); }} />
          : uni.name.substring(0, 2).toUpperCase()}
      </div>
    );
  };

  /* ============================== RENDER ============================== */
  return (
    <div className="space-y-6">

      {/* Full-screen view details */}
      {detailUni && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setDetailUni(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl px-3 py-2.5 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t.back}</span>
              </button>
              <div className="flex items-center gap-3 min-w-0">
                <LogoBox uni={detailUni} size="sm" />
                <div>
                  <h2 className="text-xl font-bold text-gray-800 truncate">{detailUni.name}</h2>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <MapPin size={12} className="text-blue-500" />
                    <span>{detailUni.city ? `${detailUni.city}, ` : ''}{getCountryLabel(detailUni.country)}</span>
                  </div>
                </div>
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={e => openEdit(detailUni, e)}
                  className="flex items-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  <Pencil size={18} />
                  <span>{t.edit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(detailUni.id)}
                  className="flex items-center gap-2 bg-red-50 text-red-600 py-2.5 px-4 rounded-xl font-semibold text-sm hover:bg-red-600 hover:text-white transition-colors"
                >
                  <Trash2 size={18} />
                  <span>{t.delete}</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="h-36 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl flex items-end p-6">
                <a href={detailUni.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white border border-white/30 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white hover:text-blue-600 transition-all">
                  <Globe size={16} />
                  {t.visitOfficialWebsite}
                </a>
              </div>
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
                  <Sparkles size={20} className="text-blue-500" />
                  {t.overview}
                </h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{detailUni.description}</p>
              </section>
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <GraduationCap size={22} className="text-purple-500" />
                    {t.programsAndFees}
                  </h3>
                  <span className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-xl text-xs font-semibold">
                    {uniPrograms(detailUni.id).length} {t.availableSpecialization}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uniPrograms(detailUni.id).map(prog => (
                    <div key={prog.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-semibold text-gray-800">{prog.name}</h5>
                          {prog.nameInArabic && <p className="text-sm text-gray-500 mt-0.5" dir="rtl">{prog.nameInArabic}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${DEGREE_COLORS[prog.degree] || 'bg-gray-100 text-gray-600'}`}>
                          {translateDegree(prog.degree)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={12} /> {prog.years}y</span>
                        <span className="flex items-center gap-1"><Globe size={12} /> {prog.language}</span>
                        <span className="text-blue-600 font-semibold">{prog.fee.toLocaleString()} {prog.currency || 'USD'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              {canEditFinance && (
                <section className="rounded-2xl p-6 border border-amber-200 bg-amber-50/50">
                  <h3 className="font-bold text-amber-950 text-lg mb-3 flex items-center gap-2">
                    <DollarSign size={20} className="text-amber-700" />
                    Yönetici — finans
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide mb-1">Eğitim KDV oranı</dt>
                      <dd className="text-gray-900 font-medium">{detailUni.educationVatRate != null ? String(detailUni.educationVatRate) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide mb-1">Yurtdışı KDV oranı</dt>
                      <dd className="text-gray-900 font-medium">{detailUni.abroadVatRate != null ? String(detailUni.abroadVatRate) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide mb-1">Komisyon</dt>
                      <dd className="text-gray-900 font-medium">
                        {detailUni.commissionKind === 'amount' && detailUni.commissionValue != null
                          ? `Sabit tutar: ${detailUni.commissionValue}`
                          : detailUni.commissionKind === 'rate' && detailUni.commissionValue != null
                            ? `Oran: ${detailUni.commissionValue}%`
                            : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide mb-1">Bonus Max</dt>
                      <dd className="text-gray-900 font-medium">{detailUni.bonusMax != null ? String(detailUni.bonusMax) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide mb-1">Bonus Min</dt>
                      <dd className="text-gray-900 font-medium">{detailUni.bonusMin != null ? String(detailUni.bonusMin) : '—'}</dd>
                    </div>
                  </dl>
                  {(detailUni.degreeCommissions || []).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-amber-900/80 uppercase tracking-wide mb-2">Derece komisyon oranları</h4>
                      <div className="overflow-x-auto rounded-xl border border-amber-100 bg-white">
                        <table className="w-full text-sm">
                          <thead className="bg-amber-50/80">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Derece</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Komisyon türü</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Tutar / Oran</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Bonus Min</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Bonus Max</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(detailUni.degreeCommissions || []).map((row) => (
                              <tr key={`${row.degree}-${row.commissionKind}`}>
                                <td className="px-3 py-2">{translateDegree(row.degree)}</td>
                                <td className="px-3 py-2">{row.commissionKind === 'rate' ? 'Oran' : 'Sabit tutar'}</td>
                                <td className="px-3 py-2">
                                  {row.commissionKind === 'rate' ? `${row.commissionValue}%` : row.commissionValue}
                                </td>
                                <td className="px-3 py-2">{row.bonusMin != null ? row.bonusMin : '—'}</td>
                                <td className="px-3 py-2">{row.bonusMax != null ? row.bonusMax : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen form (Add / Edit) */}
      {modalMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={closeModal}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl px-3 py-2.5 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t.back}</span>
              </button>
              <h2 className="text-xl font-bold text-gray-800 truncate">
                {modalMode === 'edit' ? `${t.editUniversity} – ${formData.name}` : t.addUniversity}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={closeModal} className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors shadow-sm">
                {t.cancel}
              </button>
              <button type="submit" form="university-form" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-md shadow-blue-600/20">
                {t.save}
              </button>
            </div>
          </div>
          <form id="university-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityName}</label>
                <input type="text" required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityCountry}</label>
                  <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value as any })}>
                    <option value="Turkey">{t.countryTurkey}</option>
                    <option value="Cyprus">{t.countryCyprus}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.city}</label>
                  <input type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityWebsite}</label>
                  <input type="url" required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityLogoOptional}</label>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                {!logoPreview ? (
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <Image size={28} className="mb-1" />
                    <span className="text-sm">{t.clickToUploadLogo}</span>
                    <span className="text-xs text-gray-300 mt-1">{t.logoFormatHint}</span>
                  </button>
                ) : (
                  <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3 bg-gray-50">
                    <img src={logoPreview} alt="" className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-white p-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{t.selectedLogo}</p>
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-blue-600 hover:underline">{t.changeLogo}</button>
                    </div>
                    <button type="button" onClick={handleRemoveLogo} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={18} /></button>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">{t.universityDescription}</label>
                  <button type="button" onClick={handleAiDescription} disabled={loadingAi || !formData.name} className="text-xs flex items-center text-purple-600 hover:text-purple-800 disabled:opacity-50">
                    <Sparkles size={12} className="ml-1" /> {loadingAi ? t.loading : 'AI Generate'}
                  </button>
                </div>
                <textarea required rows={5} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              {canEditFinance && (
                <div className="border-t border-amber-200 pt-6 mt-2 space-y-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                    <DollarSign size={18} />
                    Yönetici — finans
                  </h3>
                  <p className="text-xs text-amber-800/90">Bu alanlar yalnızca yönetici hesabında görünür ve kaydedilir.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Eğitim KDV oranı (tam sayı)</label>
                    <input
                      type="number"
                      step={1}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                      placeholder="Örn. 18"
                      value={(formData as Partial<University> & { educationVatRateInput?: string }).educationVatRateInput ?? ''}
                      onChange={e => setFormData({ ...formData, educationVatRateInput: e.target.value } as Partial<University> & { educationVatRateInput?: string })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Yurtdışı KDV oranı (%)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                      placeholder="Örn. 10"
                      value={(formData as Partial<University> & { abroadVatRateInput?: string }).abroadVatRateInput ?? ''}
                      onChange={e => setFormData({ ...formData, abroadVatRateInput: e.target.value } as Partial<University> & { abroadVatRateInput?: string })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Komisyon türü</label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        value={(formData.commissionKind || '') as string}
                        onChange={e => {
                          const v = e.target.value;
                          setFormData({ ...formData, commissionKind: (v === '' ? null : v) as 'amount' | 'rate' | null });
                        }}
                      >
                        <option value="">Seçiniz</option>
                        <option value="amount">Sabit tutar</option>
                        <option value="rate">Oran</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        {(formData.commissionKind === 'rate' ? 'Oran (%)' : formData.commissionKind === 'amount' ? 'Tutar' : 'Tutar / oran değeri')}
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        placeholder={formData.commissionKind === 'rate' ? 'Örn. 12.5' : 'Örn. 5000'}
                        value={(formData as Partial<University> & { commissionValueInput?: string }).commissionValueInput ?? ''}
                        onChange={e => setFormData({ ...formData, commissionValueInput: e.target.value } as Partial<University> & { commissionValueInput?: string })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Bonus Max</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        placeholder="Örn. 500"
                        value={(formData as Partial<University> & { bonusMaxInput?: string }).bonusMaxInput ?? ''}
                        onChange={e => setFormData({ ...formData, bonusMaxInput: e.target.value } as Partial<University> & { bonusMaxInput?: string })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Bonus Min</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        placeholder="Örn. 200"
                        value={(formData as Partial<University> & { bonusMinInput?: string }).bonusMinInput ?? ''}
                        onChange={e => setFormData({ ...formData, bonusMinInput: e.target.value } as Partial<University> & { bonusMinInput?: string })}
                      />
                    </div>
                  </div>
                  <div className="border-t border-amber-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Derece komisyon oranları</h4>
                        <p className="text-xs text-amber-800/80">Her satırda derece, komisyon türü ve tutar/oran zorunludur.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDegreeCommissionRows(prev => [...prev, { ...EMPTY_DEGREE_COMMISSION_ROW }])}
                        className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200"
                      >
                        <Plus size={14} />
                        Satır Ekle
                      </button>
                    </div>
                    {degreeCommissionRows.length === 0 ? (
                      <p className="text-xs text-gray-500">Henüz derece komisyon satırı yok.</p>
                    ) : (
                      <div className="space-y-2">
                        {degreeCommissionRows.map((row, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_0.9fr_0.9fr_0.9fr_auto] gap-2 items-end bg-white/80 rounded-xl p-2 border border-amber-100">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Derece *</label>
                              <select
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                value={row.degree}
                                onChange={(e) => setDegreeCommissionRows(prev => prev.map((r, i) => i === idx ? { ...r, degree: e.target.value as DegreeCommissionFormRow['degree'] } : r))}
                              >
                                <option value="">Seçiniz</option>
                                {DEGREE_COMMISSION_OPTIONS.map((degree) => (
                                  <option key={degree} value={degree}>{translateDegree(degree)}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Komisyon türü *</label>
                              <select
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                value={row.commissionKind}
                                onChange={(e) => setDegreeCommissionRows(prev => prev.map((r, i) => i === idx ? { ...r, commissionKind: e.target.value as DegreeCommissionFormRow['commissionKind'] } : r))}
                              >
                                <option value="">Seçiniz</option>
                                <option value="rate">Oran</option>
                                <option value="amount">Sabit tutar</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {row.commissionKind === 'rate' ? 'Oran (%) *' : row.commissionKind === 'amount' ? 'Tutar *' : 'Tutar / oran *'}
                              </label>
                              <input
                                required
                                type="number"
                                step="any"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                value={row.commissionValue}
                                onChange={(e) => setDegreeCommissionRows(prev => prev.map((r, i) => i === idx ? { ...r, commissionValue: e.target.value } : r))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Bonus Min</label>
                              <input
                                type="number"
                                step="any"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                value={row.bonusMin}
                                onChange={(e) => setDegreeCommissionRows(prev => prev.map((r, i) => i === idx ? { ...r, bonusMin: e.target.value } : r))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Bonus Max</label>
                              <input
                                type="number"
                                step="any"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                value={row.bonusMax}
                                onChange={(e) => setDegreeCommissionRows(prev => prev.map((r, i) => i === idx ? { ...r, bonusMax: e.target.value } : r))}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setDegreeCommissionRows(prev => prev.filter((_, i) => i !== idx))}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                              title={t.delete}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Main: list only when not viewing and not in form */}
      {!detailUni && !modalMode && (
        <>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.universitiesTitle}</h2>
          <p className="text-gray-500">{t.universities}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SavedQuickFilters
              pageKey="universities"
              userId={currentUser?.id}
              getFilters={() => ({ searchQuery })}
              onApply={(f) => {
                setSearchQuery(typeof f.searchQuery === 'string' ? f.searchQuery : '');
              }}
            />
          {/* Search + View toggle */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t.searchUniversities}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                title={t.treeView}
              >
                <List size={16} /> <span className="hidden sm:inline">{t.treeView}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                title={t.kanbanView}
              >
                <LayoutGrid size={16} /> <span className="hidden sm:inline">{t.kanbanView}</span>
              </button>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors">
                <span>{uploading ? t.loading : t.import}</span>
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                className="flex items-center bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <span>Export Excel</span>
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={20} /><span>{t.addUniversity}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── List (Tree or Kanban) ── */}
        <div className="w-full">
          {viewMode === 'kanban' && (
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredUniversities.map(uni => {
            const isSelected = detailUni?.id === uni.id;
            const progCount = uniPrograms(uni.id).length;
            return (
              <div
                key={uni.id}
                onClick={() => setDetailUni(isSelected ? null : uni)}
                className={`bg-white rounded-xl border p-5 flex flex-col h-full cursor-pointer transition-all duration-200 group
                  ${isSelected
                    ? 'border-blue-400 shadow-md ring-2 ring-blue-200'
                    : 'border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <LogoBox uni={uni} size="sm" />
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${uni.country === 'Turkey' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                      {getCountryLabel(uni.country)}
                    </span>
                    {uni.city && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                        {uni.city}
                      </span>
                    )}
                    {/* Action buttons – visible on hover */}
                    {canManage && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={e => openEdit(uni, e)} title={t.edit}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(uni.id); }} title={t.delete}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-800 mb-1">{uni.name}</h3>
                <p className="text-gray-500 text-xs mb-3 line-clamp-2 flex-1">{uni.description}</p>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <a href={uni.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[65%]">
                    <Globe size={12} /><span className="truncate">{uni.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    {progCount} {t.programs}
                  </span>
                </div>
              </div>
            );
          })}
              {filteredUniversities.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-400">
                  <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
                  <p>{searchQuery.trim() ? t.searchNoResults : t.noUniversities}</p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'tree' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
              {Object.keys(byCountry).length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
                  <p>{searchQuery.trim() ? t.searchNoResults : t.noUniversities}</p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-[auto_1fr_100px_100px_1fr_auto_80px] md:grid-cols-[auto_1fr_120px_120px_minmax(140px,1fr)_auto_80px] gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-900 uppercase tracking-wider min-w-[640px]">
                    <span className="w-10" />
                    <SortHeader colKey="name" label={t.universityName} />
                    <SortHeader colKey="country" label={t.universityCountry} />
                    <SortHeader colKey="city" label={t.city} />
                    <SortHeader colKey="website" label={t.universityWebsite} />
                    <span className="text-right"><SortHeader colKey="programs" label={t.programs} /></span>
                    <span />
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {Object.entries(byCountry).map(([country, list]) => (
                      <li key={country}>
                        <div className="px-4 py-2 bg-gray-50/80 text-xs font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-100">
                          {getCountryLabel(country)}
                        </div>
                        <ul className="divide-y divide-gray-50">
                          {list.map(uni => {
                            const isSelected = detailUni?.id === uni.id;
                            const progCount = uniPrograms(uni.id).length;
                            return (
                              <li key={uni.id}>
                                <div
                                  onClick={() => setDetailUni(isSelected ? null : uni)}
                                  className={`grid grid-cols-[auto_1fr_100px_100px_1fr_auto_80px] md:grid-cols-[auto_1fr_120px_120px_minmax(140px,1fr)_auto_80px] gap-3 items-center px-4 py-3 cursor-pointer transition-colors min-w-[640px] ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}
                                >
                                  <LogoBox uni={uni} size="sm" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{uni.name}</p>
                                  </div>
                                  <span className="text-sm text-gray-900 truncate">{getCountryLabel(uni.country)}</span>
                                  <span className="text-sm text-gray-900 truncate">{uni.city || '—'}</span>
                                  <a
                                    href={uni.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-sm text-gray-900 hover:underline truncate"
                                  >
                                    {uni.website.replace(/^https?:\/\//, '')}
                                  </a>
                                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium text-right">
                                    {progCount}
                                  </span>
                                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    {canManage && (
                                      <>
                                        <button onClick={e => openEdit(uni, e)} title={t.edit} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                                          <Pencil size={14} />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(uni.id); }} title={t.delete} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                                          <Trash2 size={14} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
        </>
      )}

      {/* ══════════ Delete Confirm ══════════ */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t.confirmDelete}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-1">
              <span className="font-semibold text-gray-700">{universities.find(u => u.id === confirmDeleteId)?.name}</span>
            </p>
            <p className="text-gray-400 text-xs mb-6">{t.deleteUniversityConfirmMessage}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{t.cancel}</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">{t.delete}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};