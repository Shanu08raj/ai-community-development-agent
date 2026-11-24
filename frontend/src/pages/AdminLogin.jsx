import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useToast } from '../context/ToastContext';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [email, setEmail] = useState('admin.demo@jansetu.local');
  const [password, setPassword] = useState('demo123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please provide an email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      addToast('Entering Admin Demonstration Environment.', 'info');
      navigate('/admin');
    }, 400);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    addToast('Demo Mode Notice: Real user credentials and password recovery are disabled in this prototype.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white dark:bg-[#0B1120] text-[#172033] dark:text-[#F8FAFC] transition-colors">
      {/* Top Bar with theme toggle & back */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Citizen Portal</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content: Two column on desktop */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-200 dark:border-[#263449] shadow-2xl bg-white dark:bg-[#151F32]">
          {/* Left Branding Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0645A5] to-[#164DAA] p-8 sm:p-10 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white text-[#0645A5] flex items-center justify-center font-bold shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-2xl font-extrabold tracking-tight">
                  JanSetu<span className="text-blue-200">AI</span>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                Civic Intelligence Supervision Portal
              </h2>

              <p className="text-xs sm:text-sm text-blue-100/90 mt-3 leading-relaxed">
                Supervisory dashboard for inspecting citizen reports, managing AI cluster groups, and recommending municipal dispatch.
              </p>
            </div>

            <div className="pt-8">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                <div className="text-[11px] font-semibold uppercase text-blue-200">
                  Tagline
                </div>
                <p className="text-xs italic text-white font-medium">
                  “Connecting citizens. Improving communities.”
                </p>
              </div>
            </div>
          </div>

          {/* Right Login Form Column */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Admin Login
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Access the administrative management and civic intelligence suite.
                </p>
              </div>

              {/* Demo Mode Notice Box */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-blue-900 dark:text-blue-200 block">
                    Demonstration Mode Active
                  </span>
                  Authentication is not enabled yet. Click <strong>Sign In</strong> below to directly explore the Admin Dashboard.
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@jansetu.local"
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-600 dark:text-slate-400">Remember demo session</span>
                  </label>

                  <a
                    href="#forgot"
                    onClick={handleForgotPassword}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Sign In to Dashboard
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-400">
        JanSetu AI Civic Platform • Demonstration Interface
      </footer>
    </div>
  );
};
