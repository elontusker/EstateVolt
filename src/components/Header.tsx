import React from 'react';
import { useProperty } from '../context/PropertyContext';
import { 
  Building2, 
  Calendar, 
  Settings as SettingsIcon,
  Receipt
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenAddRent: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenAddRent,
}) => {
  const { 
    buildings, 
    selectedBuildingId, 
    setSelectedBuildingId,
    selectedMonth,
    setSelectedMonth,
    statements,
    flats
  } = useProperty();

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';

  // Calculate quick stats for header bar
  const filteredStatements = selectedBuildingId === 'all'
    ? statements.filter(s => s.month === selectedMonth)
    : statements.filter(s => s.buildingId === selectedBuildingId && s.month === selectedMonth);

  const totalFlatsCount = flats.filter(flat =>
    flat.isOccupied && (selectedBuildingId === 'all' || flat.buildingId === selectedBuildingId)
  ).length;
  const portfolioCapacity = buildings.reduce((total, building) => total + building.totalFlats, 0);
  const pendingCollection = filteredStatements.reduce((acc, s) => acc + Math.max(0, s.balanceThisMonth), 0);

  const contextControls = (
    <>
      <label className="flex min-w-0 items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-surface/95 px-3 py-2 text-xs text-slate-700 transition-colors focus-within:border-brand-accent/60">
        <Building2 className="h-4 w-4 shrink-0 text-brand-primary" />
        <select
          aria-label="Select building"
          value={selectedBuildingId}
          onChange={(event) => setSelectedBuildingId(event.target.value)}
          className="min-w-0 max-w-52 cursor-pointer bg-transparent font-semibold text-slate-900 outline-none"
        >
          <option value="all" className="bg-brand-surface">
            All buildings · {portfolioCapacity} units
          </option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id} className="bg-brand-surface">
              {building.name} · {building.totalFlats} units
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 rounded-xl border border-brand-border/70 bg-brand-surface/95 px-3 py-2 text-xs text-slate-700 transition-colors focus-within:border-brand-accent/60">
        <Calendar className="h-4 w-4 text-brand-muted" />
        <input
          aria-label="Select billing month"
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="cursor-pointer bg-transparent font-mono font-medium text-slate-900 outline-none"
        />
      </label>
      <div className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-accent-muted/30 bg-brand-tint px-3 py-2 font-mono text-xs">
        <span className="hidden text-slate-400 sm:inline">Outstanding</span>
        <span className="font-semibold text-brand-tab-active">
          {currency}{pendingCollection.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      </div>
    </>
  );

  return (
    <header className="no-print sticky top-0 z-40 border-b border-brand-border/70 bg-brand-surface/90 text-slate-900 backdrop-blur-xl">
      <div className="mx-auto max-w-[1920px] px-3 sm:px-5 xl:px-8">
        <div className="flex h-16 items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-accent/20 bg-gradient-to-br from-brand-accent/20 to-brand-accent-muted/15 text-brand-primary shadow-lg">
              <Building2 className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-extrabold tracking-tight text-brand-tab-active">
                  EstateVolt
                </span>
                <span className="hidden rounded-md bg-brand-tint/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-brand-muted sm:inline">
                  {totalFlatsCount} active
                </span>
              </div>
              <p className="hidden truncate text-[10px] font-medium tracking-wide text-brand-muted sm:block">
                Property operations workspace
              </p>
            </div>
          </div>

          <div className="mx-auto hidden items-center gap-2 md:flex">
            {contextControls}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={onOpenAddRent}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-xs font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-brand-primary-hover"
              title="Add a rent and electricity entry"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Add rent payment</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="rounded-xl border border-brand-border/70 bg-brand-surface p-2 text-brand-muted transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
              title="Building and tariff settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto border-t border-brand-tint py-2 md:hidden">
          {contextControls}
        </div>
      </div>
    </header>
  );
};
