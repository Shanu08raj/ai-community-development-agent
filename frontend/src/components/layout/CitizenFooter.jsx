import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Heart, AlertTriangle } from 'lucide-react';

export const CitizenFooter = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 dark:bg-[#070D18] border-t border-slate-800 pt-14 pb-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                JanSetu<span className="text-blue-400">AI</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              An AI-powered community issue intelligence platform connecting citizens,
              uncovering recurring neighborhood challenges through intelligent clustering,
              and facilitating public civic accountability.
            </p>
            {/* Disclaimer box */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 flex items-start gap-2.5 max-w-md">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Civic-Tech Notice:</span> JanSetu AI is an independent community intelligence demonstration platform. It is not an official government grievance portal, and complaints are managed for demonstration purposes.
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#hero" className="hover:text-blue-400 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#community-issues" className="hover:text-blue-400 transition-colors">
                  Community Issues
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-blue-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#statistics" className="hover:text-blue-400 transition-colors">
                  Civic Statistics
                </a>
              </li>
            </ul>
          </div>

          {/* Transparency & Admin */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">
              Governance & Admin
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <span className="text-slate-400">Privacy-First Architecture</span>
              </li>
              <li>
                <span className="text-slate-400">Zero Public PII Exposure</span>
              </li>
              <li>
                <span className="text-slate-400">AI Cluster Verification</span>
              </li>
              <li className="pt-2">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors text-xs font-medium border border-blue-500/30"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Admin Demonstration Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 JanSetu AI. Independent Civic Technology Platform.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-slate-400">
              Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for community impact
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
