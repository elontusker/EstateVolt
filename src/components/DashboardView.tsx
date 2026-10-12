import React, { useEffect, useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import {
  Building2,
  Zap,
  Receipt,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Users,
  Clock,
  ChevronRight,
  Wallet,
  ArrowDownRight,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import modernApartmentImg from '../assets/images/modern_apartment_complex_1791033659877.jpg';
import { RevenueD3Chart } from './RevenueD3Chart';

interface DashboardViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenBatchReadings: () => void;
  onOpenNewTicket: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenBatchReadings,
  onOpenNewTicket,
}) => {
  const {
    buildings,
    flats,
    statements,
    buildingExpenses,
    maintenanceRequests,
    selectedBuildingId,
    selectedMonth
  } = useProperty();

  const [analyticsBuildingId, setAnalyticsBuildingId] = useState(selectedBuildingId);
  const [periodFilter, setPeriodFilter] = useState('MONTH');
  const [collectionFilter, setCollectionFilter] = useState<'ALL' | 'PAID' | 'DUE'>('ALL');
  const [occupancyFilter, setOccupancyFilter] = useState<'ALL' | 'ACTIVE'>('ALL');

  useEffect(() => {
    setAnalyticsBuildingId(selectedBuildingId);
  }, [selectedBuildingId]);

  const availableYears = Array.from(
    new Set(statements.map(statement => statement.month.slice(0, 4))),
  ).sort((a, b) => b.localeCompare(a));

  const matchesPeriod = (month: string) => {
    if (periodFilter === 'MONTH') return month === selectedMonth;
    if (periodFilter.startsWith('YEAR:')) return month.startsWith(`${periodFilter.slice(5)}-`);
    return true;
  };

  const activeFlatIds = new Set(
    flats.filter(flat => flat.isOccupied).map(flat => flat.id)
  );

  const filteredStatements = statements.filter(statement => {
    if (analyticsBuildingId !== 'all' && statement.buildingId !== analyticsBuildingId) return false;
    if (!matchesPeriod(statement.month)) return false;
    if (collectionFilter === 'PAID' && statement.balanceThisMonth > 0) return false;
    if (collectionFilter === 'DUE' && statement.balanceThisMonth <= 0) return false;
    if (occupancyFilter === 'ACTIVE' && !activeFlatIds.has(statement.flatId)) return false;
    return true;
  });

  const filteredExpenses = buildingExpenses.filter(expense => {
    if (analyticsBuildingId !== 'all' && expense.buildingId !== analyticsBuildingId) return false;
    return matchesPeriod(expense.month);
  });

  const filteredMaintenance = analyticsBuildingId === 'all'
    ? maintenanceRequests
    : maintenanceRequests.filter(m => m.buildingId === analyticsBuildingId);

  const activeBuilding = buildings.find(b => b.id === analyticsBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';

  // Calculations for current month
  const totalFlats = new Set(filteredStatements.map(statement => statement.flatId)).size;
  const totalGrossDue = filteredStatements.reduce((sum, s) => sum + s.totalDue, 0);
  const totalCollected = filteredStatements.reduce((sum, s) => sum + s.paymentReceived, 0);
  const totalOutstanding = filteredStatements.reduce((sum, s) => sum + Math.max(0, s.balanceThisMonth), 0);
  const totalKwh = filteredStatements.reduce((sum, s) => sum + s.totalReading, 0);
  const totalElectricityBilled = filteredStatements.reduce((sum, s) => sum + s.electricityAmount, 0);
  const totalRentBilled = filteredStatements.reduce((sum, s) => sum + s.baseRent, 0);
  const collectionPercentage = totalGrossDue > 0 ? (totalCollected / totalGrossDue) * 100 : 0;

  // Building Expenses & Net Operating Income
  const totalBuildingExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netMonthlyProfit = totalCollected - totalBuildingExpenses;
  const profitMargin = totalCollected > 0 ? (netMonthlyProfit / totalCollected) * 100 : 0;

  const openTickets = filteredMaintenance.filter(m => m.status === 'NEW' || m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS');

  // Top consumers
  const topConsumers = [...filteredStatements]
    .sort((a, b) => b.totalReading - a.totalReading)
    .slice(0, 5);

  return (
    <div className="space-y-6">

      <div className="app-surface rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-emerald-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Analytics filters
          </span>
          <span className="text-[10px] text-slate-400">
            All overview metrics and rankings update together
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Building
            </span>
            <select
              value={analyticsBuildingId}
              onChange={(event) => setAnalyticsBuildingId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 outline-none focus:border-brand-accent"
            >
              <option value="all">All buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Time period
            </span>
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 outline-none focus:border-brand-accent"
            >
              <option value="MONTH">Selected month · {selectedMonth}</option>
              {availableYears.map(year => (
                <option key={year} value={`YEAR:${year}`}>Full year · {year}</option>
              ))}
              <option value="ALL">All historical data</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Collection status
            </span>
            <select
              value={collectionFilter}
              onChange={(event) => setCollectionFilter(event.target.value as 'ALL' | 'PAID' | 'DUE')}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 outline-none focus:border-brand-accent"
            >
              <option value="ALL">All billing statuses</option>
              <option value="PAID">Paid / clear only</option>
              <option value="DUE">Outstanding balance only</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Tenant scope
            </span>
            <select
              value={occupancyFilter}
              onChange={(event) => setOccupancyFilter(event.target.value as 'ALL' | 'ACTIVE')}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 outline-none focus:border-brand-accent"
            >
              <option value="ALL">All historical tenants</option>
              <option value="ACTIVE">Current active tenants only</option>
            </select>
          </label>
        </div>
      </div>

      {/* Hero Banner with Architectural Complex Image */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-brand-surface shadow-md">
        <div className="absolute inset-0">
          <img
            src={modernApartmentImg}
            alt="Multi-Building Residential Complex"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-surface via-brand-surface/85 to-transparent"></div>
        </div>

        <div className="relative p-6 sm:p-8 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-mono">
            <Building2 className="w-3.5 h-3.5" />
            <span>Multi-Building Complex Portfolio · {buildings.length} Properties</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            {analyticsBuildingId === 'all' ? 'All Apartment Complexes' : activeBuilding?.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Managing <strong className="text-slate-950 font-mono">{totalFlats} apartments</strong> with sub-meter electricity readings, automated Rupee ({currency}) billing, flat rent rolls, full building operating expenses, and net profit tracking.
          </p>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onNavigateTab('billing')}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Open Rent Ledger
            </button>
            <button
              onClick={onOpenBatchReadings}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Enter Month-End Meter Readings
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid with Net Profit & Building Expenses */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Inflow Collected */}
        <div className="app-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Collections Received</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono mt-2 tabular-nums">
            {currency}{totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
            <span>Rent: {currency}{totalRentBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-emerald-700">{collectionPercentage.toFixed(0)}% collected</span>
          </div>
        </div>

        {/* Total Building Operating Expenses */}
        <div className="app-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Building Operating Expenses</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 font-mono mt-2 tabular-nums">
            {currency}{totalBuildingExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Common power, security, lift AMC, housekeeping
          </div>
        </div>

        {/* Net Monthly Operating Profit */}
        <div className="app-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Net Operating Income</span>
            <TrendingUp className="w-4 h-4 text-sky-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-950 font-mono mt-2 tabular-nums">
            {currency}{netMonthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Operating Margin:</span>
            <span className="text-sky-700 font-semibold font-mono">{profitMargin.toFixed(1)}%</span>
          </div>
        </div>

        {/* Power Consumed & Electricity Billing */}
        <div className="app-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Electricity Power Consumed</span>
            <Zap className="w-4 h-4 text-sky-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-sky-700 font-mono mt-2 tabular-nums">
            {totalKwh.toLocaleString()} <span className="text-xs font-normal text-slate-500">kWh</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
            <span>Billed: {currency}{totalElectricityBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span>Avg {(totalFlats > 0 ? (totalKwh / totalFlats).toFixed(0) : 0)} kWh/flat</span>
          </div>
        </div>

      </div>

      {/* D3-based Revenue, Utility & Building Expense Interactive Chart */}
      <RevenueD3Chart
        buildingId={analyticsBuildingId}
        months={Array.from(new Set(filteredStatements.map(statement => statement.month)))}
        collectionFilter={collectionFilter}
      />

      {/* Buildings Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buildings
          .filter(bld => analyticsBuildingId === 'all' || bld.id === analyticsBuildingId)
          .map((bld) => {
          const bldStmts = filteredStatements.filter(s => s.buildingId === bld.id);
          const bldExps = filteredExpenses.filter(e => e.buildingId === bld.id);
          const bldFlats = new Set(bldStmts.map(statement => statement.flatId)).size;
          const bldDue = bldStmts.reduce((sum, s) => sum + s.totalDue, 0);
          const bldPaid = bldStmts.reduce((sum, s) => sum + s.paymentReceived, 0);
          const bldExp = bldExps.reduce((sum, e) => sum + e.amount, 0);
          const bldKwh = bldStmts.reduce((sum, s) => sum + s.totalReading, 0);
          const bldProfit = bldPaid - bldExp;

          return (
            <div
              key={bld.id}
              className="app-surface space-y-4 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-slate-950 text-base">{bld.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{bld.address}</p>
                </div>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-slate-100 text-slate-800 border border-slate-300">
                  {bld.totalFlats} Flats
                </span>
              </div>

              {/* Inflow vs Outflow grid */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Collected</span>
                  <span className="text-emerald-700 font-bold">{bld.currency}{bldPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Full Expenses</span>
                  <span className="text-blue-700 font-bold">{bld.currency}{bldExp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Net Profit</span>
                  <span className="text-sky-700 font-bold">{bld.currency}{bldProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Tariff: {bld.currency}{bld.electricityRatePerUnit}/kWh (Meter Fee: {bld.currency}{bld.fixedMeterCharge})</span>
                <button
                  onClick={() => onNavigateTab('billing')}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-700 font-medium cursor-pointer"
                >
                  <span>View All {bld.totalFlats} Flats</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Grid: Top Electricity Usage & Open Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Electricity Usage Flat List */}
        <div className="app-surface space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-700" />
              <h3 className="font-bold text-slate-950 text-sm">Top Electricity Consumers (This Month)</h3>
            </div>
            <button
              onClick={() => onNavigateTab('billing')}
              className="text-xs text-sky-700 hover:text-sky-700 cursor-pointer"
            >
              View Full Roll
            </button>
          </div>

          <div className="space-y-2.5">
            {topConsumers.map((stmt) => (
              <div
                key={stmt.id}
                className="p-3 rounded-lg bg-slate-100/80 border border-slate-300/70 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-950">Flat #{stmt.flatNumber}</span>
                    <span className="text-slate-500 text-[11px]">· {stmt.buildingName}</span>
                    <span className="text-slate-500 text-[11px]">({stmt.tenantName})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Start: {stmt.startReading} kWh · End: {stmt.endReading} kWh
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-bold text-sky-700 text-sm tabular-nums">
                    {stmt.totalReading.toLocaleString()} kWh
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {currency}{stmt.electricityAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Section */}
        <div className="app-surface space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-slate-950 text-sm">Active Maintenance & Repairs</h3>
            </div>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs text-blue-700 hover:text-blue-700 cursor-pointer"
            >
              View All ({openTickets.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {openTickets.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No open maintenance requests across the buildings.
              </div>
            ) : (
              openTickets.slice(0, 4).map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3 rounded-lg bg-slate-100/80 border border-slate-300/70 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950">Flat #{ticket.flatNumber}</span>
                      <span className="text-slate-500 text-[11px]">· {ticket.buildingName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        ticket.priority === 'EMERGENCY'
                          ? 'bg-rose-500/20 text-rose-600'
                          : ticket.priority === 'HIGH'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs font-medium">{ticket.title}</p>
                    <p className="text-slate-500 text-[11px]">{ticket.assignedTechnician || 'Unassigned technician'}</p>
                  </div>

                  <span className={`text-[11px] px-2 py-1 rounded font-medium ${
                    ticket.status === 'IN_PROGRESS'
                      ? 'bg-sky-50 text-sky-700'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
