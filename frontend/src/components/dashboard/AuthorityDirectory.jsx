import React, { useEffect, useState } from 'react';
import { complaintService } from '../../services/complaintService';
import { Building2, Phone, Mail, Clock, ShieldAlert, Search, AlertCircle } from 'lucide-react';

export const AuthorityDirectory = ({ onAuthError }) => {
  const [authorities, setAuthorities] = useState([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadAuthorities() {
      setIsLoading(true);
      setError('');
      try {
        const list = await complaintService.getAuthorities();
        if (active) setAuthorities(list);
      } catch (err) {
        if (!active) return;
        if (onAuthError && onAuthError(err)) return;
        setError(err.message || 'Unable to load authority directory.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadAuthorities();
    return () => {
      active = false;
    };
  }, [onAuthError]);

  const filtered = authorities.filter(
    (a) =>
      a.name.toLowerCase().includes(filter.toLowerCase()) ||
      a.department.toLowerCase().includes(filter.toLowerCase()) ||
      a.jurisdiction.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Civic Authority Directory
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Department directory used by AI mapping to suggest appropriate civic jurisdiction
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search departments..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            <strong>Advisory Notice:</strong> JanSetu AI recommends local civic authorities for administrative triage only. It does not claim live government integration or automatically forward tickets.
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-[#263449]" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((auth) => (
            <div
              key={auth.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                    {auth.department}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{auth.id}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>{auth.name}</span>
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Jurisdiction: <span className="text-slate-700 dark:text-slate-200 font-medium">{auth.jurisdiction}</span>
                </p>

                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 dark:border-[#263449] pt-3">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{auth.contactPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{auth.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{auth.officeHours}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-xs">
                <span className="text-slate-400">Avg Response: {auth.responseTimeAvg}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {auth.activeIssuesCount} Active Clusters
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#263449] text-center text-xs text-slate-500">
          No matching civic authorities found.
        </div>
      )}
    </div>
  );
};
