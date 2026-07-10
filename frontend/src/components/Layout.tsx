import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard, Bed, Cpu, UserRound, Bell, History,
  LogOut, Sun, Moon, Menu, X, ChevronRight, User, RefreshCw,
  Calendar, Building, Users, Settings, FileText
} from 'lucide-react';

interface NotificationItem {
  _id: string; title: string; message: string;
  isRead: boolean; type: string; createdAt: string;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export const Layout: React.FC = () => {
  const { user, logout, activeDoctor, activeNurse, selectDoctor, selectNurse } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState<boolean>(() =>
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  // List of profiles for selection
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Sync theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Fetch notifications
  const fetchNotifs = async () => {
    if (!user) return;
    try { setNotifications(await api.get('/notifications')); } catch {}
  };
  
  // Fetch profiles (Doctors or Nurses) for selection
  const fetchProfiles = async () => {
    if (!user || (user.role !== 'Doctor' && user.role !== 'Nurse')) return;
    try {
      setLoadingProfiles(true);
      const allUsers = await api.get('/auth/users');
      // Filter based on logged-in role
      const filtered = allUsers.filter((u: any) => u.role === user.role);
      setProfiles(filtered);
    } catch (err) {
      console.error('Error fetching sub-profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 15000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (user && (user.role === 'Doctor' || user.role === 'Nurse')) {
      fetchProfiles();
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(p => p.map(n => ({ ...n, isRead: true })));
    } catch {}
  };
  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Define dynamic navItems based on active role
  const getNavItems = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'Super Admin':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard }
        ];
      case 'Hospital Admin':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'Beds', path: '/beds', icon: Bed },
          { name: 'Equipment', path: '/equipment', icon: Cpu },
          { name: 'Patients Intake', path: '/patients', icon: UserRound },
          { name: 'Audit Logs', path: '/audit-logs', icon: History }
        ];
      case 'Doctor':
        return [
          { name: 'Workstation', path: '/', icon: LayoutDashboard },
          { name: 'EMR Patients', path: '/patients', icon: UserRound },
          { name: 'Report', path: '/reports', icon: FileText }
        ];
      case 'Nurse':
        return [
          { name: 'Nursing Station', path: '/', icon: LayoutDashboard },
          { name: 'Patients', path: '/patients', icon: UserRound },
          { name: 'Report', path: '/reports', icon: FileText }
        ];
      case 'Reception Staff':
        return [
          { name: 'Billing Counter', path: '/', icon: LayoutDashboard }
        ];
      default:
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard }
        ];
    }
  };

  const navItems = getNavItems();
  const unread = notifications.filter(n => !n.isRead).length;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Active display name and avatar initials based on selection
  const getActiveDisplayName = () => {
    if (user?.role === 'Doctor' && activeDoctor) return activeDoctor.name;
    if (user?.role === 'Nurse' && activeNurse) return activeNurse.name;
    return user?.name || 'User';
  };

  const getActiveInitials = () => {
    const name = getActiveDisplayName();
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  // Profile Selector View Overlay
  if (user && user.role === 'Doctor' && !activeDoctor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-2xl p-6 shadow-xl animate-fade-up">
          <div className="text-center mb-6">
            <User className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Doctor Workstation</h2>
            <p className="text-sm text-gray-500 mt-1">Select your physician profile to continue</p>
          </div>

          {loadingProfiles ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 text-gray-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {profiles.map(doc => (
                <button
                  key={doc._id}
                  onClick={() => selectDoctor(doc as any)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] text-left transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{doc.name}</p>
                    <p className="text-xs text-gray-450 dark:text-gray-500">{doc.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full mt-6 py-2.5 rounded-lg border border-red-200 text-red-650 dark:border-red-950/40 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (user && user.role === 'Nurse' && !activeNurse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-2xl p-6 shadow-xl animate-fade-up">
          <div className="text-center mb-6">
            <User className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nursing Care Station</h2>
            <p className="text-sm text-gray-500 mt-1">Select your nurse profile to continue</p>
          </div>

          {loadingProfiles ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 text-gray-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {profiles.map(nr => (
                <button
                  key={nr._id}
                  onClick={() => selectNurse(nr as any)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] text-left transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{nr.name}</p>
                    <p className="text-xs text-gray-450 dark:text-gray-500">{nr.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full mt-6 py-2.5 rounded-lg border border-red-200 text-red-650 dark:border-red-950/40 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  const SidebarNav = () => (
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
      {navItems.map(item => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#1f1f1f] dark:hover:text-gray-100'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-200">

      {/* SIDEBAR — DESKTOP */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-[#0d0d0d] border-r border-gray-200 dark:border-[#1f1f1f] shrink-0">
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100 dark:border-[#1f1f1f] shrink-0 justify-between">
          <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight">CuraFlow</span>
          {(user?.role === 'Doctor' || user?.role === 'Nurse') && (
            <button
              onClick={() => {
                if (user.role === 'Doctor') selectDoctor(null);
                if (user.role === 'Nurse') selectNurse(null);
              }}
              className="text-[10px] border border-gray-200 dark:border-[#262626] rounded px-1.5 py-0.5 text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
              title="Change Station"
            >
              Switch
            </button>
          )}
        </div>

        <SidebarNav />

        {/* User footer */}
        <div className="p-3 border-t border-gray-100 dark:border-[#1f1f1f] shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-[10px] font-bold shrink-0">
              {getActiveInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{getActiveDisplayName()}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] dark:hover:text-gray-200 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/30 dark:bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-60 bg-white dark:bg-[#0d0d0d] border-r border-gray-200 dark:border-[#1f1f1f] animate-slide-in">
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 dark:border-[#1f1f1f] shrink-0">
              <span className="font-bold text-gray-900 dark:text-white">CuraFlow</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav />
            <div className="p-3 border-t border-gray-100 dark:border-[#1f1f1f] shrink-0">
              <div className="flex items-center gap-2.5 p-2">
                <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-[10px] font-bold">
                  {getActiveInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{getActiveDisplayName()}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user?.role}</p>
                </div>
                <button onClick={handleLogout} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOPBAR */}
        <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-[#1f1f1f] shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1 md:hidden rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate max-w-[200px] sm:max-w-xs">
              {user?.hospital?.name || 'Central Administration'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Switch overlay helper link */}
            {(user?.role === 'Doctor' || user?.role === 'Nurse') && (
              <button
                onClick={() => {
                  if (user.role === 'Doctor') selectDoctor(null);
                  if (user.role === 'Nurse') selectNurse(null);
                }}
                className="hidden sm:inline-flex items-center text-xs font-semibold px-2 py-1 rounded border border-gray-200 dark:border-[#262626] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] transition-all"
              >
                Switch Profile
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#1f1f1f] dark:hover:text-gray-200 transition-colors"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#1f1f1f] dark:hover:text-gray-200 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                    {unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-10 z-30 w-80 bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] rounded-xl shadow-lg overflow-hidden animate-fade-up">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1f1f1f]">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
                      <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-[#1f1f1f]">
                      {notifications.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-6">No notifications</p>
                      ) : notifications.map(n => (
                        <div
                          key={n._id}
                          onClick={() => markRead(n._id)}
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors ${!n.isRead ? 'bg-gray-50 dark:bg-[#1a1a1a]' : ''}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-[#333]'}`} />
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'}`}>{n.title}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Role badge */}
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300">
              {user?.role}
            </span>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 bg-gray-50 dark:bg-[#0a0a0a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default Layout;
