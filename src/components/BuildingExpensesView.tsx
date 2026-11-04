import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useProperty } from '../context/PropertyContext';
import { BuildingExpense, ExpenseCategory, ExpenseType } from '../types';
import { Button, Input } from './ui/Primitives';
import { formatMonth } from '../utils/formatMonth';
import { 
  CalendarRange,
  Plus, 
  Search, 
  Filter, 
  Download, 
  Receipt, 
  Zap, 
  Shield, 
  Sparkles, 
  ArrowUpRight, 
  Trash2, 
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { loadElectricityMeters } from '../utils/electricityMeters';

const CUSTOM_EXPENSE_CATEGORIES_STORAGE_KEY =
  'rently_custom_expense_categories_v1';

interface CustomExpenseCategory {
  id: `CUSTOM:${string}`;
  label: string;
}

const loadCustomExpenseCategories = (): CustomExpenseCategory[] => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(CUSTOM_EXPENSE_CATEGORIES_STORAGE_KEY) || '[]',
    );
    if (Array.isArray(saved)) {
      return saved.filter(
        (category): category is CustomExpenseCategory =>
          typeof category?.id === 'string' &&
          category.id.startsWith('CUSTOM:') &&
          typeof category.label === 'string' &&
          category.label.trim().length > 0,
      );
    }
  } catch {
    // Ignore invalid saved custom categories.
  }
  return [];
};

interface BuildingExpensesViewProps {
  reportPeriod?: 'MONTHLY' | 'YEARLY';
  reportMonth?: string;
  reportYear?: string;
}

export const BuildingExpensesView: React.FC<BuildingExpensesViewProps> = ({
  reportPeriod,
  reportMonth,
  reportYear,
}) => {
  const { 
    buildingExpenses, 
    buildings, 
    selectedBuildingId, 
    selectedMonth,
    setSelectedMonth,
    addBuildingExpense,
    deleteBuildingExpense,
    exportExpensesCSV 
  } = useProperty();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showDetails, setShowDetails] = useState(false);
  const [periodScope, setPeriodScope] = useState<'MONTH' | 'YEAR' | 'ALL'>('MONTH');
  const [periodYear, setPeriodYear] = useState(selectedMonth.slice(0, 4));
  const [filterPortalTarget, setFilterPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (reportPeriod) {
      setFilterPortalTarget(null);
      return;
    }
    setFilterPortalTarget(document.getElementById('report-filter-slot'));
  }, [reportPeriod]);

  const availableYears = useMemo(
    () => Array.from(new Set(buildingExpenses.map(expense => expense.month.slice(0, 4)))).sort((a, b) => b.localeCompare(a)),
    [buildingExpenses],
  );
  const availableMonths = useMemo(
    () =>
      Array.from(new Set(buildingExpenses.map(expense => expense.month)))
        .sort((a, b) => b.localeCompare(a)),
    [buildingExpenses],
  );

  // Add Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBldId, setNewBldId] = useState<string>(
    selectedBuildingId === 'all' ? (buildings[0]?.id || '') : selectedBuildingId
  );
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('ELECTRICITY_PAID');
  const [customExpenseCategories, setCustomExpenseCategories] = useState<
    CustomExpenseCategory[]
  >(loadCustomExpenseCategories);
  const [isAddingExpenseCategory, setIsAddingExpenseCategory] = useState(false);
  const [newExpenseCategoryLabel, setNewExpenseCategoryLabel] = useState('');
  const [newExpenseType, setNewExpenseType] = useState<ExpenseType>('EXPENSE');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newNotes, setNewNotes] = useState('');
  const [electricityMeters, setElectricityMeters] = useState<string[]>(
    loadElectricityMeters,
  );
  const [newMeterNumber, setNewMeterNumber] = useState<string>(
    electricityMeters[0],
  );
  const [newMeterReading, setNewMeterReading] = useState<number | ''>('');
  const [newExpenseMonth, setNewExpenseMonth] = useState(selectedMonth);
  const [newExpenseDate, setNewExpenseDate] = useState(`${selectedMonth}-01`);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';
  const periodLabel = reportPeriod === 'MONTHLY'
    ? formatMonth(reportMonth || selectedMonth)
    : reportPeriod === 'YEARLY'
      ? reportYear === 'ALL' ? 'All years' : reportYear || periodYear
      : periodScope === 'MONTH'
        ? formatMonth(selectedMonth)
        : periodScope === 'YEAR'
          ? periodYear
          : 'All years';

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return buildingExpenses.filter((exp) => {
      if (selectedBuildingId !== 'all' && exp.buildingId !== selectedBuildingId) {
        return false;
      }
      if (reportPeriod === 'MONTHLY') {
        if (exp.month !== (reportMonth || selectedMonth)) return false;
      } else if (reportPeriod === 'YEARLY') {
        if (
          reportYear &&
          reportYear !== 'ALL' &&
          !exp.month.startsWith(`${reportYear}-`)
        ) {
          return false;
        }
      } else {
        if (periodScope === 'MONTH' && exp.month !== selectedMonth) return false;
        if (periodScope === 'YEAR' && !exp.month.startsWith(`${periodYear}-`)) return false;
      }
      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchMeter = (exp.meterNumber || '').toLowerCase().includes(q);
        const matchBld = exp.buildingName.toLowerCase().includes(q);
        if (!matchTitle && !matchMeter && !matchBld) {
          return false;
        }
      }
      return true;
    });
  }, [
    buildingExpenses,
    selectedBuildingId,
    selectedMonth,
    periodScope,
    periodYear,
    categoryFilter,
    searchTerm,
    reportPeriod,
    reportMonth,
    reportYear,
  ]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let total = 0;
    const byType: Record<ExpenseType, number> = {
      CASH_OUT: 0,
      EXPENSE: 0,
      LIABILITIES: 0,
      REINVESTED: 0,
    };

    filteredExpenses.forEach(e => {
      total += e.amount;
      byType[e.expenseType || 'EXPENSE'] += e.amount;
    });

    return { total, byType };
  }, [filteredExpenses]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please provide a valid amount.');
      return;
    }
    const isElectricityExpense = newCategory === 'ELECTRICITY_PAID';
    const meterReading = Number(newMeterReading);
    if (
      isElectricityExpense &&
      (!newMeterNumber.trim() ||
        newMeterReading === '' ||
        !Number.isFinite(meterReading) ||
        meterReading < 0)
    ) {
      alert('Please provide the electricity meter number and current reading.');
      return;
    }

    const bld = buildings.find(b => b.id === newBldId) || buildings[0];

    addBuildingExpense({
      buildingId: bld.id,
      buildingName: bld.name,
      month: newExpenseMonth,
      category: newCategory,
      expenseType: newExpenseType,
      title: getCategoryLabel(newCategory),
      amount,
      date: newExpenseDate,
      status: 'PAID',
      notes: newNotes || undefined,
      meterNumber: isElectricityExpense ? newMeterNumber.trim() : undefined,
      meterReading: isElectricityExpense ? meterReading : undefined,
    });

    setIsAddModalOpen(false);
    setNewAmount('');
    setNewNotes('');
    setNewMeterNumber(electricityMeters[0]);
    setNewMeterReading('');
  };

  const handleExpenseCategoryChange = (value: string) => {
    if (value === '__ADD_NEW__') {
      setIsAddingExpenseCategory(true);
      return;
    }
    setIsAddingExpenseCategory(false);
    setNewCategory(value as ExpenseCategory);
  };

  const addCustomExpenseCategory = () => {
    const label = newExpenseCategoryLabel.trim();
    if (!label) return;
    const existingLabels = [
      'Electricity Paid',
      'Cleaning',
      'Plumber',
      'Repairs & Civil Work',
      ...customExpenseCategories.map(category => category.label),
    ];
    if (
      existingLabels.some(
        existing => existing.toLowerCase() === label.toLowerCase(),
      )
    ) {
      alert('This expense category already exists.');
      return;
    }
    const category: CustomExpenseCategory = {
      id: `CUSTOM:${Date.now()}`,
      label,
    };
    const updated = [...customExpenseCategories, category];
    setCustomExpenseCategories(updated);
    localStorage.setItem(
      CUSTOM_EXPENSE_CATEGORIES_STORAGE_KEY,
      JSON.stringify(updated),
    );
    setNewCategory(category.id);
    setNewExpenseCategoryLabel('');
    setIsAddingExpenseCategory(false);
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    const customCategory = customExpenseCategories.find(
      item => item.id === category,
    );
    if (customCategory) return customCategory.label;
    switch (category) {
      case 'ELECTRICITY_PAID':
        return 'Electricity Paid';
      case 'SECURITY_GUARDS':
        return '24x7 Security Agency';
      case 'HOUSEKEEPING_STAFF':
        return 'Housekeeping & Sanitation';
      case 'ELEVATOR_AMC':
        return 'Elevator AMC & Servicing';
      case 'WATER_TANKERS':
        return 'Cleaning';
      case 'GENERATOR_DIESEL':
        return 'DG Backup Fuel / Diesel';
      case 'REPAIRS_CIVIL':
        return 'Repairs & Civil Works';
      case 'PLUMBER':
        return 'Plumber';
      case 'PEST_CONTROL':
        return 'Pest Control & Fogging';
      default:
        return 'General Facility Operations';
    }
  };

  const getExpenseTypeLabel = (expenseType: ExpenseType | undefined) => {
    switch (expenseType) {
      case 'CASH_OUT':
        return 'Cash-Out';
      case 'LIABILITIES':
        return 'Liabilities';
      case 'REINVESTED':
        return 'Reinvested';
      default:
        return 'Expense';
    }
  };

  return (
    <div className="space-y-6">
      {!reportPeriod && filterPortalTarget && createPortal(
        <div className="flex min-w-max items-center gap-2 px-2">
          <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            {(['MONTH', 'YEAR'] as const).map(option => (
              <Button
                key={option}
                type="button"
                onClick={() => {
                  if (option === 'MONTH') {
                    setPeriodScope('MONTH');
                  } else {
                    setPeriodScope(periodYear === 'ALL' ? 'ALL' : 'YEAR');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  (option === 'MONTH'
                    ? periodScope === 'MONTH'
                    : periodScope !== 'MONTH')
                    ? 'bg-brand-tab-active text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {option === 'MONTH' ? 'Monthly report' : 'Yearly report'}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <CalendarRange className="h-4 w-4 text-slate-500" />
            {periodScope === 'MONTH' ? (
              <select
                value={selectedMonth}
                onChange={event => setSelectedMonth(event.target.value)}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
                aria-label="Filter expenses by month"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>{formatMonth(month)}</option>
                ))}
              </select>
            ) : (
              <select
                value={periodScope === 'ALL' ? 'ALL' : periodYear}
                onChange={event => {
                  const year = event.target.value;
                  setPeriodYear(year);
                  setPeriodScope(year === 'ALL' ? 'ALL' : 'YEAR');
                }}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
                aria-label="Filter expenses by year"
              >
                <option value="ALL">All years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex min-w-52 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type="search"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-950 outline-none placeholder:text-slate-400"
              aria-label="Search expenses"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-950 outline-none"
            aria-label="Filter expenses by category"
          >
            <option value="ALL">All Categories</option>
            <option value="ELECTRICITY_PAID">Electricity Paid</option>
            <option value="WATER_TANKERS">Cleaning</option>
            <option value="PLUMBER">Plumber</option>
            <option value="REPAIRS_CIVIL">Repairs & Civil</option>
            {customExpenseCategories.map(category => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>

          <Button
            type="button"
            onClick={exportExpensesCSV}
            className="rounded-lg border border-slate-300 bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            title="Export expenses CSV"
            aria-label="Export expenses CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>,
        filterPortalTarget,
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-950">
            <span>Building Operating Expenses</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-normal">
              {periodLabel}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const savedMeters = loadElectricityMeters();
              setElectricityMeters(savedMeters);
              setNewMeterNumber(savedMeters[0]);
              setIsAddingExpenseCategory(false);
              setNewExpenseCategoryLabel('');
              setNewExpenseMonth(selectedMonth);
              setNewExpenseDate(`${selectedMonth}-01`);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>

          <Button
            type="button"
            onClick={() => setShowDetails(value => !value)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-800"
          >
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showDetails ? 'Hide detail' : 'Show detail'}
          </Button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="p-3.5 rounded-xl bg-brand-surface border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">
            Total Building Operating Cost
          </div>
          <div className="text-2xl font-bold text-slate-950 font-mono mt-1 tabular-nums">
            {currency}{metrics.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            For {selectedBuildingId === 'all' ? 'All Buildings' : activeBuilding?.name}
          </div>
        </div>

        {([
          ['CASH_OUT', 'Cash-Out', 'text-rose-700'],
          ['EXPENSE', 'Expense', 'text-blue-700'],
          ['LIABILITIES', 'Liabilities', 'text-amber-700'],
          ['REINVESTED', 'Reinvested', 'text-violet-700'],
        ] as const).map(([type, label, color]) => (
          <div key={type} className="rounded-xl border border-slate-200 bg-brand-surface p-3.5">
            <div className="text-[11px] font-medium text-slate-500">{label}</div>
            <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${color}`}>
              {currency}{metrics.byType[type].toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500">Selected period</div>
          </div>
        ))}

      </div>

      {/* Expenses Table */}
      {showDetails && <div className="rounded-xl border border-slate-200 bg-brand-surface/95 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap">Building</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Category</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Expense Type</th>
                <th className="py-3 px-4">Title / Description</th>
                <th className="py-3 px-3 whitespace-nowrap">Payment Date</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Amount (₹)</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No building expenses recorded for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-100/70 transition-colors">
                    <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800">
                      {exp.buildingName}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-slate-700 font-medium">
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap font-medium text-violet-700">
                      {getExpenseTypeLabel(exp.expenseType)}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-950">{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{exp.notes}</div>
                      )}
                      {exp.meterNumber && (
                        <div className="mt-0.5 font-mono text-[11px] text-violet-700">
                          {exp.meterNumber}
                          {exp.meterReading !== undefined
                            ? ` · Reading ${exp.meterReading.toLocaleString('en-IN')}`
                            : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {exp.date}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-950 text-xs whitespace-nowrap">
                      {currency}{exp.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (confirm(`Delete expense "${exp.title}"?`)) {
                            deleteBuildingExpense(exp.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-700 rounded transition-colors"
                        title="Delete Expense Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Record Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-2 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-brand-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <h2 className="text-base font-bold text-slate-950">Add Expense</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-500 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="grid min-h-0 overflow-y-auto grid-cols-2 gap-2 p-3 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Building</label>
                  <select
                    value={newBldId}
                    onChange={(e) => setNewBldId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                  >
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Expense Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => handleExpenseCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                  >
                    <option value="ELECTRICITY_PAID">Electricity Paid</option>
                    <option value="WATER_TANKERS">Cleaning</option>
                    <option value="PLUMBER">Plumber</option>
                    <option value="REPAIRS_CIVIL">Repairs & Civil Work</option>
                    {customExpenseCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add new category</option>
                  </select>
                  {isAddingExpenseCategory && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={newExpenseCategoryLabel}
                        onChange={event => setNewExpenseCategoryLabel(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addCustomExpenseCategory();
                          }
                        }}
                        placeholder="New category name"
                        className="min-w-0 flex-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-slate-950"
                        autoFocus
                      />
                      <Button
                        type="button"
                        onClick={addCustomExpenseCategory}
                        disabled={!newExpenseCategoryLabel.trim()}
                        className="bg-violet-600 px-3 py-2 font-semibold text-white hover:bg-violet-700"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setIsAddingExpenseCategory(false);
                          setNewExpenseCategoryLabel('');
                        }}
                        className="border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Expense Month</label>
                  <input
                    type="month"
                    value={newExpenseMonth}
                    onChange={(e) => {
                      setNewExpenseMonth(e.target.value);
                      setNewExpenseDate(`${e.target.value}-01`);
                    }}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Invoice / Payment Date</label>
                  <input
                    type="date"
                    value={newExpenseDate}
                    onChange={(e) => setNewExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">
                  {newCategory === 'ELECTRICITY_PAID'
                    ? 'Payment Amount'
                    : 'Amount'} ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={newAmount}
                  onChange={(e) =>
                    setNewAmount(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono font-bold"
                  required
                />
              </div>

              {newCategory === 'ELECTRICITY_PAID' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Electricity Meter Number
                    </label>
                    <select
                      value={newMeterNumber}
                      onChange={(e) => setNewMeterNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-mono text-slate-950"
                      required
                    >
                      {electricityMeters.map(meter => (
                        <option key={meter} value={meter}>{meter}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Current Meter Reading
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Enter bill reading"
                      value={newMeterReading}
                      onChange={(e) =>
                        setNewMeterReading(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-mono text-slate-950"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-700 font-medium block mb-1">
                  Expense Type
                </label>
                <select
                  value={newExpenseType}
                  onChange={(e) => setNewExpenseType(e.target.value as ExpenseType)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                >
                  <option value="CASH_OUT">Cash-Out</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="LIABILITIES">Liabilities</option>
                  <option value="REINVESTED">Reinvested</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Notes (Optional)</label>
                <textarea
                  rows={1}
                  placeholder="Details regarding service, warranty, or approval..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-3 border-t border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold rounded-lg shadow-sm"
                >
                  Save Expense
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
