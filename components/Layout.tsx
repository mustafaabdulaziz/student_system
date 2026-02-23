import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  School,
  BookOpen,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  UserCircle
} from 'lucide-react';
import { User } from '../types';
import { NotificationDropdown } from './NotificationDropdown';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onNavigateToApp?: (appId: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activePage,
  onNavigate,
  onNavigateToApp,
  currentUser,
  onLogout
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { t, dir } = useLanguage();
  const contentRef = useRef<HTMLDivElement>(null);

  // التمرير للأعلى عند تغيير الصفحة
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activePage, children]);

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'universities', label: t.universities, icon: School },
    { id: 'programs', label: t.programs, icon: BookOpen },
    { id: 'students', label: t.students, icon: Users },
    { id: 'applications', label: t.applications, icon: FileText },
    { id: 'account', label: t.account, icon: UserCircle },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir={dir}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-400">{t.appName}</h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors duration-200
                  ${activePage === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center space-x-3 space-x-reverse mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold">
                {currentUser?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{currentUser?.name}</p>
                <p className="text-xs text-slate-400">{currentUser?.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center space-x-2 space-x-reverse px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-4 space-x-reverse">
            <LanguageSwitcher />
            {currentUser && (
              <NotificationDropdown
                currentUserId={currentUser.id}
                onNavigate={(page, appId) => {
                  if (appId && onNavigateToApp) {
                    onNavigateToApp(appId);
                  } else {
                    onNavigate(page);
                  }
                }}
              />
            )}
          </div>
        </header>

        <div ref={contentRef} className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};