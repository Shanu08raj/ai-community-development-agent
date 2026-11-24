import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Users, MapPin, Building2, Cpu, Calendar } from 'lucide-react';

export const CommunityIssueCard = ({ issue }) => {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top meta tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {issue.category}
            </span>
            <PriorityBadge priority={issue.priority} size="sm" />
          </div>
          <StatusBadge status={issue.status} size="sm" />
        </div>

        {/* Title */}
        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {issue.title}
        </h4>

        {/* Summary */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed line-clamp-2">
          {issue.summary}
        </p>

        {/* Impact cluster info */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-100 dark:border-[#263449] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Related Citizen Reports:
            </span>
            <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">
              {issue.relatedReportsCount} citizens
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Impact Ward:
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {issue.area}
            </span>
          </div>

          {issue.recommendedAuthority && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                Authority:
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                {issue.recommendedAuthority}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer with AI score & date */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
          <Cpu className="w-3.5 h-3.5" />
          AI Cluster Confidence: {issue.aiConfidence}%
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {issue.lastUpdated}
        </span>
      </div>
    </div>
  );
};
