import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { Sun, Moon, RefreshCw, ShieldCheck, Database, Sliders } from 'lucide-react';

export const AdminSettings = ({ onRefreshData }) => {
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const handleRefresh = () => {
    if (onRefreshData) onRefreshData();
    addToast('Synchronized live dashboard metrics from backend.', 'success');
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Theme and appearance */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Interface Preferences
        </h3>

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Application Theme
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current mode: <strong className="capitalize">{theme}</strong>. Persisted in localStorage.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            leftIcon={theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          >
            Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </div>

      {/* Live backend & AI data sync */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Backend Persistence & AI Sync
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          JanSetu AI persists all citizen reports, bcrypt-hashed tracking tokens, clusters, and immutable audit logs in MongoDB Atlas while delegating advisory triage to the Python FastAPI LangGraph microservice.
        </p>

        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Live Dashboard Data
          </Button>
        </div>
      </div>

      {/* Architecture and Disclaimer */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Civic-Tech Governance Principles
        </h3>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            • <strong>Independent Platform:</strong> JanSetu AI is an independent civic-tech community intelligence platform and not an official government grievance portal.
          </p>
          <p>
            • <strong>Human-in-the-Loop Control:</strong> AI category, priority, cluster, and authority recommendations remain strictly advisory. Official status changes require explicit human administrator approval.
          </p>
          <p>
            • <strong>Privacy Safeguards:</strong> Citizen tracking credentials use separate public Reference IDs and bcrypt-hashed secret tracking codes.
          </p>
        </div>
      </div>
    </div>
  );
};
