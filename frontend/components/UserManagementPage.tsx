import React, { useState } from 'react';
import { User, UserRole, University, AgentCommission } from '../types';
import { Plus, Trash2, Pencil, UserX, UserCheck, ChevronLeft, FileEdit, ReceiptText, Printer } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { formatExpenseTypeDisplay, formatOutgoingPaymentDisplay } from '../constants/outgoingPayment';

interface UserManagementPageProps {
  users: User[];
  universities: University[];
  currentUser: User | null;
  onAddUser: (user: User & { password?: string }) => void;
  onEditUser: (user: User & { password?: string }) => void;
  onDeleteUser: (id: string) => void;
  onSetUserActive: (id: string, active: boolean) => void;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: UserRole.USER as UserRole,
  phone: '',
  countryCode: ''
};

const EMPTY_COMMISSION_ROW: AgentCommission = {
  universityId: '',
  degree: '',
  commissionKind: 'rate',
  commissionValue: 0,
  depositSupport: null
};

type StatementDebt = {
  applicationId: string;
  studentName?: string | null;
  universityName?: string | null;
  date?: string | null;
  amount: number;
  currency?: string | null;
};

type StatementPayment = {
  id: string;
  sequenceNumber?: number;
  date?: string | null;
  amount: number;
  currency?: string | null;
  paymentType?: string | null;
  paymentReason?: string | null;
  expenseType?: string | null;
  description1?: string | null;
};

type StatementData = {
  user: { id: string; name: string; email: string };
  debts: StatementDebt[];
  payments: StatementPayment[];
  totalDebt: number;
  totalPayments: number;
  balance: number;
};

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  users,
  universities,
  currentUser,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onSetUserActive
}) => {
  const { t, translateRole, translateDegree } = useTranslation();
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [agentCommissions, setAgentCommissions] = useState<AgentCommission[]>([]);
  const [formEditable, setFormEditable] = useState(true);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const commissionRowKey = (row: Pick<AgentCommission, 'universityId' | 'degree'>) =>
    `${row.universityId}::${row.degree || ''}`;

  const hasDuplicateCommission = (rows: AgentCommission[]) => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.universityId) continue;
      const key = commissionRowKey(row);
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  };

  const updateCommissionRow = (idx: number, patch: Partial<AgentCommission>) => {
    setAgentCommissions(prev => {
      const next = prev.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      const updated = next[idx];
      if (updated?.universityId) {
        const key = commissionRowKey(updated);
        const duplicate = next.some((r, i) => i !== idx && r.universityId && commissionRowKey(r) === key);
        if (duplicate) {
          alert(t.agentCommissionDuplicate);
          return prev;
        }
      }
      return next;
    });
  };

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return <div className="p-8 text-center text-gray-500">{t.noUsers}</div>;
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.password) {
      if (formData.role === UserRole.AGENT) {
        const incomplete = agentCommissions.some(r => r.universityId || Number(r.commissionValue))
          && agentCommissions.some(r => !(r.universityId && Number.isFinite(Number(r.commissionValue))));
        if (incomplete) {
          alert('Üniversite komisyon satırlarında üniversite ve tutar/oran zorunludur.');
          return;
        }
        if (hasDuplicateCommission(agentCommissions)) {
          alert(t.agentCommissionDuplicate);
          return;
        }
      }
      onAddUser({
        id: '',
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined,
        countryCode: formData.countryCode || undefined,
        ...(formData.role === UserRole.AGENT ? { agentCommissions: agentCommissions.filter(r => r.universityId && Number.isFinite(Number(r.commissionValue))) } : {})
      });
      setFormEditable(true);
      setFormData(EMPTY_FORM);
      setAgentCommissions([]);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role as UserRole,
      phone: user.phone || '',
      countryCode: user.countryCode || ''
    });
    setAgentCommissions(
      (user.agentCommissions && user.agentCommissions.length > 0
        ? user.agentCommissions
        : []
      ).map((r) => ({
        universityId: r.universityId,
        degree: r.degree || '',
        commissionKind: r.commissionKind,
        commissionValue: r.commissionValue,
        depositSupport: r.depositSupport ?? null
      }))
    );
    setFormMode('edit');
    setFormEditable(false);
    setStatement(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && formData.name && formData.email) {
      if (formData.password && formData.password !== formData.confirmPassword) {
        alert(t.passwordMismatch);
        return;
      }
      if (formData.role === UserRole.AGENT) {
        const incomplete = agentCommissions.some(r => r.universityId || Number(r.commissionValue))
          && agentCommissions.some(r => !(r.universityId && Number.isFinite(Number(r.commissionValue))));
        if (incomplete) {
          alert('Üniversite komisyon satırlarında üniversite ve tutar/oran zorunludur.');
          return;
        }
        if (hasDuplicateCommission(agentCommissions)) {
          alert(t.agentCommissionDuplicate);
          return;
        }
      }
      const payload: User & { password?: string } = {
        ...editingUser,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        phone: formData.phone || undefined,
        countryCode: formData.countryCode || undefined,
        ...(formData.role === UserRole.AGENT ? { agentCommissions: agentCommissions.filter(r => r.universityId && Number.isFinite(Number(r.commissionValue))) } : { agentCommissions: [] })
      };
      if (formData.password) payload.password = formData.password;
      onEditUser(payload);
      setEditingUser(payload);
      setFormData({
        name: payload.name,
        email: payload.email,
        password: '',
        confirmPassword: '',
        role: payload.role as UserRole,
        phone: payload.phone || '',
        countryCode: payload.countryCode || ''
      });
      setFormEditable(false);
    }
  };

  const startAdd = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setAgentCommissions([]);
    setFormMode('add');
    setFormEditable(true);
  };

  const cancelForm = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setAgentCommissions([]);
    setFormMode(null);
    setFormEditable(true);
    setStatement(null);
  };

  const toggleActive = (user: User) => {
    const next = !(user.active !== false);
    onSetUserActive(user.id, next);
  };

  const loadStatement = async () => {
    if (!editingUser) return;
    setStatementLoading(true);
    try {
      const role = (currentUser?.role || '').toString().toUpperCase();
      const res = await fetch(`/api/users/${editingUser.id}/statement?role=${encodeURIComponent(role)}`);
      const data = await res.json();
      if (res.ok) setStatement(data);
      else alert(data.message || 'Hesap ekstresi alınamadı');
    } catch {
      alert('Connection error');
    } finally {
      setStatementLoading(false);
    }
  };

  const printStatement = () => {
    if (!statement) return;
    const debtsRows = statement.debts.map(d => `<tr><td>${d.applicationId || '-'}</td><td>${d.studentName || '-'}</td><td>${d.universityName || '-'}</td><td>${d.date || '-'}</td><td>${d.amount.toFixed(2)} ${d.currency || 'USD'}</td></tr>`).join('');
    const paymentsRows = statement.payments.map(p => {
      const sebep = formatOutgoingPaymentDisplay(p.paymentReason);
      const masraf = formatExpenseTypeDisplay(p.expenseType);
      return `<tr><td>${p.sequenceNumber ?? '-'}</td><td>${p.date || '-'}</td><td>${sebep}</td><td>${masraf}</td><td>${p.amount.toFixed(2)} ${p.currency || 'USD'}</td></tr>`;
    }).join('');
    const html = `
      <html><head><title>Hesap Ekstresi</title>
      <style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}h2,h3{margin:8px 0}</style>
      </head><body>
      <h2>Hesap Ekstresi</h2>
      <p><b>Kullanıcı:</b> ${statement.user.name} (${statement.user.email})</p>
      <h3>Borçlar (Odeme hak etti = true)</h3>
      <table><thead><tr><th>Basvuru</th><th>Ogrenci</th><th>Universite</th><th>Tarih</th><th>Tutar</th></tr></thead><tbody>${debtsRows || '<tr><td colspan="5">Kayit yok</td></tr>'}</tbody></table>
      <h3>Odemeler (Giden Odemeler)</h3>
      <table><thead><tr><th>No</th><th>Tarih</th><th>Odeme Sebebi</th><th>Masraf Tipi</th><th>Tutar</th></tr></thead><tbody>${paymentsRows || '<tr><td colspan="5">Kayit yok</td></tr>'}</tbody></table>
      <p><b>Toplam Borc:</b> ${statement.totalDebt.toFixed(2)}</p>
      <p><b>Toplam Odeme:</b> ${statement.totalPayments.toFixed(2)}</p>
      <p><b>Bakiye:</b> ${statement.balance.toFixed(2)}</p>
      <script>window.print();</script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.usersTitle}</h2>
          <p className="text-gray-500">{t.users}</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          <span>{t.addUser}</span>
        </button>
      </div>

      {formMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelForm}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                title="Tree view'e dön"
              >
                <ChevronLeft size={16} />
                <span>Geri</span>
              </button>
              <h3 className="text-xl font-bold">{formMode === 'add' ? t.addUser : t.editUser}</h3>
            </div>
            {formMode === 'edit' && !formEditable && (
              <div className="flex items-center gap-2">
                {editingUser?.role === UserRole.AGENT && (
                  <button
                    type="button"
                    onClick={loadStatement}
                    disabled={statementLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <ReceiptText size={16} />
                    <span>Hesap Ekstresi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFormEditable(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <FileEdit size={16} />
                  <span>{t.edit}</span>
                </button>
              </div>
            )}
          </div>
          <form onSubmit={formMode === 'add' ? handleAddSubmit : handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.userName}</label>
              <input type="text" required disabled={!formEditable} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-600" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
              <input type="email" required disabled={!formEditable} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-600" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            {formMode === 'add' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
                <input type="password" required disabled={!formEditable} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-600" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-4">
                <h4 className="font-semibold text-gray-800">{t.changePassword}</h4>
                <p className="text-xs text-gray-500">{t.optional} — {t.newPassword.toLowerCase()}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.newPassword}</label>
                    <input
                      type="password"
                      disabled={!formEditable}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-600"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t.optional}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.confirmPassword}</label>
                    <input
                      type="password"
                      disabled={!formEditable}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-600"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder={t.optional}
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.userRole}</label>
              <select disabled={!formEditable} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-600" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                <option value={UserRole.USER}>{t.user}</option>
                <option value={UserRole.OPERATOR}>{t.operator}</option>
                <option value={UserRole.ADMIN}>{t.admin}</option>
                <option value={UserRole.AGENT}>{t.agent}</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.countryCode}</label>
                <input type="text" disabled={!formEditable} placeholder="+966" className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-600" value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone} {formMode === 'add' ? `(${t.optional})` : ''}</label>
                <input type="text" disabled={!formEditable} placeholder="512345678" className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-600" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            {formData.role === UserRole.AGENT && (
              <div className="rounded-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800">Üniversite Komisyonları</h4>
                  <button
                    type="button"
                    onClick={() => setAgentCommissions(prev => [...prev, { ...EMPTY_COMMISSION_ROW }])}
                    disabled={!formEditable}
                    className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Satır Ekle
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Üniversite</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Derece</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Komisyon Tipi</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Tutar / Oran</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Depozito Desteği</th>
                        <th className="px-3 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {agentCommissions.map((row, idx) => (
                        <tr key={`${row.universityId}-${row.degree}-${idx}`}>
                          <td className="px-3 py-2">
                            <select
                              value={row.universityId}
                              onChange={(e) => updateCommissionRow(idx, { universityId: e.target.value })}
                              disabled={!formEditable}
                              required
                              className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-600"
                            >
                              <option value="">Seç</option>
                              {universities.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.degree || ''}
                              onChange={(e) => updateCommissionRow(idx, { degree: e.target.value as AgentCommission['degree'] })}
                              disabled={!formEditable}
                              className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-600"
                            >
                              <option value="">Tümü / Seçilmedi</option>
                              <option value="Diploma">{translateDegree('Diploma')}</option>
                              <option value="Bachelor">{translateDegree('Bachelor')}</option>
                              <option value="Master">{translateDegree('Master')}</option>
                              <option value="PhD">{translateDegree('PhD')}</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.commissionKind}
                              onChange={(e) => updateCommissionRow(idx, { commissionKind: e.target.value as 'rate' | 'amount' })}
                              disabled={!formEditable}
                              required
                              className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-600"
                            >
                              <option value="rate">Oran (%)</option>
                              <option value="amount">Sabit Tutar</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="any"
                              value={row.commissionValue}
                              onChange={(e) => updateCommissionRow(idx, { commissionValue: Number(e.target.value) })}
                              disabled={!formEditable}
                              className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-600"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.depositSupport ?? ''}
                              onChange={(e) => updateCommissionRow(idx, {
                                depositSupport: e.target.value === '' ? null : Number(e.target.value)
                              })}
                              disabled={!formEditable}
                              placeholder="Sabit tutar"
                              className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-50 disabled:text-gray-600"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setAgentCommissions(prev => prev.filter((_, i) => i !== idx))}
                              disabled={!formEditable}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                              title={t.delete}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {agentCommissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-gray-500">Komisyon satırı ekleyin.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {formEditable && (
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={cancelForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t.save}</button>
              </div>
            )}
          </form>
        </div>
      )}

      {statement && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Hesap Ekstresi</h3>
              <p className="text-sm text-gray-500">{statement.user.name} - {statement.user.email}</p>
            </div>
            <button
              type="button"
              onClick={printStatement}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900"
            >
              <Printer size={16} />
              <span>PDF Al</span>
            </button>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Borçlar (Ödemeyi hak etti = true)</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Başvuru</th>
                    <th className="px-3 py-2 text-left">Öğrenci</th>
                    <th className="px-3 py-2 text-left">Üniversite</th>
                    <th className="px-3 py-2 text-left">Tarih</th>
                    <th className="px-3 py-2 text-left">Borç Tutarı</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.debts.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-3 text-center text-gray-500">Kayıt yok</td></tr>
                  ) : statement.debts.map(d => (
                    <tr key={`${d.applicationId}-${d.date}`} className="border-t border-gray-100">
                      <td className="px-3 py-2">{d.applicationId}</td>
                      <td className="px-3 py-2">{d.studentName || '—'}</td>
                      <td className="px-3 py-2">{d.universityName || '—'}</td>
                      <td className="px-3 py-2">{d.date || '—'}</td>
                      <td className="px-3 py-2">{Number(d.amount).toFixed(2)} {d.currency || 'USD'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Ödemeler (Giden ödemeler)</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">No</th>
                    <th className="px-3 py-2 text-left">Tarih</th>
                    <th className="px-3 py-2 text-left">Ödeme sebebi</th>
                    <th className="px-3 py-2 text-left">Masraf tipi</th>
                    <th className="px-3 py-2 text-left">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.payments.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-3 text-center text-gray-500">Kayıt yok</td></tr>
                  ) : statement.payments.map(p => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{p.sequenceNumber ?? '—'}</td>
                      <td className="px-3 py-2">{p.date || '—'}</td>
                      <td className="px-3 py-2">{formatOutgoingPaymentDisplay(p.paymentReason)}</td>
                      <td className="px-3 py-2">{formatExpenseTypeDisplay(p.expenseType)}</td>
                      <td className="px-3 py-2">{Number(p.amount).toFixed(2)} {p.currency || 'USD'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-200"><p className="text-xs text-gray-500">Toplam Borç</p><p className="font-bold text-gray-900">{statement.totalDebt.toFixed(2)}</p></div>
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-200"><p className="text-xs text-gray-500">Toplam Ödeme</p><p className="font-bold text-gray-900">{statement.totalPayments.toFixed(2)}</p></div>
            <div className="rounded-lg bg-gray-50 p-3 border border-gray-200"><p className="text-xs text-gray-500">Bakiye</p><p className="font-bold text-gray-900">{statement.balance.toFixed(2)}</p></div>
          </div>
        </div>
      )}

      {!formMode && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-left">{t.userName}</th>
                  <th className="px-6 py-4 font-bold text-left">{t.email}</th>
                  <th className="px-6 py-4 font-bold text-left">{t.userRole}</th>
                  <th className="px-6 py-4 font-bold text-left">{t.phone}</th>
                  <th className="px-6 py-4 font-bold text-left">{t.active}</th>
                  <th className="px-6 py-4 font-bold text-center">{t.edit}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-gray-900">{translateRole(user.role)}</td>
                    <td className="px-6 py-4 text-gray-900">{user.countryCode ? `${user.countryCode} ${user.phone || ''}` : (user.phone || '—')}</td>
                    <td className="px-6 py-4">
                      {user.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${user.active !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                          title={user.active !== false ? t.inactive : t.active}
                        >
                          {user.active !== false ? <UserCheck size={14} /> : <UserX size={14} />}
                          {user.active !== false ? t.active : t.inactive}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                          title={t.edit}
                        >
                          <Pencil size={16} />
                        </button>
                        {user.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(user.id)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                            title={t.delete}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">{t.noUsers}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t.confirmDelete}</h3>
            <p className="text-gray-600 text-sm mb-4">{users.find(u => u.id === confirmDeleteId)?.name}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t.cancel}</button>
              <button onClick={() => { confirmDeleteId && onDeleteUser(confirmDeleteId); setConfirmDeleteId(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
