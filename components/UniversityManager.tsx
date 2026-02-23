import React, { useState, useRef, useEffect } from 'react';
import { University, Program, User, UserRole } from '../types';
import {
  Plus, Globe, Sparkles, X, Image, Pencil, Trash2,
  BookOpen, Clock, DollarSign, Calendar, ChevronLeft,
  MapPin, ExternalLink, GraduationCap, Search, LayoutGrid, List
} from 'lucide-react';
import { generateUniversityDescription } from '../services/geminiService';
import { useTranslation } from '../hooks/useTranslation';

interface UniversityManagerProps {
  universities: University[];
  programs: Program[];
  onAddUniversity: (uni: University) => void;
  onEditUniversity: (uni: University) => void;
  onDeleteUniversity: (id: string) => void;
  currentUser?: User | null;
}

const EMPTY_FORM: Partial<University> = {
  name: '', website: '', country: 'Turkey', city: '', description: '', logo: undefined
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

export const UniversityManager: React.FC<UniversityManagerProps> = ({
  universities, programs,
  onAddUniversity, onEditUniversity, onDeleteUniversity, currentUser
}) => {
  const { t, translateDegree, translateCategory } = useTranslation();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  /* -------- Modals & View State -------- */
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailUni, setDetailUni] = useState<University | null>(null); // inline detail form
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'kanban'>('kanban');

  /* -------- Form State -------- */
  const [formData, setFormData] = useState<Partial<University>>(EMPTY_FORM);
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
    setFormData(EMPTY_FORM); setLogoPreview(null); setLogoBase64(null);
    setEditingId(null); setModalMode('add');
  };
  const openEdit = (uni: University, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({ ...uni }); setLogoPreview(uni.logo || null); setLogoBase64(uni.logo || null);
    setEditingId(uni.id); setModalMode('edit');
  };
  const closeModal = () => {
    setModalMode(null); setEditingId(null); setFormData(EMPTY_FORM);
    setLogoPreview(null); setLogoBase64(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.website || !formData.country || !formData.description) return;
    const uniData: University = {
      id: editingId || Date.now().toString(),
      name: formData.name, website: formData.website,
      country: formData.country as 'Turkey' | 'Cyprus',
      city: formData.city || '',
      description: formData.description,
      logo: logoBase64 || undefined
    };
    if (modalMode === 'edit') {
      onEditUniversity(uniData);
      // update detail view if open
      if (detailUni?.id === uniData.id) setDetailUni(uniData);
    } else {
      onAddUniversity(uniData);
    }
    closeModal();
  };

  /* -------- Excel Import -------- */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData(); form.append('file', file);
    try {
      const res = await fetch('/api/universities/import', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        if (data.added && Array.isArray(data.added)) {
          data.added.forEach((u: any) => onAddUniversity({
            id: u.id, name: u.name, website: u.website,
            country: u.country, city: u.city, description: u.description, logo: u.logo || undefined
          }));
          alert(`${t.successAdd}: ${data.added.length} ${t.universities}`);
        } else { alert(data.message || t.successAdd); }
      } else { alert(data.message || t.errorAdd); }
    } catch { alert(t.errorConnection); }
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
  /* -------- Body Scroll Lock (only for modals) -------- */
  useEffect(() => {
    if (modalMode || confirmDeleteId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [modalMode, confirmDeleteId]);

  const uniPrograms = (uniId: string) => programs.filter(p => p.universityId === uniId);

  const filteredUniversities = universities.filter(uni =>
    !searchQuery.trim() || uni.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const byCountry = filteredUniversities.reduce<Record<string, University[]>>((acc, uni) => {
    const c = uni.country || 'Other';
    if (!acc[c]) acc[c] = [];
    acc[c].push(uni);
    return acc;
  }, {});

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

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.universitiesTitle}</h2>
          <p className="text-gray-500">{t.universities}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          {isAdmin && (
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors">
                <span>{uploading ? t.loading : t.import}</span>
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Plus size={20} /><span>{t.addUniversity}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── List + Detail (inline form, no popup) ── */}
      <div className="flex gap-6 flex-col lg:flex-row">

        {/* Left: Tree or Kanban list */}
        <div className={`${detailUni ? 'lg:w-1/2 xl:w-2/5' : 'w-full'} transition-all duration-200`}>
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
                      {uni.country}
                    </span>
                    {uni.city && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                        {uni.city}
                      </span>
                    )}
                    {/* Action buttons – visible on hover */}
                    {isAdmin && (
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
                  <div className="grid grid-cols-[auto_1fr_100px_100px_1fr_auto_80px] md:grid-cols-[auto_1fr_120px_120px_minmax(140px,1fr)_auto_80px] gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[640px]">
                    <span className="w-10" />
                    <span>{t.universityName}</span>
                    <span>{t.universityCountry}</span>
                    <span>{t.city}</span>
                    <span>{t.universityWebsite}</span>
                    <span className="text-right">{t.programs}</span>
                    <span />
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {Object.entries(byCountry).map(([country, list]) => (
                      <li key={country}>
                        <div className="px-4 py-2 bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          {country}
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
                                    <p className="font-medium text-gray-800 truncate">{uni.name}</p>
                                  </div>
                                  <span className="text-sm text-gray-600 truncate">{uni.country}</span>
                                  <span className="text-sm text-gray-600 truncate">{uni.city || '—'}</span>
                                  <a
                                    href={uni.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-sm text-blue-600 hover:underline truncate"
                                  >
                                    {uni.website.replace(/^https?:\/\//, '')}
                                  </a>
                                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium text-right">
                                    {progCount}
                                  </span>
                                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    {isAdmin && (
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

        {/* Right: Inline detail form (no popup) */}
        {detailUni && (
          <div className="lg:w-1/2 xl:w-3/5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <LogoBox uni={detailUni} size="sm" />
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{detailUni.name}</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <MapPin size={12} className="text-blue-500" />
                    <span>{detailUni.city ? `${detailUni.city}, ` : ''}{detailUni.country === 'Turkey' ? 'TURKEY' : 'CYPRUS'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailUni(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="h-32 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-xl flex items-end p-4">
                <a href={detailUni.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white border border-white/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white hover:text-blue-600 transition-all">
                  <Globe size={16} /> {t.visitOfficialWebsite}
                </a>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
                  <Sparkles size={20} className="text-blue-500" /> {t.overview}
                </h4>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{detailUni.description}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <GraduationCap size={22} className="text-purple-500" /> {t.programsAndFees}
                  </h4>
                  <span className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-xl text-xs font-semibold">
                    {uniPrograms(detailUni.id).length} {t.availableSpecialization}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uniPrograms(detailUni.id).map(prog => (
                    <div key={prog.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-semibold text-gray-800">{prog.name}</h5>
                          {prog.nameInArabic && (
                            <p className="text-sm text-gray-500 mt-0.5" dir="rtl">{prog.nameInArabic}</p>
                          )}
                          {prog.category && (
                            <p className="text-xs text-gray-400 mt-0.5">{translateCategory(prog.category)}</p>
                          )}
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
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  <button onClick={e => openEdit(detailUni, e)} className="flex items-center gap-2 bg-gray-900 text-white py-3 px-5 rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors">
                    <Pencil size={18} /> {t.editData}
                  </button>
                  <button onClick={() => setConfirmDeleteId(detailUni.id)} className="flex items-center gap-2 bg-red-50 text-red-600 py-3 px-5 rounded-xl font-semibold text-sm hover:bg-red-600 hover:text-white transition-colors">
                    <Trash2 size={18} /> {t.deleteRecord}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════ Add / Edit Modal ══════════ */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'edit' ? t.editUniversity : t.addUniversity}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityName}</label>
                <input type="text" required
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityCountry}</label>
                  <select className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value as any })}>
                    <option value="Turkey">{t.countryTurkey}</option>
                    <option value="Cyprus">{t.countryCyprus}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.city}</label>
                  <input type="text"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityWebsite}</label>
                  <input type="url" required
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                </div>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.universityLogoOptional}</label>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                {!logoPreview ? (
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <Image size={28} className="mb-1" />
                    <span className="text-sm">{t.clickToUploadLogo}</span>
                    <span className="text-xs text-gray-300 mt-1">{t.logoFormatHint}</span>
                  </button>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-3 flex items-center gap-3 bg-gray-50">
                    <img src={logoPreview} alt="" className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-white p-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{t.selectedLogo}</p>
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-blue-600 hover:underline">{t.changeLogo}</button>
                    </div>
                    <button type="button" onClick={handleRemoveLogo} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">{t.universityDescription}</label>
                  <button type="button" onClick={handleAiDescription} disabled={loadingAi || !formData.name}
                    className="text-xs flex items-center text-purple-600 hover:text-purple-800 disabled:opacity-50">
                    <Sparkles size={12} className="ml-1" />
                    {loadingAi ? t.loading : 'AI Generate'}
                  </button>
                </div>
                <textarea required rows={4}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t.cancel}</button>
                <button type="submit"
                  className={`px-4 py-2 text-white rounded-lg ${modalMode === 'edit' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
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