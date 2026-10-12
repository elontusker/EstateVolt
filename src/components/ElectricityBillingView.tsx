import React, { useState, useMemo } from 'react';
import { useProperty } from '../context/PropertyContext';
import { FlatMonthlyStatement } from '../types';
import { Button } from './ui/Primitives';
import {
  Search,
  Filter,
  Zap,
  Receipt,
  CreditCard,
  ArrowUpDown,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  SlidersHorizontal,
  FileText,
  Plus,
  Gauge,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ElectricityBillingViewProps {
  onSelectStatementForInvoice: (statement: FlatMonthlyStatement) => void;
  onSelectStatementForPayment: (statement: FlatMonthlyStatement) => void;
  onOpenBatchReadings: () => void;
  onOpenAddRent: (statement?: FlatMonthlyStatement) => void;
}

export const ElectricityBillingView: React.FC<ElectricityBillingViewProps> = ({
  onSelectStatementForInvoice,
  onSelectStatementForPayment,
  onOpenBatchReadings,
  onOpenAddRent,
}) => {
  const {
    statements,
    buildings,
    selectedBuildingId,
    selectedMonth,
    updateElectricityReading,
    exportToCSV
  } = useProperty();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE'>('ALL');
  const [sortBy, setSortBy] = useState<'flat' | 'balance' | 'consumption' | 'due'>('flat');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showDetails, setShowDetails] = useState(false);

  // Inline editing state for meter readings
  const [editingStatementId, setEditingStatementId] = useState<string | null>(null);
  const [editStartReading, setEditStartReading] = useState<number>(0);
  const [editEndReading, setEditEndReading] = useState<number>(0);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';

  // Filtered & sorted statements
  const filteredStatements = useMemo(() => {
    return statements
      .filter((stmt) => {
        if (selectedBuildingId !== 'all' && stmt.buildingId !== selectedBuildingId) {
          return false;
        }
        if (stmt.month !== selectedMonth) {
          return false;
        }
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
  }, [statements, selectedBuildingId, selectedMonth, statusFilter, searchTerm, sortBy, sortOrder]);

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
  };

  const handleSaveEdit = (stmtId: string) => {
    if (editEndReading < editStartReading) {
      alert('Month End Reading cannot be less than Month Start Reading.');
      return;
    }
    updateElectricityReading(stmtId, editStartReading, editEndReading);
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

      {/* The Core Table with EXACT 18 Columns matching Reference CSV */}
      {showDetails && <div className="rounded-xl border border-slate-200 bg-brand-surface/95 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap">Building Name</th>
                <th className="py-3 px-3 whitespace-nowrap">Flat Number</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Tenant Name</th>
                <th className="py-3 px-3 whitespace-nowrap font-mono text-slate-500">Billing Month</th>
                <th className="py-3 px-3 whitespace-nowrap font-mono text-slate-500">Payment Date</th>
                <th className="py-3 px-3 text-right whitespace-nowrap bg-slate-100/90">
                  Start Reading (kWh)
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap bg-slate-100/90 text-sky-700 font-bold">
                  End Reading (kWh)
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap bg-slate-100/90 text-sky-700 font-bold">
                  Total Reading (kWh)
                </th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap text-slate-500 font-mono">
                  Rate Per Unit
                </th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap text-slate-500 font-mono">
                  Fixed Meter Fee
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-emerald-700 font-bold">
                  Electricity Cost
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap font-semibold text-slate-800">
                  Rent
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-slate-500">
                  Last Month Balance
                </th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-slate-950 bg-slate-100/90 border-x border-slate-300/70">
                  <div className="flex flex-col items-end">
                    <span>Total Amount</span>
                    <span className="text-[10px] text-slate-500 font-normal font-sans">(Rent + Elec Bill + Last Month Balance)</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-emerald-700 font-semibold">
                  Payment
                </th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-rose-600 bg-slate-100/90 border-l border-slate-300/70">
                  <div className="flex flex-col items-end">
                    <span>Balance</span>
                    <span className="text-[10px] text-rose-500 font-normal font-sans">(Total Amount - Payment)</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap bg-slate-100/70">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredStatements.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-500 font-sans">
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
                      {/* 1. Building Name */}
                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-800 whitespace-nowrap">
                        {stmt.buildingName}
                      </td>

                      {/* 2. Flat Number */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-950">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-900">
                          #{stmt.flatNumber}
                        </span>
                      </td>

                      {/* 3. Tenant Name */}
                      <td className="py-2.5 px-3.5 font-sans text-slate-800 whitespace-nowrap">
                        <div className="font-medium text-slate-950">{stmt.tenantName}</div>
                      </td>

                      {/* 4. Billing Month */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {stmt.month}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {stmt.paymentDate || stmt.billingDate || `${stmt.month}-01`}
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

                      {/* 9. Rate Per Unit */}
                      <td className="py-2.5 px-2.5 text-right tabular-nums whitespace-nowrap text-slate-500 text-[11px]">
                        {stmt.ratePerUnit}
                      </td>

                      {/* 10. Fixed Meter Fee */}
                      <td className="py-2.5 px-2.5 text-right tabular-nums whitespace-nowrap text-slate-500 text-[11px]">
                        {stmt.fixedUtilityCharge}
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
                        <button
                          onClick={() => onSelectStatementForPayment(stmt)}
                          className="hover:underline font-bold focus:outline-none cursor-pointer group inline-flex items-center gap-1 justify-end"
                          title="Click to record/update payment"
                        >
                          {stmt.paymentReceived > 0 ? (
                            <span>{currency}{stmt.paymentReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">0.00</span>
                          )}
                        </button>
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
                          <span>
                            {currency}{(((Math.max(0, editEndReading - editStartReading) * stmt.ratePerUnit + stmt.fixedUtilityCharge) + stmt.baseRent + stmt.lastMonthBalance) - stmt.paymentReceived).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
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

                            {/* Explicit "Add / Edit Rent" button on every row */}
                            <button
                              onClick={() => onOpenAddRent(stmt)}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded transition-colors cursor-pointer"
                              title="Add / Update Monthly Rent & Electricity for this Flat"
                            >
                              <Receipt className="w-3 h-3 text-sky-700" />
                              <span>Add Rent</span>
                            </button>

                            {/* Record Payment Button */}
                            <button
                              onClick={() => onSelectStatementForPayment(stmt)}
                              className="p-1.5 text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Record Resident Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>

                            {/* View / Print Invoice Button */}
                            <button
                              onClick={() => onSelectStatementForInvoice(stmt)}
                              className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Generate Itemized Bill & Receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-700" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredStatements.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 bg-brand-surface/95 text-slate-800 text-xs font-mono font-bold">
                <tr>
                  <td colSpan={7} className="py-3 px-3.5 text-left font-sans text-slate-500">
                    Grand Totals ({filteredStatements.length} flats):
                  </td>
                  <td className="py-3 px-3 text-right text-sky-700 tabular-nums">
                    {summary.totalKwh.toLocaleString()}
                  </td>
                  <td colSpan={2} className="py-3 px-2 text-center text-slate-400 font-sans text-[11px]">
                    -
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 tabular-nums">
                    {currency}{summary.totalElectricityBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-950 tabular-nums">
                    {currency}{summary.totalRentBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-sky-700 tabular-nums">
                    {currency}{summary.totalLastMonthBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3.5 text-right text-slate-950 tabular-nums bg-slate-100/90 border-x border-slate-300/70">
                    {currency}{summary.totalGrossDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 tabular-nums">
                    {currency}{summary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3.5 text-right text-rose-600 tabular-nums bg-slate-100/90 border-l border-slate-300/70">
                    {currency}{summary.totalBalanceThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-center text-[11px] text-slate-500 font-sans">
                    {summary.collectionRate.toFixed(1)}% Collected
                  </td>
                </tr>
              </tfoot>
            )}
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
