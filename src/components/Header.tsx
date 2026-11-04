import React from 'react';
import { 
  Receipt,
  Settings as SettingsIcon
} from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenAddRent: () => void;
  showAddRentPayment?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenAddRent,
  showAddRentPayment = true,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-brand-border/70 bg-brand-surface/90 text-slate-900 backdrop-blur-xl">
      <div className="mx-auto max-w-[1920px] px-3 sm:px-5 xl:px-8">
        <div className="flex h-16 items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/rently-brand.png"
              alt="Rently"
              className="h-14 w-auto shrink-0 object-contain"
            />
          </div>

          <div
            id="report-filter-slot"
            className="hide-scrollbar min-w-0 flex-1 overflow-x-auto"
          />

          <div className="ml-auto flex items-center gap-1.5">
            {showAddRentPayment && (
              <button
                onClick={onOpenAddRent}
                className="flex items-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-xs font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-brand-primary-hover"
                title="Add a rent and electricity entry"
              >
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Add rent payment</span>
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="rounded-xl border border-brand-border/70 bg-brand-surface p-2 text-brand-muted transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
              title="Building and tariff settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
