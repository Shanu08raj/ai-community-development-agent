import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Building2,
  ScrollText,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const ADMIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'complaints', label: 'Complaints', icon: FileText },
  { id: 'community-issues', label: 'Community Issues', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'authorities', label: 'Authority Directory', icon: Building2 },
  { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const AdminSidebar = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-30 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-[#0645A5] dark:bg-[#06234D] text-white select-none shadow-xl`}
    >
      {/* Brand Header */}
      {isCollapsed ? (
        <div className="h-16 sm:h-20 flex flex-col items-center justify-center gap-1.5 px-2 border-b border-white/10 shrink-0">
          <div
            className="w-10 h-10 rounded-xl bg-white text-[#0645A5] flex items-center justify-center font-bold shadow-md shrink-0"
            title="JanSetu AI"
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white text-[#0645A5] flex items-center justify-center font-bold shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight truncate">
                JanSetu <span className="text-blue-200">Admin</span>
              </h1>
              <p className="text-[11px] text-blue-200/80 uppercase font-semibold tracking-wider truncate">
                Civic Intelligence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation list */}
      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className={`space-y-1 ${isCollapsed ? 'pl-2' : 'pl-3'}`}>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li key={item.id} className="relative">
                {/* Active connected curves on top and bottom right */}
                {isActive && (
                  <>
                    {/* Top concave fillet connecting to active item */}
                    <div className="absolute -top-5 right-0 w-5 h-5 pointer-events-none z-20">
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M0 20 C10 20 20 10 20 0 L20 20 Z"
                          className="fill-[#F5F7FB] dark:fill-[#0B1120]"
                        />
                      </svg>
                    </div>
                    {/* Bottom concave fillet connecting to active item */}
                    <div className="absolute -bottom-5 right-0 w-5 h-5 pointer-events-none z-20">
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M0 0 C10 0 20 10 20 20 L20 0 Z"
                          className="fill-[#F5F7FB] dark:fill-[#0B1120]"
                        />
                      </svg>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed
                      ? 'justify-center py-3 rounded-l-2xl'
                      : 'gap-3.5 py-3 px-3.5 rounded-l-2xl'
                  } text-sm font-semibold transition-all relative z-10 cursor-pointer ${
                    isActive
                      ? 'bg-[#F5F7FB] dark:bg-[#0B1120] text-[#0645A5] dark:text-[#60A5FA] shadow-sm'
                      : 'text-white/90 hover:text-white hover:bg-white/10 rounded-r-none'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      isActive
                        ? 'text-[#0645A5] dark:text-[#60A5FA] scale-110'
                        : 'text-white/80'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer notice */}
      {!isCollapsed && (
        <div className="p-4 mx-3 mb-4 rounded-xl bg-white/10 border border-white/10 text-xs text-blue-100">
          <div className="font-semibold text-white mb-0.5">Demo Environment</div>
          <p className="text-[11px] text-blue-200/90 leading-relaxed">
            Actions update browser storage locally. No government agency is connected.
          </p>
        </div>
      )}
    </aside>
  );
};
