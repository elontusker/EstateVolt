import React, { useState } from 'react';
import { PropertyProvider, useProperty } from './context/PropertyContext';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ElectricityBillingView } from './components/ElectricityBillingView';
import { MaintenanceView } from './components/MaintenanceView';
import { FlatsDirectoryView } from './components/FlatsDirectoryView';
import { BuildingExpensesView } from './components/BuildingExpensesView';
import { BatchMeterEntryModal } from './components/BatchMeterEntryModal';
import { AddRentModal } from './components/AddRentModal';
import { PaymentModal } from './components/PaymentModal';
import { InvoiceModal } from './components/InvoiceModal';
import { NewTicketModal } from './components/NewTicketModal';
import { SettingsModal } from './components/SettingsModal';
import { ExcelWorkbookView } from './components/ExcelWorkbookView';
import { OneDriveSyncProvider } from './context/OneDriveSyncContext';
import { ReportsView } from './components/ReportsView';
import { TenantBalanceSummaryView } from './components/TenantBalanceSummaryView';
import { FlatMonthlyStatement } from './types';

const MainAppContent: React.FC = () => {
  const { buildings, selectedBuildingId } = useProperty();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBatchMeterOpen, setIsBatchMeterOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isAddRentOpen, setIsAddRentOpen] = useState(false);
  const [selectedRentStatement, setSelectedRentStatement] = useState<FlatMonthlyStatement | null>(null);

  const [selectedInvoiceStatement, setSelectedInvoiceStatement] = useState<FlatMonthlyStatement | null>(null);
  const [selectedPaymentStatement, setSelectedPaymentStatement] = useState<FlatMonthlyStatement | null>(null);

  const activeBuilding = buildings.find(b => b.id === (selectedInvoiceStatement?.buildingId || selectedBuildingId));

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
            <DashboardView
              onNavigateTab={setActiveTab}
              onOpenBatchReadings={() => setIsBatchMeterOpen(true)}
              onOpenNewTicket={() => setIsNewTicketOpen(true)}
            />
          )}

          {activeTab === 'billing' && (
            <ElectricityBillingView
              onSelectStatementForInvoice={(stmt) => setSelectedInvoiceStatement(stmt)}
              onSelectStatementForPayment={(stmt) => setSelectedPaymentStatement(stmt)}
              onOpenBatchReadings={() => setIsBatchMeterOpen(true)}
              onOpenAddRent={(stmt) => handleOpenAddRent(stmt)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView />
          )}

          {activeTab === 'balances' && (
            <TenantBalanceSummaryView />
          )}

          {activeTab === 'expenses' && (
            <BuildingExpensesView />
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

      <PaymentModal
        statement={selectedPaymentStatement}
        onClose={() => setSelectedPaymentStatement(null)}
      />

      <InvoiceModal
        statement={selectedInvoiceStatement}
        building={activeBuilding}
        onClose={() => setSelectedInvoiceStatement(null)}
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
