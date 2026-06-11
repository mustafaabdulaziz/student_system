import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface AccountProfileProps {
  currentUser: User | null;
  onProfileUpdated?: (user: User) => void;
}

export const AccountProfile: React.FC<AccountProfileProps> = ({ currentUser, onProfileUpdated }) => {
  const { t } = useTranslation();
  const [accountData, setAccountData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: '',
    phone: currentUser?.phone || '',
    countryCode: currentUser?.countryCode || ''
  });

  useEffect(() => {
    if (currentUser) {
      setAccountData(prev => ({
        ...prev,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '',
        countryCode: currentUser.countryCode || ''
      }));
    }
  }, [currentUser?.id, currentUser?.name, currentUser?.email, currentUser?.phone, currentUser?.countryCode]);

  if (!currentUser) {
    return <div className="bg-white rounded-xl p-8 text-center text-gray-500">{t.loginError}</div>;
  }

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, string> = {
        user_id: currentUser.id,
        name: accountData.name.trim(),
        email: accountData.email.trim()
      };
      if (accountData.password) payload.password = accountData.password;
      if (accountData.phone !== undefined) payload.phone = accountData.phone;
      if (accountData.countryCode !== undefined) payload.countryCode = accountData.countryCode;
      const res = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user && onProfileUpdated) {
          onProfileUpdated(data.user);
        }
        alert(data.message || t.save);
        setAccountData(prev => ({ ...prev, password: '' }));
      } else {
        alert(data.message || t.errorConnection);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{t.account}</h2>
      <form onSubmit={handleAccountSave} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.userName}</label>
            <input
              type="text"
              required
              value={accountData.name}
              onChange={e => setAccountData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
            <input
              type="email"
              required
              value={accountData.email}
              onChange={e => setAccountData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.countryCode}</label>
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
  );
};
