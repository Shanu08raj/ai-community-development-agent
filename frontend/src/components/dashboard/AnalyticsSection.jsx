import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react';

export const AnalyticsSection = ({ analytics, isLoading = false }) => {
  const { isDark } = useTheme();

  const gridColor = isDark ? '#263449' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipBg = isDark ? '#151F32' : '#FFFFFF';
  const tooltipBorder = isDark ? '#263449' : '#E2E8F0';

  const trendData = analytics?.trendData || [];
  const categoryData = analytics?.categoryData || [];
  const statusData = analytics?.statusData || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-[#263449]" />
        <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-[#263449]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Complaint Volume vs Resolutions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aggregated trends of logged community issues vs reported resolutions
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" stroke={textColor} fontSize={12} />
                  <YAxis stroke={textColor} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: isDark ? '#F8FAFC' : '#172033',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="submitted"
                    name="Reports Logged"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    name="Reported Resolved"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend metrics available yet.
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Distribution by Issue Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Percentage share of citizen complaints across civic domains
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {categoryData.some((c) => c.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, _name, item) => [`${val}% (${item?.payload?.count || 0})`, 'Share']}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: isDark ? '#F8FAFC' : '#172033',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category breakdown available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Distribution Bar Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Active Status Pipeline Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live count of complaints in each step of the civic review lifecycle
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="status" stroke={textColor} fontSize={11} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis stroke={textColor} fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: isDark ? '#F8FAFC' : '#172033',
                  }}
                />
                <Bar dataKey="count" name="Complaints" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No lifecycle pipeline metrics available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
