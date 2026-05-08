import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, Application, Program, University, User, UserRole } from '../types';
import { Users, FileText, School, TrendingUp, Filter } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { ApplicationStatus } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface DashboardProps {
  students: Student[];
  applications: Application[];
  programs: Program[];
  universities: University[];
  currentUser: User | null;
  universitiesCount: number;
  onOpenApplication?: (applicationId: string) => void;
  onOpenStudent?: (studentId: string) => void;
}

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };
  const label = value.length === 0
    ? placeholder
    : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? value[0]
      : `${value.length} secili`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
      >
        <span className={value.length === 0 ? 'text-gray-500' : 'text-gray-800'}>{label}</span>
        {value.length > 0 ? (
          <span onClick={clear} className="text-xs text-gray-500 hover:text-gray-700">Temizle</span>
        ) : (
          <span className="text-xs text-gray-400">▼</span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Secenek yok</div>
          ) : (
            options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span>{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function dateOnly(iso: string | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function getLast30DaysRange(): { from: string; to: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  applications,
  programs,
  universities,
  currentUser,
  universitiesCount,
  onOpenApplication,
  onOpenStudent
}) => {
  const { t, translateStatus } = useTranslation();
  const defaultRange = getLast30DaysRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [filterActive, setFilterActive] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [universityFilter, setUniversityFilter] = useState<string[]>([]);
  const [programFilter, setProgramFilter] = useState<string[]>([]);
  const [degreeFilter, setDegreeFilter] = useState<string[]>([]);

  const scopedApplications = useMemo(() => {
    if (currentUser?.role === UserRole.AGENT) {
      return applications.filter((app) => app.userId === currentUser.id);
    }
    return applications;
  }, [applications, currentUser]);

  const scopedStudents = useMemo(() => {
    if (currentUser?.role === UserRole.AGENT) {
      return students.filter((student) => student.userId === currentUser.id);
    }
    return students;
  }, [students, currentUser]);

  const filteredApplications = useMemo(() => {
    return scopedApplications.filter((app) => {
      const d = dateOnly(app.createdAt);
      if (filterActive && fromDate && toDate && (!d || d < fromDate || d > toDate)) return false;
      const program = programs.find((p) => p.id === app.programId);
      if (statusFilter.length > 0 && !statusFilter.includes(app.status)) return false;
      if (universityFilter.length > 0 && (!program || !universityFilter.includes(program.universityId))) return false;
      if (programFilter.length > 0 && !programFilter.includes(app.programId)) return false;
      if (degreeFilter.length > 0 && (!program || !degreeFilter.includes(program.degree))) return false;
      return true;
    });
  }, [scopedApplications, filterActive, fromDate, toDate, programs, statusFilter, universityFilter, programFilter, degreeFilter]);

  const filteredStudents = useMemo(() => {
    const from = fromDate;
    const to = toDate;
    return scopedStudents.filter((s) => {
      if (!filterActive || !fromDate || !toDate) return true;
      const d = dateOnly(s.createdAt);
      return d && d >= from && d <= to;
    });
  }, [scopedStudents, filterActive, fromDate, toDate]);

  const handleApply = () => {
    if (fromDate && toDate) setFilterActive(true);
  };
  const handleClearFilter = () => {
    const range = getLast30DaysRange();
    setFromDate(range.from);
    setToDate(range.to);
    setFilterActive(true);
    setStatusFilter([]);
    setUniversityFilter([]);
    setProgramFilter([]);
    setDegreeFilter([]);
  };

  // Helper to get program name (use full students list for name lookup)
  const getProgramName = (progId: string) => programs.find(p => p.id === progId)?.name || t.noPrograms;
  const getUniversityName = (uniId: string) => universities.find((u) => u.id === uniId)?.name || '—';
  const getStudentName = (studId: string) => {
    const s = students.find(std => std.id === studId);
    return s ? `${s.firstName} ${s.lastName}` : t.noStudents;
  };
  const programById = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  const uniqueDegrees = useMemo(() => {
    return Array.from(new Set(programs.map((p) => p.degree))).sort();
  }, [programs]);

  const statusStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      map.set(app.status, (map.get(app.status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, label: translateStatus(key as any), value }));
  }, [filteredApplications, translateStatus]);

  const universityStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const program = programById.get(app.programId);
      const uniName = program ? getUniversityName(program.universityId) : '—';
      map.set(uniName, (map.get(uniName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programById, universities]);

  const programStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const progName = getProgramName(app.programId);
      map.set(progName, (map.get(progName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programs]);

  const degreeStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const degree = programById.get(app.programId)?.degree || '—';
      map.set(degree, (map.get(degree) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programById]);

  const stats = [
    { label: t.totalStudents, value: filteredStudents.length, icon: Users, color: 'bg-blue-500' },
    { label: t.totalApplications, value: filteredApplications.length, icon: FileText, color: 'bg-emerald-500' },
    { label: t.totalUniversities, value: universitiesCount, icon: School, color: 'bg-purple-500' },
    { label: t.totalPrograms, value: programs.length, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{t.dashboardTitle}</h2>
          <p className="text-gray-500">{t.recentApplications}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">{t.fromDate}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">{t.toDate}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Filter size={16} />
            {t.applyFilter}
          </button>
          {filterActive && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t.clearFilter}
            </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <MultiSelect
            options={Object.values(ApplicationStatus).map((status) => ({
              value: status,
              label: translateStatus(status as any)
            }))}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder={t.applicationStatus}
          />
          <MultiSelect
            options={universities.map((u) => ({ value: u.id, label: u.name }))}
            value={universityFilter}
            onChange={setUniversityFilter}
            placeholder={t.universitiesTitle}
          />
          <MultiSelect
            options={programs
              .filter((p) => universityFilter.length === 0 || universityFilter.includes(p.universityId))
              .map((p) => ({ value: p.id, label: p.name }))}
            value={programFilter}
            onChange={setProgramFilter}
            placeholder={t.programsTitle}
          />
          <MultiSelect
            options={uniqueDegrees.map((d) => ({ value: d, label: d }))}
            value={degreeFilter}
            onChange={setDegreeFilter}
            placeholder={t.programDegree}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className={`p-4 rounded-lg text-white shrink-0 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t.byStatus}</h3>
          {statusStats.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noApplications}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusStats} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ label, value }) => `${label}: ${value}`}>
                  {statusStats.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t.byUniversity}</h3>
          {universityStats.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noApplications}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={universityStats} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t.byProgram}</h3>
          {programStats.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noApplications}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={programStats} layout="vertical" margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t.programDegree}</h3>
          {degreeStats.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noApplications}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={degreeStats} margin={{ top: 5, right: 12, left: 0, bottom: 24 }}>
                <XAxis dataKey="label" angle={-20} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:order-1">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">{t.recentApplications}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">{t.applicationDetails}</th>
                  <th className="px-6 py-3 font-medium">{t.dashboardStudentColumn}</th>
                  <th className="px-6 py-3 font-medium">{t.program}</th>
                  <th className="px-6 py-3 font-medium">{t.applicationStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...filteredApplications].reverse().map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">
                      {onOpenApplication ? (
                        <button
                          type="button"
                          onClick={() => onOpenApplication(app.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left font-mono"
                        >
                          {app.id.substring(0, 8)}...
                        </button>
                      ) : (
                        <>{app.id.substring(0, 8)}...</>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {onOpenStudent ? (
                        <button
                          type="button"
                          onClick={() => onOpenStudent(app.studentId)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                        >
                          {getStudentName(app.studentId)}
                        </button>
                      ) : (
                        getStudentName(app.studentId)
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{getProgramName(app.programId)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium 
                        ${app.status === ApplicationStatus.ACCEPTED || app.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          app.status === ApplicationStatus.REJECTED || app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'}`}>
                        {translateStatus(app.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredApplications.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">{t.noApplications}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Students */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:order-2">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800">{t.students}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">{t.userName}</th>
                  <th className="px-6 py-3 font-medium">{t.nationality}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.slice(-5).reverse().map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      {onOpenStudent ? (
                        <button
                          type="button"
                          onClick={() => onOpenStudent(student.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium"
                        >
                          {student.firstName} {student.lastName}
                        </button>
                      ) : (
                        <>{student.firstName} {student.lastName}</>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{student.nationality}</td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-400">{t.noStudents}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};