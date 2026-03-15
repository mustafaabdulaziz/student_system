import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Plus, Trash2, Pencil, UserX, UserCheck } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface UserManagementPageProps {
  users: User[];
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
  role: UserRole.USER as UserRole,
  phone: '',
  countryCode: ''
};

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  users,
  currentUser,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onSetUserActive
}) => {
  const { t, translateRole } = useTranslation();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return <div className="p-8 text-center text-gray-500">{t.noUsers}</div>;
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.password) {
      onAddUser({
        id: '',
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined,
        countryCode: formData.countryCode || undefined
      });
      setAddModalOpen(false);
      setFormData(EMPTY_FORM);
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role as UserRole,
      phone: user.phone || '',
      countryCode: user.countryCode || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && formData.name && formData.email) {
      const payload: User & { password?: string } = {
        ...editingUser,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        phone: formData.phone || undefined,
        countryCode: formData.countryCode || undefined
      };
      if (formData.password) payload.password = formData.password;
      onEditUser(payload);
      setEditModalOpen(false);
      setEditingUser(null);
      setFormData(EMPTY_FORM);
    }
  };

  const toggleActive = (user: User) => {
    const next = !(user.active !== false);
    onSetUserActive(user.id, next);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.usersTitle}</h2>
          <p className="text-gray-500">{t.users}</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          <span>{t.addUser}</span>
        </button>
      </div>

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

      {/* Add User Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{t.addUser}</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.userName}</label>
                <input type="text" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input type="email" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
                <input type="password" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.userRole}</label>
                <select className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                  <option value={UserRole.USER}>{t.user}</option>
                  <option value={UserRole.ADMIN}>{t.admin}</option>
                  <option value={UserRole.AGENT}>{t.agent}</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.countryCode}</label>
                  <input type="text" placeholder="+966" className="w-full border border-gray-300 rounded-lg p-2" value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone} ({t.optional})</label>
                  <input type="text" placeholder="512345678" className="w-full border border-gray-300 rounded-lg p-2" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{t.editUser}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.userName}</label>
                <input type="text" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input type="email" required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.newPassword} ({t.optional})</label>
                <input type="password" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={t.optional} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.userRole}</label>
                <select className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                  <option value={UserRole.USER}>{t.user}</option>
                  <option value={UserRole.ADMIN}>{t.admin}</option>
                  <option value={UserRole.AGENT}>{t.agent}</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.countryCode}</label>
                  <input type="text" placeholder="+966" className="w-full border border-gray-300 rounded-lg p-2" value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                  <input type="text" placeholder="512345678" className="w-full border border-gray-300 rounded-lg p-2" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setEditModalOpen(false); setEditingUser(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t.save}</button>
              </div>
            </form>
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
