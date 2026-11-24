import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';
import { complaintService } from '../../services/complaintService';
import { useToast } from '../../context/ToastContext';
import { Sun, Moon, RotateCcw, ShieldCheck, Database, Sliders } from 'lucide-react';

export const AdminSettings = ({ onResetData }) => {
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const handleReset = () => {
    if (window.confirm('Reset all demo complaints and audit trail back to initial sample state?')) {
      complaintService.resetDemoData();
      addToast('Demo database restored to default seed state.', 'success');
      if (onResetData) onResetData();
    }
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

      {/* Demo storage control */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Demo Storage & Mock Data Controls
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          JanSetu AI runs entirely on local mock data with localStorage persistence during this demonstration phase.
          You can restore default sample complaints, clustering benchmarks, and authorities at any time.
        </p>

        <div className="pt-2">
          <Button
            variant="danger"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reset Demo Data to Initial Seeds
          </Button>
        </div>
      </div>

      {/* Architecture and Disclaimer */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Civic-Tech Demonstration Notice
        </h3>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            • <strong>Independent Platform:</strong> JanSetu AI is an independent community intelligence system and not an official government grievance redressal portal.
          </p>
          <p>
            • <strong>No Real Credentials:</strong> In this phase, authentication and backend APIs are simulated in the client layer to demonstrate full UI/UX flows.
          </p>
          <p>
            • <strong>AI Clustering:</strong> Authority recommendations and similarity scores represent proof-of-concept AI classification models for civic empowerment.
          </p>
        </div>
      </div>
    </div>
  );
};
