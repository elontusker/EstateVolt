import React, { useState, useMemo } from 'react';
import { useProperty } from '../context/PropertyContext';
import { formatMonth } from '../utils/formatMonth';
import { FlatMonthlyStatement } from '../types';
import { Button } from './ui/Primitives';
import {
  Search,
  Filter,
  Zap,
  Receipt,
  ArrowUpDown,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  SlidersHorizontal,
  Gauge,
  ChevronDown,
  ChevronUp,
  CircleOff,
} from 'lucide-react';

interface ElectricityBillingViewProps {
  onOpenBatchReadings: () => void;
  onOpenAddRent: (statement?: FlatMonthlyStatement) => void;
}

export const ElectricityBillingView: React.FC<ElectricityBillingViewProps> = ({
  onOpenBatchReadings,
  onOpenAddRent,
}) => {
  const {
    statements,
    buildings,
    selectedBuildingId,
    selectedMonth,
    updateStatement,
    writeOffBalance,
    exportToCSV
  } = useProperty();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE'>('ALL');
  const [sortBy, setSortBy] = useState<'flat' | 'balance' | 'consumption' | 'due'>('flat');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showDetails, setShowDetails] = useState(false);
  const [historyScope, setHistoryScope] = useState<'MONTH' | 'YEAR' | 'ALL'>('MONTH');
  const [historyYear, setHistoryYear] = useState(selectedMonth.slice(0, 4));
  const [tenantFilter, setTenantFilter] = useState('ALL');

  // Inline editing state for meter readings
  const [editingStatementId, setEditingStatementId] = useState<string | null>(null);
  const [editStartReading, setEditStartReading] = useState<number>(0);
  const [editEndReading, setEditEndReading] = useState<number>(0);
  const [editPayment, setEditPayment] = useState<number>(0);
  const [editBalance, setEditBalance] = useState<number>(0);
  const [editPaymentDate, setEditPaymentDate] = useState('');

  const availableYears = useMemo(
    () => Array.from(new Set(statements.map(statement => statement.month.slice(0, 4)))).sort((a, b) => b.localeCompare(a)),
    [statements],
  );
  const availableTenants = useMemo(
    () => Array.from(new Set(statements.map(statement => statement.tenantName))).sort(),
    [statements],
  );

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';

  // Filtered & sorted statements
  const filteredStatements = useMemo(() => {
    return statements
      .filter((stmt) => {
        if (selectedBuildingId !== 'all' && stmt.buildingId !== selectedBuildingId) {
          return false;
        }
        if (historyScope === 'MONTH' && stmt.month !== selectedMonth) return false;
        if (historyScope === 'YEAR' && !stmt.month.startsWith(`${historyYear}-`)) return false;
        if (tenantFilter !== 'ALL' && stmt.tenantName !== tenantFilter) return false;
        if (statusFilter !== 'ALL' && stmt.status !== statusFilter) {
          return false;
        }
        if (searchTerm.trim() !== '') {
          const q = searchTerm.toLowerCase();
          const matchFlat = stmt.flatNumber.toLowerCase().includes(q);
          const matchTenant = stmt.tenantName.toLowerCase().includes(q);
          const matchBld = stmt.buildingName.toLowerCase().includes(q);
          if (!matchFlat && !matchTenant && !matchBld) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'flat') {
          diff = parseInt(a.flatNumber, 10) - parseInt(b.flatNumber, 10);
        } else if (sortBy === 'balance') {
          diff = a.balanceThisMonth - b.balanceThisMonth;
        } else if (sortBy === 'consumption') {
          diff = a.totalReading - b.totalReading;
        } else if (sortBy === 'due') {
          diff = a.totalDue - b.totalDue;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [statements, selectedBuildingId, selectedMonth, historyScope, historyYear, tenantFilter, statusFilter, searchTerm, sortBy, sortOrder]);

  // Summary statistics for current filtered set
  const summary = useMemo(() => {
    let totalFlats = filteredStatements.length;
    let totalKwh = 0;
    let totalElectricityBilled = 0;
    let totalRentBilled = 0;
    let totalLastMonthBalance = 0;
    let totalGrossDue = 0;
    let totalPaid = 0;
    let totalBalanceThisMonth = 0;

    filteredStatements.forEach((s) => {
      totalKwh += s.totalReading;
      totalElectricityBilled += s.electricityAmount;
      totalRentBilled += s.baseRent;
      totalLastMonthBalance += s.lastMonthBalance;
      totalGrossDue += s.totalDue;
      totalPaid += s.paymentReceived;
      totalBalanceThisMonth += Math.max(0, s.balanceThisMonth);
    });

    const collectionRate = totalGrossDue > 0 ? (totalPaid / totalGrossDue) * 100 : 0;

    return {
      totalFlats,
      totalKwh,
      totalElectricityBilled,
      totalRentBilled,
      totalLastMonthBalance,
      totalGrossDue,
      totalPaid,
      totalBalanceThisMonth,
      collectionRate,
    };
  }, [filteredStatements]);

  const handleStartEdit = (stmt: FlatMonthlyStatement) => {
    setEditingStatementId(stmt.id);
    setEditStartReading(stmt.startReading);
    setEditEndReading(stmt.endReading);
    setEditPayment(stmt.paymentReceived);
    setEditBalance(stmt.balanceThisMonth);
    setEditPaymentDate(stmt.paymentDate || stmt.billingDate || `${stmt.month}-01`);
  };

  const handleSaveEdit = (stmtId: string) => {
    if (editEndReading < editStartReading) {
      alert('Month End Reading cannot be less than Month Start Reading.');
      return;
    }
    updateStatement(stmtId, {
      startReading: editStartReading,
      endReading: editEndReading,
      paymentReceived: editPayment,
      balanceThisMonth: editBalance,
      paymentDate: editPaymentDate,
    });
    setEditingStatementId(null);
  };

  const handleCancelEdit = () => {
    setEditingStatementId(null);
  };

  const getStatusBadge = (status: FlatMonthlyStatement['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3" /> Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-950">
            <span>Rent & Utility Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-mono font-normal">
              {filteredStatements.length} Active Records
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated electricity usage tracking, monthly start/end meter auditing, rent, last month balance carryover, payment, and net balance reconciliation.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Main "Add Rent" button explicitly highlighted */}
          <button
            onClick={() => onOpenAddRent()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg shadow-md transition-all cursor-pointer ring-2 ring-brand-accent/20"
            title="Add rent, electricity meter readings, and balance for any apartment"
          >
            <Receipt className="w-4 h-4 text-white" />
            <span>+ Add Rent Payment</span>
          </button>

          <button
            onClick={onOpenBatchReadings}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
            title="Fast bulk entry of meter readings for all active flats"
          >
            <Gauge className="w-4 h-4 text-sky-700" />
            <span>Batch Meter Entry</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Download full CSV matching reference format"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <Button
            onClick={() => setShowDetails(value => !value)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-800"
          >
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showDetails ? 'Hide ledger details' : 'Show ledger details'}
          </Button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

        {/* Total kWh Consumed */}
        <div className="app-surface rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Power Consumed</span>
            <Zap className="w-3.5 h-3.5 text-sky-700" />
          </div>
          <div className="text-lg font-bold text-slate-950 font-mono mt-1 tabular-nums">
            {summary.totalKwh.toLocaleString()} <span className="text-xs font-normal text-slate-500">kWh</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Avg {(summary.totalFlats > 0 ? (summary.totalKwh / summary.totalFlats).toFixed(1) : 0)} kWh / flat
          </div>
        </div>

        {/* Electricity Billed */}
        <div className="app-surface rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Electricity Charges
          </div>
          <div className="text-lg font-bold text-sky-700 font-mono mt-1 tabular-nums">
            {currency}{summary.totalElectricityBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Auto-tariff applied
          </div>
        </div>

        {/* Base Rent Roll */}
        <div className="app-surface rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Total Base Rent
          </div>
          <div className="text-lg font-bold text-slate-950 font-mono mt-1 tabular-nums">
            {currency}{summary.totalRentBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Across {summary.totalFlats} flats
          </div>
        </div>

        {/* Last Month Balance Arrears */}
        <div className="app-surface rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Last Month Arrears
          </div>
          <div className="text-lg font-bold text-sky-700 font-mono mt-1 tabular-nums">
            {currency}{summary.totalLastMonthBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Carried over balance
          </div>
        </div>

        {/* Payment Received */}
        <div className="app-surface rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Payment Received</span>
            <span className="text-[10px] text-emerald-700 font-mono">{summary.collectionRate.toFixed(0)}%</span>
          </div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-1 tabular-nums">
            {currency}{summary.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Collected this month
          </div>
        </div>

        {/* Total Balance Due This Month */}
        <div className="app-surface rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-500 font-medium">
            Balance Due This Month
          </div>
          <div className="text-lg font-bold text-rose-600 font-mono mt-1 tabular-nums">
            {currency}{summary.totalBalanceThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Outstanding receivables
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-brand-surface/90 border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search flat (e.g. 101, 304), resident name, or meter #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/90 border border-slate-300/70 rounded-lg text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:border-brand-accent"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {(['ALL', 'UNPAID', 'PARTIAL', 'OVERDUE', 'PAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-brand-tab-active text-white border border-brand-accent font-semibold shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              {st === 'ALL' ? 'All Flats' : st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={historyScope}
            onChange={(event) => setHistoryScope(event.target.value as 'MONTH' | 'YEAR' | 'ALL')}
            className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-950"
            aria-label="Ledger history period"
          >
            <option value="MONTH">Selected month · {formatMonth(selectedMonth)}</option>
            <option value="YEAR">Full year</option>
            <option value="ALL">Overall history</option>
          </select>
          {historyScope === 'YEAR' && (
            <select
              value={historyYear}
              onChange={(event) => setHistoryYear(event.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-950"
              aria-label="Ledger year"
            >
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          )}
          <select
            value={tenantFilter}
            onChange={(event) => setTenantFilter(event.target.value)}
            className="max-w-48 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs text-slate-950"
            aria-label="Ledger tenant"
          >
            <option value="ALL">All tenants</option>
            {availableTenants.map(tenant => <option key={tenant} value={tenant}>{tenant}</option>)}
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-100 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
          >
            <option value="flat">Flat Number</option>
            <option value="balance">Balance Due</option>
            <option value="consumption">Power (kWh)</option>
            <option value="due">Total Due</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-1 text-slate-500 hover:text-slate-800 bg-slate-100 border border-slate-300 rounded cursor-pointer"
            title="Toggle Ascending / Descending"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Compact ledger table */}
      {showDetails && <div className="rounded-xl border border-slate-200 bg-brand-surface/95 overflow-hidden shadow-sm">
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-2">Flat</th>
                <th className="py-3 px-2">Tenant</th>
                <th className="py-3 px-2 font-mono text-slate-500">Payment Date</th>
                <th className="py-3 px-2 text-right bg-slate-100/90">
                  Start Reading (kWh)
                </th>
                <th className="py-3 px-2 text-right bg-slate-100/90 text-sky-700 font-bold">
                  End Reading (kWh)
                </th>
                <th className="py-3 px-2 text-right bg-slate-100/90 text-sky-700 font-bold">
                  Total Reading (kWh)
                </th>
                <th className="py-3 px-2 text-right text-emerald-700 font-bold">
                  Electricity Cost
                </th>
                <th className="py-3 px-2 text-right font-semibold text-slate-800">
                  Rent
                </th>
                <th className="py-3 px-2 text-right text-slate-500">
                  Last Month Balance
                </th>
                <th className="py-3 px-2 text-right font-bold text-slate-950 bg-slate-100/90 border-x border-slate-300/70">
                  <div className="flex flex-col items-end">
                    <span>Total Amount</span>
                    <span className="text-[10px] text-slate-500 font-normal font-sans">(Rent + Elec Bill + Last Month Balance)</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-right text-emerald-700 font-semibold">
                  Payment
                </th>
                <th className="py-3 px-2 text-right font-bold text-rose-600 bg-slate-100/90 border-l border-slate-300/70">
                  <div className="flex flex-col items-end">
                    <span>Balance</span>
                    <span className="text-[10px] text-rose-500 font-normal font-sans">(Total Amount - Payment)</span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-2 text-center bg-slate-100/70">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredStatements.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-500 font-sans">
                    <p className="text-sm font-medium">No flat records match your search or filter.</p>
                  </td>
                </tr>
              ) : (
                filteredStatements.map((stmt) => {
                  const isEditing = editingStatementId === stmt.id;
                  const hasOverdueCarryover = stmt.lastMonthBalance > 0;

                  return (
                    <tr
                      key={stmt.id}
                      className={`hover:bg-slate-100/70 transition-colors ${
                        stmt.balanceThisMonth > 0 ? 'bg-slate-50/80' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold text-slate-950">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-900">
                          #{stmt.flatNumber}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-sans text-slate-800">
                        <div className="break-words font-medium text-slate-950">{stmt.tenantName}</div>
                      </td>

                      <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editPaymentDate}
                            onChange={(event) => setEditPaymentDate(event.target.value)}
                            className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 text-[10px]"
                          />
                        ) : stmt.paymentDate || stmt.billingDate || `${stmt.month}-01`}
                      </td>

                      {/* 6. Start Reading (kWh) */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-slate-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editStartReading}
                            onChange={(e) => setEditStartReading(Number(e.target.value))}
                            className="w-20 px-1.5 py-1 text-right bg-slate-100 border border-slate-300 rounded text-xs text-slate-950 focus:outline-none"
                          />
                        ) : (
                          <span>{stmt.startReading.toLocaleString()}</span>
                        )}
                      </td>

                      {/* 7. End Reading (kWh) */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-bold text-sky-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editEndReading}
                            onChange={(e) => setEditEndReading(Number(e.target.value))}
                            className="w-20 px-1.5 py-1 text-right bg-slate-100 border border-emerald-500 rounded text-xs text-slate-950 focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => onOpenAddRent(stmt)}
                            className="inline-flex items-center gap-1 group text-sky-700 hover:text-sky-700 cursor-pointer"
                            title="Click to add/update rent & electricity"
                          >
                            <span>{stmt.endReading.toLocaleString()}</span>
                            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-sky-700" />
                          </button>
                        )}
                      </td>

                      {/* 8. Total Reading (kWh) */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-bold text-sky-700">
                        {isEditing ? (
                          <span>{Math.max(0, editEndReading - editStartReading).toLocaleString()}</span>
                        ) : (
                          <span>{stmt.totalReading.toLocaleString()}</span>
                        )}
                      </td>

                      {/* 11. Electricity Cost */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-emerald-700 font-bold">
                        {isEditing ? (
                          <span>
                            {currency}
                            {(Math.max(0, editEndReading - editStartReading) * stmt.ratePerUnit + stmt.fixedUtilityCharge).toFixed(2)}
                          </span>
                        ) : (
                          <span>{currency}{stmt.electricityAmount.toFixed(2)}</span>
                        )}
                      </td>

                      {/* 12. Rent */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-slate-800 font-semibold">
                        {currency}{stmt.baseRent.toLocaleString('en-IN')}
                      </td>

                      {/* 13. Last Month Balance */}
                      <td className={`py-2.5 px-3 text-right tabular-nums whitespace-nowrap ${
                        hasOverdueCarryover ? 'text-sky-700 font-semibold' : stmt.lastMonthBalance < 0 ? 'text-emerald-700' : 'text-slate-500'
                      }`}>
                        {stmt.lastMonthBalance < 0
                          ? `-${currency}${Math.abs(stmt.lastMonthBalance).toFixed(2)}`
                          : stmt.lastMonthBalance > 0
                          ? `+${currency}${stmt.lastMonthBalance.toFixed(2)}`
                          : `0.00`
                        }
                      </td>

                      {/* 14. Total Amount (Rent + Elec Bill + Last Month Balance) */}
                      <td className="py-2.5 px-3.5 text-right tabular-nums whitespace-nowrap font-bold text-slate-950 bg-slate-50/80 border-x border-slate-200/80">
                        {isEditing ? (
                          <span>
                            {currency}{((Math.max(0, editEndReading - editStartReading) * stmt.ratePerUnit + stmt.fixedUtilityCharge) + stmt.baseRent + stmt.lastMonthBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span>{currency}{stmt.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        )}
                      </td>

                      {/* 15. Payment */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-emerald-700 font-semibold">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPayment}
                            onChange={(event) => setEditPayment(Number(event.target.value))}
                            className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 text-right text-xs"
                          />
                        ) : (
                          <span>{currency}{stmt.paymentReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        )}
                      </td>

                      {/* 16. Balance (Total Amount - Payment) */}
                      <td className={`py-2.5 px-3.5 text-right tabular-nums whitespace-nowrap font-bold bg-slate-50/80 border-l border-slate-200/80 ${
                        (isEditing
                          ? (((Math.max(0, editEndReading - editStartReading) * stmt.ratePerUnit + stmt.fixedUtilityCharge) + stmt.baseRent + stmt.lastMonthBalance) - stmt.paymentReceived)
                          : stmt.balanceThisMonth) > 0
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editBalance}
                            onChange={(event) => setEditBalance(Number(event.target.value))}
                            className="w-full rounded border border-slate-300 bg-slate-100 px-1 py-1 text-right text-xs"
                          />
                        ) : (
                          <span>{currency}{stmt.balanceThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        )}
                      </td>

                      {/* 18. Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-sans">
                        {getStatusBadge(stmt.status)}
                      </td>

                      {/* 19. Actions (⚡ Add Electricity Reading option prominently provided) */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap font-sans bg-brand-surface/80">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(stmt.id)}
                              className="px-2 py-1 bg-brand-primary hover:bg-brand-primary-hover text-white rounded text-[10px] font-medium cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(stmt)}
                              className="p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-950 rounded transition-colors"
                              title="Edit payment date, readings, payment, and balance"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            {/* Explicit "Add / Edit Rent" button on every row */}
                            <button
                              onClick={() => onOpenAddRent(stmt)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded transition-colors cursor-pointer"
                              title="Add / Update Monthly Rent & Electricity for this Flat"
                            >
                              <Receipt className="w-3 h-3 text-sky-700" />
                              <span>Add Rent</span>
                            </button>

                            {stmt.balanceThisMonth > 0 && (
                              <button
                                onClick={() => {
                                  const reason = prompt('Reason for reporting this balance as lost', 'Tenant left without settling the balance');
                                  if (reason !== null && confirm(`Write off ${currency}${stmt.balanceThisMonth.toFixed(2)} for ${stmt.tenantName}?`)) {
                                    writeOffBalance(stmt.id, reason);
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Report outstanding balance as lost"
                              >
                                <CircleOff className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary matching reference columns */}
        <div className="bg-slate-100/70 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <span className="font-semibold text-slate-950">{filteredStatements.length}</span> flats
            {selectedBuildingId !== 'all' ? ` in ${activeBuilding?.name}` : ' across all buildings'}.
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>
              Total Units: <strong className="text-sky-700">{summary.totalKwh.toLocaleString()} kWh</strong>
            </span>
            <span>
              Power Billed: <strong className="text-sky-700">{currency}{summary.totalElectricityBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </span>
            <span>
              Total Collected: <strong className="text-emerald-700">{currency}{summary.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </span>
            <span>
              Balance Due: <strong className="text-rose-600">{currency}{summary.totalBalanceThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </span>
          </div>
        </div>
      </div>}

    </div>
  );
};
