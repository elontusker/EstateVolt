import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Wrench, 
  Users, 
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { useProperty } from '../context/PropertyContext';

export type ActiveTab = 'dashboard' | 'billing' | 'maintenance' | 'directory' | 'excel';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab
}) => {
  const { statements, maintenanceRequests, flats, selectedBuildingId, selectedMonth } = useProperty();

  // Badge counts
  const filteredStmts = selectedBuildingId === 'all'
    ? statements.filter(s => s.month === selectedMonth)
    : statements.filter(s => s.buildingId === selectedBuildingId && s.month === selectedMonth);

  const pendingPaymentsCount = filteredStmts.filter(s => s.balanceThisMonth > 0).length;
  
  const filteredRequests = selectedBuildingId === 'all'
    ? maintenanceRequests
    : maintenanceRequests.filter(m => m.buildingId === selectedBuildingId);

  const activeTicketsCount = filteredRequests.filter(m => m.status === 'NEW' || m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS').length;
  const activeTenantCount = flats.filter(flat =>
    flat.isOccupied && (selectedBuildingId === 'all' || flat.buildingId === selectedBuildingId)
  ).length;

  type NavItem = {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  };

  const navSections: { label: string; items: NavItem[] }[] = [
    {
      label: 'Insights',
      items: [
        {
          id: 'dashboard',
          label: 'Monthly & Yearly Reports',
          shortLabel: 'Reports',
          icon: <LayoutDashboard className="h-4 w-4" stroke="rgb(0, 0, 0)" />,
        },
      ],
    },
    {
      label: 'Operations',
      items: [
        {
          id: 'maintenance',
          label: 'Maintenance',
          shortLabel: 'Maintenance',
          icon: <Wrench className="h-4 w-4" stroke="rgb(0, 0, 0)" />,
          badge: activeTicketsCount > 0 ? `${activeTicketsCount}` : undefined,
          badgeColor: 'text-blue-700 bg-blue-400/10 border-blue-400/20',
        },
        {
          id: 'directory',
          label: 'Flats & Residents',
          shortLabel: 'Residents',
          icon: <Users className="h-4 w-4" stroke="rgb(0, 0, 0)" />,
          badge: `${activeTenantCount}`,
          badgeColor: 'text-slate-700 bg-slate-100 border-slate-300',
        },
      ],
    },
    {
      label: 'Data',
      items: [
        {
          id: 'excel',
          label: 'Excel & OneDrive Sync',
          shortLabel: 'Excel Sync',
          icon: <FileSpreadsheet className="h-4 w-4" />,
          badge: 'Sync',
          badgeColor: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20',
        },
        {
          id: 'billing',
          label: 'Rent Ledger',
          shortLabel: 'Rent Ledger',
          icon: <ReceiptText className="h-4 w-4" stroke="rgb(0, 0, 0)" />,
          badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} due` : undefined,
          badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
        },
      ],
    },
  ];

  return (
    <aside className="no-print sticky top-28 z-30 w-full shrink-0 border-y border-sidebar/70 bg-sidebar/95 backdrop-blur-xl md:top-16 lg:h-dvh lg:w-64 lg:border-y-0 lg:border-r">
      <div className="hide-scrollbar flex h-full flex-col overflow-y-auto">
        <nav
          aria-label="Primary navigation"
          className="hide-scrollbar flex gap-2 overflow-x-auto bg-blue-200 p-2 text-brand-blue lg:block lg:space-y-6 lg:p-5"
        >
          {navSections.map((section) => (
            <div key={section.label} className="contents lg:block">
              <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-border/70 lg:block">
                {section.label}
              </p>
              <div className="contents lg:block lg:space-y-1">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all lg:w-full ${
                        isActive
                          ? 'border-brand-accent bg-brand-tab-active text-white shadow-lg'
                          : 'border-white/5 bg-brand-tab text-white/80 hover:border-brand-accent/60 hover:bg-brand-primary hover:text-white'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? item.id === 'dashboard'
                              ? 'bg-transparent text-white'
                              : 'bg-brand-accent text-white'
                            : 'bg-brand-surface/5 text-brand-border group-hover:bg-brand-surface/10 group-hover:text-white'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="whitespace-nowrap lg:hidden">{item.shortLabel}</span>
                      <span className="hidden min-w-0 flex-1 truncate lg:block">{item.label}</span>
                      {item.badge && (
                        <span
                          className="hidden rounded-md border border-brand-border/20 bg-brand-surface/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-brand-tint lg:inline-flex"
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden flex-1 lg:block" />

        <div className="mt-auto hidden border-t border-brand-border/20 p-4 text-[10px] text-brand-border/70 lg:block">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-border" />
            <span>Portfolio financial controls active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
