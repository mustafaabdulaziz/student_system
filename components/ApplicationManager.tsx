import React, { useState, useMemo, useEffect } from 'react';
import { Application, Student, Program, University, ApplicationStatus } from '../types';
import {
  Plus, Filter, FileText, CheckCircle, XCircle, AlertCircle,
  MessageSquare, ArrowRight, User as UserIcon, GraduationCap,
  Clock, Send, Upload, Paperclip, ChevronLeft, MapPin, Trash2
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface ApplicationManagerProps {
  applications: Application[];
  students: Student[];
  programs: Program[];
  universities: University[];
  onAddApplication: (app: Application, files?: FileList | null) => void;
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  initialStudentId?: string | null;
  clearInitialStudent?: () => void;
  targetApplicationId?: string | null;
  clearTargetApplication?: () => void;
  currentUser?: { role: string; name?: string; id?: string; email?: string };
}

export const ApplicationManager: React.FC<ApplicationManagerProps> = ({
  applications, students, programs, universities, onAddApplication, onUpdateStatus,
  initialStudentId, clearInitialStudent, targetApplicationId, clearTargetApplication, currentUser
}) => {
  const { t, translateStatus, translateDegree } = useTranslation();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [messages, setMessages] = React.useState<Array<{ id: string; sender: string; message: string; createdAt: string }>>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [detailFiles, setDetailFiles] = React.useState<Array<{ url: string; name: string; filename?: string }>>([]);
  const [attachFiles, setAttachFiles] = React.useState<FileList | null>(null);

  // Create Form State
  const [selectedStudent, setSelectedStudent] = useState('');


  const [filterDegree, setFilterDegree] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterUni, setFilterUni] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  // Derived filters
  const uniqueDegrees = useMemo(() => Array.from(new Set(programs.map(p => p.degree))), [programs]);

  const availablePrograms = useMemo(() => {
    return programs.filter(p => !filterDegree || p.degree === filterDegree);
  }, [programs, filterDegree]);

  const uniqueNames = useMemo(() => Array.from(new Set(availablePrograms.map(p => p.name))), [availablePrograms]);

  const availableLanguages = useMemo(() => {
    return availablePrograms
      .filter(p => !filterName || p.name === filterName)
      .map(p => p.language)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [availablePrograms, filterName]);

  const availableUnis = useMemo(() => {
    return availablePrograms
      .filter(p =>
        (!filterName || p.name === filterName) &&
        (!filterLang || p.language === filterLang)
      )
      .map(p => {
        const uni = universities.find(u => u.id === p.universityId);
        return uni ? { id: uni.id, name: uni.name } : null;
      })
      .filter(Boolean) as { id: string, name: string }[];
  }, [availablePrograms, filterName, filterLang, universities]);

  const finalProgramId = useMemo(() => {
    if (!filterUni || !filterName || !filterLang || !filterDegree) return null;
    return programs.find(p =>
      p.degree === filterDegree &&
      p.name === filterName &&
      p.language === filterLang &&
      p.universityId === filterUni
    )?.id;
  }, [filterDegree, filterName, filterLang, filterUni, programs]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent && finalProgramId) {
      await onAddApplication({
        id: Date.now().toString(),
        studentId: selectedStudent,
        programId: finalProgramId,
        status: ApplicationStatus.UNDER_REVIEW,
        semester: 'Fall 2024',
        createdAt: new Date().toISOString().split('T')[0],
        files: []
      }, files);
      setView('list');
      // Reset
      setSelectedStudent(''); setFilterDegree(''); setFilterName(''); setFilterLang(''); setFilterUni(''); setFiles(null);
    }
  };

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudent(initialStudentId);
      setView('create');
      if (typeof clearInitialStudent === 'function') clearInitialStudent();
    }
  }, [initialStudentId, clearInitialStudent]);

  useEffect(() => {
    if (targetApplicationId) {
      setSelectedAppId(targetApplicationId);
      setView('detail');
      if (typeof clearTargetApplication === 'function') clearTargetApplication();
    }
  }, [targetApplicationId, clearTargetApplication]);

  // Load messages when opening a detail view
  React.useEffect(() => {
    const loadMessages = async (appId?: string | null) => {
      if (!appId) return;
      try {
        const res = await fetch(`/api/applications/${appId}/messages`);
        const data = await res.json();
        if (res.ok) setMessages(data);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    if (view === 'detail' && selectedAppId) {
      loadMessages(selectedAppId);
      (async () => {
        try {
          const r = await fetch(`/api/applications/${selectedAppId}/files`);
          if (r.ok) {
            const list = await r.json();
            setDetailFiles(list.map((x: any) => ({ url: x.url, name: x.name || x.url.split('/').pop(), filename: x.filename })));
          } else { setDetailFiles([]); }
        } catch (e) {
          console.error('Failed to load application files', e);
          setDetailFiles([]);
        }
      })();
    }
  }, [view, selectedAppId]);

  // Helpers
  const getStudent = (id: string) => students.find(s => s.id === id);
  const getProgram = (id: string) => programs.find(p => p.id === id);
  const getUni = (id: string) => universities.find(u => u.id === id);

  const renderCreate = () => (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Plus className="text-blue-600" /> {t.addApplication}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-semibold mb-2 text-gray-700">1. {t.selectStudent}</label>
          <select
            required
            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="">{t.selectStudent}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} - {s.passportNumber}</option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50/50 p-6 rounded-2xl space-y-4 border border-blue-100">
          <label className="block font-semibold text-blue-900">2. {t.selectProgram}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programDegree}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                value={filterDegree}
                onChange={e => { setFilterDegree(e.target.value); setFilterName(''); setFilterLang(''); setFilterUni(''); }}
                required
              >
                <option value="">{t.selectDegree}</option>
                {uniqueDegrees.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programName}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterName}
                onChange={e => { setFilterName(e.target.value); setFilterLang(''); setFilterUni(''); }}
                disabled={!filterDegree}
                required
              >
                <option value="">{t.selectProgram}</option>
                {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programLanguage}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterLang}
                onChange={e => { setFilterLang(e.target.value); setFilterUni(''); }}
                disabled={!filterName}
                required
              >
                <option value="">{t.selectLanguage}</option>
                {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.universities}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterUni}
                onChange={e => setFilterUni(e.target.value)}
                disabled={!filterLang}
                required
              >
                <option value="">{t.selectUniversity}</option>
                {availableUnis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-2 text-gray-700">3. {t.files}</label>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
            <input
              type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFiles(e.target.files)}
              className="hidden" id="file-upload-create"
            />
            <label htmlFor="file-upload-create" className="cursor-pointer block">
              <Upload className="mx-auto mb-3 text-gray-400 group-hover:text-blue-500 transition-colors" size={32} />
              <span className="text-blue-600 font-bold group-hover:text-blue-800">
                {files && files.length > 0 ? `${files.length} ${t.files} - اختر لتغيير` : t.uploadFiles}
              </span>
              <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG (أقصى حجم 5MB للملف)</p>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">{t.cancel}</button>
          <button type="submit" disabled={!selectedStudent || !finalProgramId} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all active:scale-95">{t.save}</button>
        </div>
      </form>
    </div>
  );

  const renderDetail = () => {
    const app = applications.find(a => a.id === selectedAppId);
    if (!app) return null;

    const student = getStudent(app.studentId);
    const program = getProgram(app.programId);
    const university = program ? getUni(program.universityId) : null;

    const sendMessage = async () => {
      if (!newMessage.trim() || !selectedAppId) return;
      try {
        const senderRole = currentUser?.role || 'USER';
        const res = await fetch(`/api/applications/${selectedAppId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: senderRole, message: newMessage.trim() })
        });
        const data = await res.json();
        if (res.ok) {
          setMessages(prev => [...prev, { id: data.id, sender: senderRole, message: newMessage.trim(), createdAt: new Date().toISOString() }]);
          setNewMessage('');
        } else { alert(data.message || 'فشل إرسال الرسالة'); }
      } catch { alert('خطأ في الاتصال'); }
    };

    // --- Status Bar Steps ---
    const getStatusStep = (status: ApplicationStatus) => {
      if (status === ApplicationStatus.ACCEPTED) return 3;
      if (status === ApplicationStatus.REJECTED) return 3;
      if (status === ApplicationStatus.MISSING_DOCS) return 1;
      return 2; // Under Review
    };

    const currentStep = getStatusStep(app.status);
    const isError = app.status === ApplicationStatus.REJECTED || app.status === ApplicationStatus.MISSING_DOCS;

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom duration-500">
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold">
            <ChevronLeft size={20} />
            <span>{t.back}</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 font-mono text-sm">#{app.id}</span>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-500">{new Date(app.createdAt).toLocaleDateString('ar-EG')}</span>
          </div>
        </div>

        {/* 1. APP STATUS MANAGEMENT BAR (ERP Style) */}
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'USER') && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-2">
            {[
              { id: ApplicationStatus.MISSING_DOCS, label: t.missingDocs, icon: <AlertCircle size={16} />, activeColor: 'bg-orange-600 text-white', inactiveColor: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100' },
              { id: ApplicationStatus.UNDER_REVIEW, label: t.underReview, icon: <Clock size={16} />, activeColor: 'bg-blue-600 text-white', inactiveColor: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
              { id: ApplicationStatus.ACCEPTED, label: t.approved, icon: <CheckCircle size={16} />, activeColor: 'bg-green-600 text-white', inactiveColor: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' },
              { id: ApplicationStatus.REJECTED, label: t.rejected, icon: <XCircle size={16} />, activeColor: 'bg-red-600 text-white', inactiveColor: 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100' },
            ].map((btn) => {
              const isActive = app.status === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => onUpdateStatus(app.id, btn.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border
                    ${isActive ? btn.activeColor + ' border-transparent shadow-lg scale-105' : btn.inactiveColor + ' border-transparent opacity-60 hover:opacity-100'}
                  `}
                >
                  {btn.icon}
                  {btn.label}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Status Indicator for Agent/Student (non-admin) */}
        {!(currentUser?.role === 'ADMIN' || currentUser?.role === 'USER') && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <span className="text-gray-400 font-bold text-sm">حالة الطلب الحالية:</span>
            <span className={`px-6 py-2 rounded-xl text-sm font-bold shadow-sm border
              ${app.status === ApplicationStatus.ACCEPTED ? 'bg-green-50 text-green-700 border-green-100' :
                app.status === ApplicationStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-100' :
                  app.status === ApplicationStatus.MISSING_DOCS ? 'bg-orange-50 text-orange-700 border-orange-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'}`}>
              {translateStatus(app.status)}
            </span>
          </div>
        )}

        {/* 2. Top Info Cards: Student, Program & Agent (if Admin) */}
        <div className={`grid grid-cols-1 gap-6 ${currentUser?.role === 'ADMIN' && app.agentName ? 'lg:grid-cols-3 md:grid-cols-2' : 'md:grid-cols-2'}`}>
          {/* Student Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
              <UserIcon size={24} />
            </div>
            <div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t.studentInfo}</h3>
              <p className="text-xl font-bold text-gray-800 leading-tight">{student?.firstName} {student?.lastName}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-1"><MapPin size={14} /> {student?.nationality}</span>
                <span className="flex items-center gap-1 font-mono tracking-tighter"><FileText size={14} /> {student?.passportNumber}</span>
              </div>
            </div>
          </div>

          {/* Program Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="bg-purple-50 p-4 rounded-xl text-purple-600">
              <GraduationCap size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t.programsTitle}</h3>
              <p className="text-xl font-bold text-gray-800 truncate leading-tight">{program?.name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500 font-medium">
                <span className="text-blue-600 font-bold">{university?.name}</span>
                <span className="text-purple-500">{translateDegree(program?.degree || '')}</span>
                <span className="text-gray-700 font-bold">{program?.currency || 'USD'} {program?.fee?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          {/* Agent Card (Visible to Admin Only) */}
          {currentUser?.role === 'ADMIN' && app.agentName && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className="bg-orange-50 p-4 rounded-xl text-orange-600">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">{t.hostAgent}</h3>
                <p className="text-xl font-bold text-gray-800 leading-tight">{app.agentName}</p>
                <div className="flex gap-4 mt-2 text-sm text-orange-500 font-medium font-mono">
                  {app.agentPhone && <span className="flex items-center gap-1">{app.agentCountryCode || ''} {app.agentPhone}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Main Body: Chat (Wider) and Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* CHAT SECTION (70%) */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[600px]">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={20} />
                <h3 className="font-bold text-gray-800">{t.chat}</h3>
              </div>
              {/* WhatsApp Helper */}
              {app.agentPhone && currentUser?.id !== app.userId ? (
                <a
                  href={`https://wa.me/${(app.agentCountryCode || '').replace('+', '')}${app.agentPhone}?text=${encodeURIComponent(`السلام عليكم، بخصوص الطلب رقم #${app.id}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-green-600 hover:text-green-700 bg-green-50 px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-green-100"
                >
                  <MessageSquare size={14} />
                  <span>{t.whatsappAgent}</span>
                </a>
              ) : (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`تفاصيل الطلب #${app.id}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-gray-500 hover:text-green-600 bg-gray-50 px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-gray-100"
                >
                  <MessageSquare size={14} />
                  <span>رفع للواتساب</span>
                </a>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                  <MessageSquare size={48} className="opacity-10" />
                  <p className="text-sm">{t.noMessages}</p>
                </div>
              ) : (
                messages.map(m => {
                  const isAdmin = m.sender === 'ADMIN';
                  const isUser = m.sender === 'USER'; // Student owner / Agent
                  return (
                    <div key={m.id} className={`flex w-full ${isAdmin ? 'justify-end' : isUser ? 'justify-center font-bold' : 'justify-start'}`}>
                      <div className={`max-w-[80%] flex flex-col ${isAdmin ? 'items-end' : isUser ? 'items-center' : 'items-start'}`}>
                        {/* Meta */}
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-blue-400' : isUser ? 'text-orange-400' : 'text-gray-400'}`}>
                            {isAdmin ? 'System Admin' : isUser ? 'Applicant' : 'Counselor'}
                          </span>
                          <span className="text-[10px] text-gray-300">{new Date(m.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {/* Bubble */}
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm text-sm break-words leading-relaxed
                            ${isAdmin
                              ? 'bg-blue-600 text-white rounded-br-none shadow-blue-100'
                              : isUser
                                ? 'bg-orange-50 text-orange-900 border border-orange-100 rounded-2xl text-center italic'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}
                          dir="auto"
                        >
                          {m.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex gap-2 items-center bg-gray-50 p-1 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  className="flex-1 bg-transparent p-3 outline-none text-sm placeholder:text-gray-400"
                  placeholder={t.typeMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 transition-all active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* SIDEBAR: Files & Status Actions (30%) */}
          <div className="w-full lg:w-[320px] space-y-6">
            {/* 1. Files Area */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip size={18} className="text-gray-400" />
                <h4 className="font-bold text-gray-800 text-sm">{t.files}</h4>
              </div>

              {detailFiles.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {detailFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all group">
                      <a
                        href={f.url} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center gap-3 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:border-blue-100 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2 text-right">
                          <p className="text-[11px] font-bold text-gray-700 truncate" dir="ltr">{f.name}</p>
                          <span className="text-[9px] text-gray-400 uppercase">View File</span>
                        </div>
                      </a>
                      {f.filename && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            if (!window.confirm(t.confirmDelete)) return;
                            try {
                              const r = await fetch(`/api/applications/${selectedAppId}/files/${f.filename}`, { method: 'DELETE' });
                              if (r.ok) {
                                setDetailFiles(prev => prev.filter(file => file.filename !== f.filename));
                              } else {
                                const data = await r.json();
                                alert(data.message || t.errorDelete);
                              }
                            } catch (err) {
                              alert(t.errorConnection);
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                          title={t.delete}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl mb-4">
                  <FileText className="mx-auto opacity-10 mb-2" size={32} />
                  <p className="text-xs text-gray-400">لا يوجد مرفقات</p>
                </div>
              )}

              {/* Upload Subsection */}
              <div className="space-y-2">
                <input
                  type="file" id="attach-files-det" multiple accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden" onChange={e => setAttachFiles(e.target.files)}
                />
                <label
                  htmlFor="attach-files-det"
                  className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all"
                >
                  <span className="text-[11px] font-bold text-blue-600">
                    {attachFiles && attachFiles.length > 0
                      ? `${attachFiles.length} ملفات تم اختيارها`
                      : "إرفاق ملفات إضافية"
                    }
                  </span>
                </label>
                <button
                  onClick={async () => {
                    if (!attachFiles || !selectedAppId) return;
                    const fd = new FormData();
                    Array.from(attachFiles as FileList).forEach(f => fd.append('files', f));
                    try {
                      const r = await fetch(`/api/applications/${selectedAppId}/files`, { method: 'POST', body: fd });
                      const data = await r.json();
                      if (r.ok) {
                        setDetailFiles(data.files.map((x: any) => ({ url: x.url, name: x.name || x.url.split('/').pop(), filename: x.filename })));
                        setAttachFiles(null);
                        const inp = document.getElementById('attach-files-det') as HTMLInputElement;
                        if (inp) inp.value = '';
                      } else { alert(data.message || 'فشل الرفع'); }
                    } catch { alert(t.errorConnection); }
                  }}
                  disabled={!attachFiles}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:grayscale"
                >
                  <span className="flex items-center justify-center gap-2"><Upload size={14} /> رفع الآن</span>
                </button>
              </div>
            </div>

            {/* Sidebar reserved for files and chat summary if needed */}
          </div >
        </div >
      </div >
    );
  };

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <div className="animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t.applicationsTitle}</h2>
              <p className="text-gray-400 font-medium">مراقبة وإدارة ملفات القبول الجامعي</p>
            </div>
            <button
              onClick={() => setView('create')}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 font-bold active:scale-95"
            >
              <Plus size={22} strokeWidth={3} />
              <span>{t.addApplication}</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-6 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/50 text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">رقم الطلب</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">{t.studentInfo}</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">{t.programsTitle}</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider">التحديث</th>
                  <th className="px-6 py-5 font-bold uppercase tracking-wider text-center">{t.applicationStatus}</th>
                  <th className="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map((app) => {
                  const s = getStudent(app.studentId);
                  const p = getProgram(app.programId);
                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                      onClick={() => { setSelectedAppId(app.id); setView('detail'); }}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-gray-400 group-hover:text-blue-600 transition-colors">#{app.id}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800">{s?.firstName} {s?.lastName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-700">{p?.name}</span>
                          <span className="text-[10px] text-gray-400">{getUni(p?.universityId || '')?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-medium">{new Date(app.createdAt).toLocaleDateString('ar-EG')}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold ring-1
                            ${app.status === ApplicationStatus.ACCEPTED ? 'bg-green-50 text-green-700 ring-green-100' :
                              app.status === ApplicationStatus.REJECTED ? 'bg-red-50 text-red-700 ring-red-100' :
                                app.status === ApplicationStatus.MISSING_DOCS ? 'bg-orange-50 text-orange-700 ring-orange-100' :
                                  'bg-blue-50 text-blue-700 ring-blue-100'}`}>
                            {translateStatus(app.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <ArrowRight size={18} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {applications.length === 0 && (
              <div className="py-20 text-center">
                <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                <p className="text-gray-400 font-medium">لم يتم العثور على أي طلبات في النظام</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'create' && renderCreate()}
      {view === 'detail' && renderDetail()}
    </div>
  );
};