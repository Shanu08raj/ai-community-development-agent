import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  User,
  Shield,
  ChevronDown,
  Menu,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { useToast } from '../../context/ToastContext';

export const AdminTopNav = ({
  pageTitle,
  onOpenMobileSidebar,
  searchQuery,
  onSearchChange,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const demoNotifications = [
    {
      id: 1,
      title: 'New AI Cluster Formed',
      desc: 'Ward 12 water shortage complaints reached 35 reports threshold.',
      time: '12m ago',
      type: 'warning',
    },
    {
      id: 2,
      title: 'Citizen Status Acknowledged',
      desc: 'PWD response unit noted pothole JS-2026-8902.',
      time: '1h ago',
      type: 'info',
    },
    {
      id: 3,
      title: 'Resolution Verification',
      desc: 'Market dumpster clearance verified by ward inspector.',
      time: '3h ago',
      type: 'success',
    },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDemoLogout = () => {
    addToast('Logged out of demo session. Returning to login page.', 'info');
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-20 h-16 sm:h-20 bg-white dark:bg-[#151F32] border-b border-slate-200 dark:border-[#263449] flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Left title and mobile trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#172033] dark:text-[#F8FAFC]">
            {pageTitle}
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] hidden sm:block">
            JanSetu AI Civic Intelligence & Complaint Management
          </p>
        </div>
      </div>

      {/* Middle Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search complaints, IDs, wards, categories..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#0B1120] transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151F32] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#151F32]" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xl py-2 z-40 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-[#263449] flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Notifications (Demo)
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  3 New
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {demoNotifications.map((n) => (
                  <div key={n.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-start gap-2.5">
                      {n.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                      {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                      {n.type === 'info' && <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {n.desc}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {n.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
              AD
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200 leading-tight">
                Admin Demo
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                Supervisor
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xl py-2 z-40 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-[#263449]">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Demo Administrator
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  admin.demo@jansetu.local
                </p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    addToast('Administrator role: Demo Supervisor (Read/Write)', 'info');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Profile Details
                </button>
                <button
                  type="button"
                  onClick={handleDemoLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Exit Demo (Sign Out)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
