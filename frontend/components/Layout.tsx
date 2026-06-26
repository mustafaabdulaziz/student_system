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
  UserCircle,
  UserCog,
  CalendarRange,
  BarChart2,
  Newspaper,
  HandCoins,
  Building2,
  Settings
} from 'lucide-react';
import { User, UserRole } from '../types';
import { NotificationDropdown } from './NotificationDropdown';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onNavigateToApp?: (appId: string) => void;
  onNavigateToStudent?: (studentId: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activePage,
  onNavigate,
  onNavigateToApp,
  onNavigateToStudent,
  currentUser,
  onLogout
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const { t, dir } = useLanguage();
  const contentRef = useRef<HTMLDivElement>(null);

  // التمرير للأعلى عند تغيير الصفحة
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activePage, children]);

  const mainNavItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'programs', label: t.programs, icon: BookOpen },
    { id: 'students', label: t.students, icon: Users },
    { id: 'applications', label: t.applications, icon: FileText },
    { id: 'universities', label: t.universities, icon: School },
    { id: 'news', label: t.newsAndUpdates, icon: Newspaper }
  ];

  const settingsSubItems =
    currentUser?.role === UserRole.ADMIN
      ? [
          { id: 'users', label: t.usersTitle, icon: UserCog },
          { id: 'periods', label: t.period, icon: CalendarRange },
          { id: 'agency-companies', label: 'Aracı Firma Listesi', icon: Building2 },
          { id: 'payment-sources', label: 'Ödeme Kaynağı Listesi', icon: Building2 }
        ]
      : [];

  const paymentsSubItems =
    currentUser?.role === UserRole.ADMIN
      ? [
          { id: 'incoming-payments', label: 'Gelen Ödemeler', icon: HandCoins },
          { id: 'outgoing-payments', label: 'Giden Ödemeler', icon: HandCoins },
          { id: 'payment-dashboard', label: 'Ödeme Panosu', icon: BarChart2 }
        ]
      : [];

  const isSettingsPage =
    activePage === 'users' ||
    activePage === 'periods' ||
    activePage === 'agency-companies' ||
    activePage === 'payment-sources';
  const isPaymentsPage = activePage === 'incoming-payments' || activePage === 'outgoing-payments' || activePage === 'payment-dashboard';

  useEffect(() => {
    if (currentUser?.role !== UserRole.ADMIN) {
      setSettingsOpen(false);
      return;
    }
    if (isSettingsPage) {
      setSettingsOpen(true);
    }
  }, [activePage, currentUser?.role, isSettingsPage]);

  useEffect(() => {
    if (currentUser?.role !== UserRole.ADMIN) {
      setPaymentsOpen(false);
      return;
    }
    if (isPaymentsPage) {
      setPaymentsOpen(true);
    }
  }, [activePage, currentUser?.role, isPaymentsPage]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir={dir}>
      <style>{`
        .layout-sidebar-nav::-webkit-scrollbar { display: none; }
        .layout-sidebar-nav { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="h-full flex flex-col min-h-0">
          <div className="p-6 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                {(() => {
                  const parts = (t.appName || '').split(/\s+/);
                  const first = parts[0] || '';
                  const rest = parts.slice(1).join(' ') || '';
                  return (
                    <>
                      <span className="text-red-500">{first}</span>
                      {rest && <span className="text-blue-400"> {rest}</span>}
                    </>
                  );
                })()}
              </h1>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
          </div>

          <nav className="layout-sidebar-nav flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-2">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-1.5 px-3 py-3 rounded-lg transition-colors duration-200
                  ${activePage === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} className="flex-shrink-0 w-5 h-5" />
                <span className="font-medium text-left">{item.label}</span>
              </button>
            ))}

            {paymentsSubItems.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentsOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between gap-1.5 px-3 py-3 rounded-lg ${
                    paymentsSubItems.some((subItem) => subItem.id === activePage)
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <HandCoins size={20} className="flex-shrink-0 w-5 h-5" />
                    <span className="font-medium text-left">Ödemeler</span>
                  </span>
                  <span className="text-xs">{paymentsOpen ? '▾' : '▸'}</span>
                </button>

                {paymentsOpen && (
                  <div className="mt-1 space-y-1">
                    {paymentsSubItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => {
                          onNavigate(subItem.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors duration-200 ${
                          activePage === subItem.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <subItem.icon size={18} className="flex-shrink-0 w-4 h-4 ms-5" />
                        <span className="font-medium text-left text-sm">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {settingsSubItems.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between gap-1.5 px-3 py-3 rounded-lg ${
                    settingsSubItems.some((item) => item.id === activePage)
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Settings size={20} className="flex-shrink-0 w-5 h-5" />
                    <span className="font-medium text-left">Ayarlar</span>
                  </span>
                  <span className="text-xs">{settingsOpen ? '▾' : '▸'}</span>
                </button>

                {settingsOpen && (
                  <div className="mt-1 space-y-1">
                    {settingsSubItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors duration-200 ${
                          activePage === item.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <item.icon size={18} className="flex-shrink-0 w-4 h-4 ms-5" />
                        <span className="font-medium text-left text-sm">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                onNavigate('account');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-1.5 px-3 py-3 rounded-lg transition-colors duration-200
                ${activePage === 'account'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <UserCircle size={20} className="flex-shrink-0 w-5 h-5" />
              <span className="font-medium text-left">{t.account}</span>
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold flex-shrink-0">
                {currentUser?.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-slate-400 truncate" title={currentUser?.email}>{currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg transition-colors"
            >
              <LogOut size={18} className="flex-shrink-0" />
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
                onNavigate={(page, entityId) => {
                  if (page === 'applications' && entityId && onNavigateToApp) {
                    onNavigateToApp(entityId);
                  } else if (page === 'students' && entityId && onNavigateToStudent) {
                    onNavigateToStudent(entityId);
                  } else {
                    onNavigate(page);
                  }
                }}
                onViewAll={() => onNavigate('notifications')}
              />
            )}
          </div>
        </header>

        <div id="app-scroll-container" ref={contentRef} className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};