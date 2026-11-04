import React, { useState } from 'react';
import { PropertyProvider } from './context/PropertyContext';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { OverviewReportsView } from './components/OverviewReportsView';
import { ElectricityBillingView } from './components/ElectricityBillingView';
import { MaintenanceView } from './components/MaintenanceView';
import { FlatsDirectoryView } from './components/FlatsDirectoryView';
import { BatchMeterEntryModal } from './components/BatchMeterEntryModal';
import { AddRentModal } from './components/AddRentModal';
import { NewTicketModal } from './components/NewTicketModal';
import { SettingsModal } from './components/SettingsModal';
import { ExcelWorkbookView } from './components/ExcelWorkbookView';
import { OneDriveSyncProvider } from './context/OneDriveSyncContext';
import { FlatMonthlyStatement } from './types';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchMeterOpen, setIsBatchMeterOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isAddRentOpen, setIsAddRentOpen] = useState(false);
  const [selectedRentStatement, setSelectedRentStatement] = useState<FlatMonthlyStatement | null>(null);

  const handleOpenAddRent = (stmt?: FlatMonthlyStatement) => {
    setSelectedRentStatement(stmt || null);
    setIsAddRentOpen(true);
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-hidden bg-transparent text-slate-900 font-sans">
      <div className="app-grid pointer-events-none fixed inset-0 -z-10" />
      
      {/* 3-Zone Clean Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddRent={() => handleOpenAddRent()}
        showAddRentPayment={activeTab !== 'directory' && activeTab !== 'maintenance'}
      />

      {/* Main Layout Body */}
      <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col lg:flex-row">
        
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Content Viewport */}
        <main className="min-w-0 max-w-full flex-1 p-4 sm:p-6 xl:p-8 2xl:p-10">
          <div key={activeTab} className="page-enter">
          {activeTab === 'dashboard' && (
            <OverviewReportsView />
          )}

          {activeTab === 'billing' && (
            <ElectricityBillingView
              onOpenBatchReadings={() => setIsBatchMeterOpen(true)}
              onOpenAddRent={(stmt) => handleOpenAddRent(stmt)}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              onOpenNewTicket={() => setIsNewTicketOpen(true)}
            />
          )}

          {activeTab === 'directory' && (
            <FlatsDirectoryView />
          )}

          {activeTab === 'excel' && (
            <ExcelWorkbookView />
          )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <AddRentModal
        isOpen={isAddRentOpen}
        onClose={() => {
          setIsAddRentOpen(false);
          setSelectedRentStatement(null);
        }}
        preSelectedStatement={selectedRentStatement}
      />

      <BatchMeterEntryModal
        isOpen={isBatchMeterOpen}
        onClose={() => setIsBatchMeterOpen(false)}
      />

      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

    </div>
  );
};

export default function App() {
  return (
    <PropertyProvider>
      <OneDriveSyncProvider>
        <MainAppContent />
      </OneDriveSyncProvider>
    </PropertyProvider>
  );
}
