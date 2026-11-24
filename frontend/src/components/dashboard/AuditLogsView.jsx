import { complaintService } from '../../services/complaintService';
import { ScrollText, User } from 'lucide-react';

export const AuditLogsView = () => {
  const logs = complaintService.getAuditLogs();

  return (
    <div className="bg-white dark:bg-[#151F32] rounded-2xl border border-slate-200 dark:border-[#263449] shadow-xs overflow-hidden transition-colors">
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#263449]">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Administrative Audit Trail
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Immutable demo record of status alterations, supervisory notes, and cluster dispatches
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#263449] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Log ID</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target Complaint</th>
              <th className="py-3 px-4">Status Transition</th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Supervisory Note</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                    {log.id}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {log.complaintId}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="text-slate-400">{log.previousStatus}</span>
                    <span className="mx-1 text-slate-300 dark:text-slate-600">→</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.newStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {log.adminUser}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {log.note || 'No notes appended.'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No audit logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
