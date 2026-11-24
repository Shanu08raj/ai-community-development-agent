import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminTopNav } from '../components/layout/AdminTopNav';
import { X } from 'lucide-react';

export const AdminLayout = ({ activeTab, onSelectTab, searchQuery, onSearchChange, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1120] text-[#172033] dark:text-[#F8FAFC] transition-colors flex">
      {/* Desktop Sidebar with connected curved tab effect */}
      <div className={`hidden lg:block shrink-0 ${isSidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Backdrop & Drawer */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-xs bg-[#0645A5] dark:bg-[#06234D] h-full shadow-2xl flex flex-col z-10">
            <div className="absolute top-4 right-3">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <AdminSidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                onSelectTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopNav
          pageTitle={
            activeTab === 'dashboard'
              ? 'Admin Overview'
              : activeTab === 'complaints'
              ? 'Complaints Registry'
              : activeTab === 'community-issues'
              ? 'AI Community Clusters'
              : activeTab === 'analytics'
              ? 'Civic Analytics & Trends'
              : activeTab === 'authorities'
              ? 'Local Authority Directory'
              : activeTab === 'audit-logs'
              ? 'System Audit Trail'
              : 'Admin Settings'
          }
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
