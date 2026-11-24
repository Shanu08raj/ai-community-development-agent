import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  PlusCircle,
  Search,
  Users,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSelector } from '../common/LanguageSelector';
import { Button } from '../common/Button';

export const CitizenNavbar = ({ onOpenSubmitModal, onOpenTrackModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#263449] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#164DAA] to-[#2563EB] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#172033] dark:text-[#F8FAFC]">
                  JanSetu<span className="text-[#2563EB] dark:text-[#60A5FA]">AI</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  Civic-Tech
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] hidden sm:block leading-none mt-0.5">
                Connecting citizens. Improving communities.
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              onClick={() => scrollToSection('hero')}
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={onOpenSubmitModal}
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Report a Problem</span>
            </button>
            <button
              onClick={onOpenTrackModal}
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Track Complaint</span>
            </button>
            <button
              onClick={() => scrollToSection('community-issues')}
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Community Issues</span>
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              How It Works
            </button>
          </nav>

          {/* Right utility items */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            <ThemeToggle />

            <Link
              to="/admin/login"
              className="hidden sm:inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Lock className="w-3.5 h-3.5 text-slate-500" />}
                className="text-xs"
              >
                Admin Login
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111827] px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2">
          <button
            onClick={() => scrollToSection('hero')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenSubmitModal();
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Report a Problem
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTrackModal();
            }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Track Complaint
          </button>
          <button
            onClick={() => scrollToSection('community-issues')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Community Issues
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            How It Works
          </button>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <Link
              to="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              Admin Login (Demo)
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
