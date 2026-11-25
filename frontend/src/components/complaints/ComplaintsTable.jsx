import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { ISSUE_CATEGORIES, COMPLAINT_STATUSES } from '../../data/mockData';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export const ComplaintsTable = ({
  complaints = [],
  filters = {
    search: '',
    category: 'All',
    status: 'All',
    priority: 'All',
    page: 1,
    limit: 6,
    sortOrder: 'desc',
  },
  onFiltersChange,
  pagination = {
    currentPage: 1,
    pageSize: 6,
    totalRecords: complaints.length,
    totalPages: 1,
  },
  isLoading = false,
  onViewDetails,
}) => {
  const updateFilter = (patch) => {
    if (onFiltersChange) {
      onFiltersChange((prev) => ({ ...prev, ...patch }));
    }
  };

  const handleResetFilters = () => {
    updateFilter({
      search: '',
      category: 'All',
      status: 'All',
      priority: 'All',
      sortOrder: 'desc',
      page: 1,
    });
  };

  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.currentPage || 1;
  const totalRecords = pagination?.totalRecords ?? complaints.length;

  return (
    <div className="bg-white dark:bg-[#151F32] rounded-2xl border border-slate-200 dark:border-[#263449] shadow-xs overflow-hidden transition-colors">
      {/* Header controls & filters */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#263449] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Recent Complaints Registry
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {complaints.length} of {totalRecords} registered issues
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Sort order"
              value={filters.sortOrder || 'desc'}
              onChange={(e) => updateFilter({ sortOrder: e.target.value, page: 1 })}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-700 dark:text-slate-200"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>

            {(filters.search ||
              filters.category !== 'All' ||
              filters.status !== 'All' ||
              filters.priority !== 'All') && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
                className="text-xs"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Filter controls bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => updateFilter({ search: e.target.value, page: 1 })}
              placeholder="Search title, ID, ward..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <select
              aria-label="Filter by category"
              value={filters.category || 'All'}
              onChange={(e) => updateFilter({ category: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              {ISSUE_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              aria-label="Filter by status"
              value={filters.status || 'All'}
              onChange={(e) => updateFilter({ status: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              {COMPLAINT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              aria-label="Filter by priority"
              value={filters.priority || 'All'}
              onChange={(e) => updateFilter({ priority: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#263449] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Area / Ward</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  Loading complaints registry...
                </td>
              </tr>
            ) : complaints.length > 0 ? (
              complaints.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {item.id}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                    {item.title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {item.category}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {item.area}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <PriorityBadge priority={item.priority} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {item.submittedDate}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails && onViewDetails(item)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      className="text-xs py-1 px-2.5"
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No complaints found matching the selected filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-3.5 px-5 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-xs text-slate-500">
        <div>
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => updateFilter({ page: Math.max(currentPage - 1, 1) })}
            disabled={currentPage <= 1 || isLoading}
            className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateFilter({ page: Math.min(currentPage + 1, totalPages) })}
            disabled={currentPage >= totalPages || isLoading}
            className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
