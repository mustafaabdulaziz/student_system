import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Plus, Trash } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface UserManagerProps {
  users: User[];
  currentUser: User | null;
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ users, currentUser, onAddUser, onDeleteUser }) => {
  const { t, translateRole } = useTranslation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.USER,
    phone: '',
    countryCode: ''
  });

  const [accountData, setAccountData] = useState({
    password: '',
    phone: currentUser?.phone || '',
    countryCode: currentUser?.countryCode || ''
  });

  if (!currentUser) {
    return <div className="bg-white rounded-xl p-8 text-center text-gray-500">{t.loginError}</div>;
  }

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { user_id: currentUser.id };
      if (accountData.password) payload.password = accountData.password;
      if (accountData.phone) payload.phone = accountData.phone;
      if (accountData.countryCode) payload.countryCode = accountData.countryCode;
      const res = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || t.success);
        setAccountData({ ...accountData, password: '' }); // clear password field
      } else {
        alert(data.message || t.errorConnection);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.password && formData.role) {
      onAddUser({
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as UserRole,
        phone: formData.phone || undefined,
        countryCode: formData.countryCode || undefined
      } as any);
      setModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: UserRole.USER, phone: '', countryCode: '' });
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Personal Account Section (Visible to ALL) */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{t.account}</h2>
        <form onSubmit={handleAccountSave} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.userName}</label>
              <input type="text" readOnly value={currentUser.name} className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
              <input type="email" readOnly value={currentUser.email} className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">رمز الدولة</label>
              <input type="text" placeholder="+966" value={accountData.countryCode} onChange={e => setAccountData({ ...accountData, countryCode: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
              <input type="text" placeholder="512345678" value={accountData.phone} onChange={e => setAccountData({ ...accountData, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.password} ({t.optional})</label>
            <input type="password" value={accountData.password} onChange={e => setAccountData({ ...accountData, password: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" placeholder={t.optional} />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{t.save}</button>
          </div>
        </form>
      </div>

      {/* 2. User Management Section (Visible only to ADMIN) */}
      {currentUser.role === UserRole.ADMIN && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-t pt-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t.usersTitle}</h2>
              <p className="text-gray-500">{t.usersTitle}</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center space-x-2 space-x-reverse bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={20} />
              <span>{t.addUser}</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">{t.userName}</th>
                  <th className="px-6 py-4 font-medium">{t.email}</th>
                  <th className="px-6 py-4 font-medium">{t.userRole}</th>
                  <th className="px-6 py-4 font-medium">{t.phone}</th>
                  <th className="px-6 py-4 font-medium">{t.applicationDetails}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-blue-600">
                      {translateRole(user.role)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.countryCode ? `${user.countryCode} ${user.phone || ''}` : (user.phone || '')}</td>
                    <td className="px-6 py-4">
                      {user.id !== currentUser.id && (
                        <button onClick={() => onDeleteUser(user.id)} className="text-red-600 hover:text-red-800">
                          <Trash size={18} /> {t.rejected}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">{t.noUsers}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal (Only for Admin) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{t.addUser}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.userName}</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                <input
                  type="email"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
                <input
                  type="password"
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.userRole}</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.USER}>{t.user}</option>
                  <option value={UserRole.ADMIN}>{t.admin}</option>
                  <option value={UserRole.AGENT}>{t.agent}</option>
                </select>
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">رمز الدولة</label>
                  <input type="text" placeholder="+966" className="w-full border border-gray-300 rounded-lg p-2" value={formData.countryCode} onChange={e => setFormData({ ...formData, countryCode: e.target.value })} />
                </div>
                <div className="w-2/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone} ({t.optional})</label>
                  <input type="text" placeholder="512345678" className="w-full border border-gray-300 rounded-lg p-2" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
