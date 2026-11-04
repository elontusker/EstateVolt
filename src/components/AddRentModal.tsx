import React, { useState, useEffect, useMemo } from 'react';
import { useProperty } from '../context/PropertyContext';
import { Flat, FlatMonthlyStatement } from '../types';
import { Button } from './ui/Primitives';
import {
  Building2,
  User,
  Calendar,
  Zap,
  Receipt,
  Check,
  X,
  AlertCircle,
  Clock,
  Search,
  FileText,
  Paperclip,
  Trash2
} from 'lucide-react';

interface AddRentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedStatement?: FlatMonthlyStatement | null;
}

// Utility to calculate previous month string (e.g. '2026-10' -> '2026-09')
const getPreviousMonthString = (month: string): string => {
  const [yearStr, monthStr] = month.split('-');
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10) - 1;
  if (m <= 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
};

export const AddRentModal: React.FC<AddRentModalProps> = ({
  isOpen,
  onClose,
  preSelectedStatement,
}) => {
  const {
    buildings,
    flats,
    statements,
    selectedBuildingId,
    selectedMonth,
    upsertRentStatement
  } = useProperty();

  const [targetMonth, setTargetMonth] = useState(
    preSelectedStatement?.month || selectedMonth || '2026-09',
  );

  // Flat selection
  const [selectedFlatId, setSelectedFlatId] = useState<string>(() => {
    if (preSelectedStatement) return preSelectedStatement.flatId;
    if (selectedBuildingId !== 'all') {
      const bldFlats = flats.filter(f => f.buildingId === selectedBuildingId);
      if (bldFlats.length > 0) return bldFlats[0].id;
    }
    return flats[0]?.id || '';
  });
  const [tenantSearch, setTenantSearch] = useState('');
  const [isTenantSearchOpen, setIsTenantSearchOpen] = useState(false);

  const activeFlat = useMemo(() => {
    const currentFlat = flats.find(f => f.id === selectedFlatId);
    const periodStatement = statements.find(
      statement =>
        statement.flatId === selectedFlatId &&
        statement.month === targetMonth,
    );
    if (!periodStatement) return currentFlat || flats[0];
    return {
      ...(currentFlat || {
        id: periodStatement.flatId,
        buildingId: periodStatement.buildingId,
        floor: 0,
        isOccupied: true,
        leaseStartDate: `${periodStatement.month}-01`,
      }),
      flatNumber: periodStatement.flatNumber,
      tenantName: periodStatement.tenantName,
      tenantPhone: periodStatement.tenantPhone,
      tenantEmail: periodStatement.tenantEmail,
      baseRent: periodStatement.baseRent,
      meterNumber: periodStatement.meterNumber,
      electricityRatePerUnit: periodStatement.ratePerUnit,
      fixedUtilityCharge: periodStatement.fixedUtilityCharge,
    } as Flat;
  }, [flats, selectedFlatId, statements, targetMonth]);

  const activeBuilding = useMemo(() => {
    if (!activeFlat) return buildings[0];
    return buildings.find(b => b.id === activeFlat.buildingId) || buildings[0];
  }, [buildings, activeFlat]);

  const currency = activeBuilding ? activeBuilding.currency : '₹';
  const ratePerUnit = activeFlat?.electricityRatePerUnit ?? activeBuilding?.electricityRatePerUnit ?? 9.0;
  const fixedMeterFee = activeFlat?.fixedUtilityCharge ?? activeBuilding?.fixedMeterCharge ?? 0;

  // Previous month data lookup
  const previousMonthStr = useMemo(() => {
    return getPreviousMonthString(targetMonth);
  }, [targetMonth]);

  const previousStatement = useMemo(() => {
    if (!activeFlat) return undefined;
    return statements.find(s => s.flatId === activeFlat.id && s.month === previousMonthStr);
  }, [statements, activeFlat, previousMonthStr]);

  // Current statement if already exists for this target month
  const existingStatement = useMemo(() => {
    if (!activeFlat) return undefined;
    return statements.find(s => s.flatId === activeFlat.id && s.month === targetMonth);
  }, [statements, activeFlat, targetMonth]);

  // Form Fields
  const [rentAmount, setRentAmount] = useState<number>(20000);
  const [lastMonthStartReading, setLastMonthStartReading] = useState<number>(3000);
  const [currentEndReading, setCurrentEndReading] = useState<number>(3250);
  const [lastMonthBalance, setLastMonthBalance] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    preSelectedStatement?.paymentDate || preSelectedStatement?.billingDate || `${targetMonth}-01`
  );
  const [isStartReadingEditable, setIsStartReadingEditable] = useState(false);
  const [isBalanceEditable, setIsBalanceEditable] = useState(false);
  const [attachment, setAttachment] = useState<FlatMonthlyStatement['attachment']>(
    preSelectedStatement?.attachment
  );
  const [attachmentError, setAttachmentError] = useState('');
  const searchableFlats = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();
    const periodFlats = new Map<string, Flat>();

    flats
      .filter(flat => {
        const leaseStartMonth = flat.leaseStartDate.slice(0, 7);
        const leaseEndMonth = flat.leaseEndDate?.slice(0, 7);
        return (
          !flat.isCommonArea &&
          leaseStartMonth <= targetMonth &&
          (!leaseEndMonth || leaseEndMonth >= targetMonth)
        );
      })
      .forEach(flat => periodFlats.set(flat.id, flat));

    statements
      .filter(statement => {
        if (statement.month !== targetMonth) return false;
        return (
          selectedBuildingId === 'all' ||
          statement.buildingId === selectedBuildingId
        );
      })
      .forEach(statement => {
        const currentFlat = flats.find(flat => flat.id === statement.flatId);
        periodFlats.set(statement.flatId, {
          ...(currentFlat || {
            id: statement.flatId,
            buildingId: statement.buildingId,
            floor: 0,
            isOccupied: true,
            leaseStartDate: `${statement.month}-01`,
          }),
          flatNumber: statement.flatNumber,
          tenantName: statement.tenantName,
          tenantPhone: statement.tenantPhone,
          tenantEmail: statement.tenantEmail,
          baseRent: statement.baseRent,
          meterNumber: statement.meterNumber,
          electricityRatePerUnit: statement.ratePerUnit,
          fixedUtilityCharge: statement.fixedUtilityCharge,
        } as Flat);
      });

    return Array.from(periodFlats.values())
      .filter(
        flat =>
          selectedBuildingId === 'all' ||
          flat.buildingId === selectedBuildingId,
      )
      .filter((flat) => {
        if (!query) return true;
        const building = buildings.find(item => item.id === flat.buildingId);
        return [flat.tenantName, flat.flatNumber, flat.tenantPhone, building?.name || '']
          .some(value => value.toLowerCase().includes(query));
      })
      .slice(0, 12);
  }, [
    buildings,
    flats,
    selectedBuildingId,
    statements,
    targetMonth,
    tenantSearch,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const month = preSelectedStatement?.month || selectedMonth || '2026-09';
    setTargetMonth(month);
    setPaymentDate(
      preSelectedStatement?.paymentDate ||
        preSelectedStatement?.billingDate ||
        `${month}-01`,
    );
  }, [isOpen, preSelectedStatement, selectedMonth]);

  useEffect(() => {
    if (!isOpen || searchableFlats.length === 0) return;
    if (!searchableFlats.some(flat => flat.id === selectedFlatId)) {
      setSelectedFlatId(searchableFlats[0].id);
      setTenantSearch('');
    }
  }, [isOpen, searchableFlats, selectedFlatId]);

  // Sync inputs when flat or targetMonth changes
  useEffect(() => {
    if (preSelectedStatement && preSelectedStatement.flatId === selectedFlatId && preSelectedStatement.month === targetMonth) {
      setRentAmount(preSelectedStatement.baseRent);
      setLastMonthStartReading(preSelectedStatement.startReading);
      setCurrentEndReading(preSelectedStatement.endReading);
      setLastMonthBalance(preSelectedStatement.lastMonthBalance);
      setPaymentAmount(preSelectedStatement.paymentReceived);
      setAttachment(preSelectedStatement.attachment);
      return;
    }

    if (existingStatement) {
      // If current month statement exists, load it
      setRentAmount(existingStatement.baseRent);
      setLastMonthStartReading(existingStatement.startReading);
      setCurrentEndReading(existingStatement.endReading);
      setLastMonthBalance(existingStatement.lastMonthBalance);
      setPaymentAmount(existingStatement.paymentReceived);
      setAttachment(existingStatement.attachment);
    } else {
      // Automatically prefetch from previous month data:
      // 1. Rent is configured per flat in Settings.
      const fetchedRent = activeFlat?.baseRent ?? previousStatement?.baseRent ?? 0;
      setRentAmount(fetchedRent);

      // 2. Electricity last month reading (becomes current start reading)
      const fetchedStartReading = previousStatement?.endReading ?? 3000;
      setLastMonthStartReading(fetchedStartReading);

      // 3. User fillable end reading (default to start + typical monthly usage)
      setCurrentEndReading(fetchedStartReading + 240);

      // 4. Last month balance (fetched from previous month's ending balance)
      const fetchedLastBal = previousStatement?.balanceThisMonth ?? 0;
      setLastMonthBalance(fetchedLastBal);

      // 5. Payment default
      setPaymentAmount(0);
      setAttachment(undefined);
    }
    setIsStartReadingEditable(false);
    setIsBalanceEditable(false);
  }, [selectedFlatId, targetMonth, previousStatement, existingStatement, activeFlat, preSelectedStatement]);

  if (!isOpen) return null;

  // Real-time Automated Calculations
  const unitsConsumed = Math.max(0, Number((currentEndReading - lastMonthStartReading).toFixed(2)));
  const energyCharges = Number((unitsConsumed * ratePerUnit).toFixed(2));
  const electricityBill = Number((energyCharges + fixedMeterFee).toFixed(2));

  // Total Amount = Rent + Elec Bill + Last Month Balance
  const totalAmount = Number((rentAmount + electricityBill + lastMonthBalance).toFixed(2));

  // Balance = Total Amount - Payment
  const netBalance = Number((totalAmount - paymentAmount).toFixed(2));

  const isReadingInvalid = currentEndReading < lastMonthStartReading;

  const handleAttachment = (file?: File) => {
    setAttachmentError('');
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setAttachmentError('Please choose a file smaller than 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.onerror = () => setAttachmentError('The attachment could not be read.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadingInvalid) {
      alert(`Validation Warning: Current Electricity Reading (${currentEndReading}) cannot be less than Last Month Reading (${lastMonthStartReading}).`);
      return;
    }

    if (!activeFlat) {
      alert('Please select a valid tenant/apartment.');
      return;
    }

    upsertRentStatement({
      flatId: activeFlat.id,
      month: targetMonth,
      baseRent: rentAmount,
      startReading: lastMonthStartReading,
      endReading: currentEndReading,
      lastMonthBalance,
      paymentReceived: paymentAmount,
      paymentDate,
      attachment,
    });

    alert(
      `Rent payment saved for Flat #${activeFlat.flatNumber} (${activeFlat.tenantName})!\n` +
      `Rent: ${currency}${rentAmount.toLocaleString('en-IN')}\n` +
      `Electricity Bill: ${currency}${electricityBill.toFixed(2)} (${unitsConsumed} kWh)\n` +
      `Total Payable: ${currency}${totalAmount.toFixed(2)}\n` +
      `Payment: ${currency}${paymentAmount.toFixed(2)}\n` +
      `Balance: ${currency}${netBalance.toFixed(2)}`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-brand-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
                <span>ADD RENT PAYMENT</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-mono font-normal">
                  {targetMonth}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Uses flat settings for rent and tariff, then calculates electricity, payment, and carry-forward balance.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5 text-xs">

          {/* Top Row: searchable tenant selector & payment date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            <div className="sm:col-span-2">
              <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Search and select tenant or flat</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={tenantSearch}
                  onFocus={() => setIsTenantSearchOpen(true)}
                  onChange={(event) => {
                    setTenantSearch(event.target.value);
                    setIsTenantSearchOpen(true);
                  }}
                  placeholder={activeFlat
                    ? `${activeFlat.tenantName} — Flat #${activeFlat.flatNumber}`
                    : 'Search name, flat, phone, or building'}
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 py-2.5 pl-9 pr-3 font-medium text-slate-950 outline-none focus:border-sky-500"
                />
                {isTenantSearchOpen && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-300 bg-brand-surface p-1 shadow-xl">
                    {searchableFlats.length ? searchableFlats.map((flat) => {
                      const building = buildings.find(item => item.id === flat.buildingId);
                      return (
                        <Button
                          key={flat.id}
                          type="button"
                          onClick={() => {
                            setSelectedFlatId(flat.id);
                            setTenantSearch(`${flat.tenantName} — Flat #${flat.flatNumber}`);
                            setIsTenantSearchOpen(false);
                          }}
                          className={`w-full justify-start px-3 py-2 text-left text-xs ${
                            flat.id === selectedFlatId
                              ? 'bg-brand-tint text-brand-tab-active'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>
                            <strong>{flat.tenantName}</strong> · Flat #{flat.flatNumber}
                            <span className="block text-[10px] font-normal text-slate-500">
                              {building?.name} · {flat.tenantPhone || 'No phone'}
                            </span>
                          </span>
                        </Button>
                      );
                    }) : (
                      <p className="px-3 py-4 text-center text-xs text-slate-500">No active tenant or flat matches.</p>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Building: <strong className="text-slate-500">{activeBuilding?.name}</strong> · Entry month: <strong className="text-slate-500 font-mono">{targetMonth}</strong>
              </span>
            </div>

            <div>
              <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment Date</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => {
                  const date = e.target.value;
                  setPaymentDate(date);
                  if (date.length >= 7) {
                    setTargetMonth(date.slice(0, 7));
                    setTenantSearch('');
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono focus:outline-none focus:border-sky-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Select any past date to load tenants active in that month
              </span>
            </div>

          </div>

          {/* Section A: Rent (Auto-fetched from last month data) */}
          <div className="p-3.5 rounded-xl bg-slate-50/95 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>1. Monthly Rent ({currency})</span>
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                Predefined in flat settings
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">
                {currency}
              </span>
              <input
                type="number"
                step="100"
                min="0"
                value={rentAmount}
                readOnly
                className="w-full pl-8 pr-4 py-2 bg-slate-200/70 border border-slate-300 rounded-lg text-slate-950 font-mono font-bold text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Monthly rent is managed under this flat in Settings and cannot be changed from a payment entry.
            </p>
          </div>

          {/* Section B: Electricity (Last month reading + Fill current month reading + Fixed rate calculation) */}
          <div className="p-3.5 rounded-xl bg-slate-50/95 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-700" />
                <span>2. Electricity Consumption & Fixed Rate Tariff</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Tariff: {currency}{ratePerUnit}/kWh + {currency}{fixedMeterFee} meter base
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Electricity last month (Start Reading) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-700 font-medium">Electricity Last Month (Start kWh)</span>
                  <Button
                    type="button"
                    onClick={() => setIsStartReadingEditable(value => !value)}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    {isStartReadingEditable ? 'Lock value' : 'Modify'}
                  </Button>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={lastMonthStartReading}
                  onChange={(e) => setLastMonthStartReading(parseFloat(e.target.value) || 0)}
                  disabled={!isStartReadingEditable}
                  className="w-full px-3 py-2 bg-slate-100 disabled:bg-slate-200/70 border border-slate-300 rounded-lg text-slate-800 font-mono font-medium focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              {/* Electricity in which I will fill (Current Month Reading) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-sky-700 font-bold">Electricity Current Month (End kWh) [FILL HERE]</span>
                  <span className="text-[10px] text-emerald-700 font-bold font-mono">Active Input</span>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={currentEndReading}
                  onChange={(e) => setCurrentEndReading(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 bg-slate-100 border rounded-lg text-slate-950 font-mono font-bold text-sm focus:outline-none transition-colors ${
                    isReadingInvalid
                      ? 'border-rose-500 text-rose-600 bg-rose-50'
                      : 'border-sky-500 focus:border-sky-500 ring-1 ring-sky-300/40'
                  }`}
                  placeholder="Enter current meter reading"
                  required
                />
                {isReadingInvalid && (
                  <span className="text-[10px] text-rose-600 mt-1 block">
                    Must be &ge; last month reading ({lastMonthStartReading})
                  </span>
                )}
              </div>

            </div>

            {/* Live Tariff Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-brand-surface border border-slate-200 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block font-sans text-[10px]">Power Consumed:</span>
                <span className="text-sky-700 font-bold">{unitsConsumed.toLocaleString()} kWh</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px]">Energy @ {currency}{ratePerUnit}/unit:</span>
                <span className="text-slate-700">{currency}{energyCharges.toFixed(2)}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 block font-sans text-[10px]">Total Electricity Bill:</span>
                <span className="text-emerald-700 font-bold">{currency}{electricityBill.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Section C: Last Month Balance (Fetched from last month balance) */}
          <div className="p-3.5 rounded-xl bg-slate-50/95 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                <span>3. Last Month Balance ({currency})</span>
              </label>
              <Button
                type="button"
                onClick={() => setIsBalanceEditable(value => !value)}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                {isBalanceEditable ? 'Lock value' : 'Modify'}
              </Button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                value={lastMonthBalance}
                onChange={(e) => setLastMonthBalance(parseFloat(e.target.value) || 0)}
                disabled={!isBalanceEditable}
                className={`w-full pl-8 pr-4 py-2 bg-slate-100 border rounded-lg font-mono font-bold text-sm focus:outline-none ${
                  lastMonthBalance > 0
                    ? 'border-sky-500 text-sky-700'
                    : lastMonthBalance < 0
                    ? 'border-emerald-500/80 text-emerald-700'
                    : 'border-slate-300 text-slate-800'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Unpaid arrears (+{currency}) or advance payment credit (-{currency}) automatically retrieved from {previousMonthStr}.
            </p>
          </div>

          {/* Section D: Total Payable Calculation Box */}
          <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-brand-surface to-brand-tint p-4 shadow-[0_12px_40px_rgb(16_185_129/0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-950 uppercase tracking-wider text-[11px]">
                4. Total Amount Calculation
              </span>
              <span className="text-emerald-700 font-mono font-bold text-sm">
                = {currency}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Formula visualization */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-slate-500">
                <span>Rent:</span>
                <span className="text-slate-950">+{currency}{rentAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Electricity Bill ({unitsConsumed} kWh):</span>
                <span className="text-sky-700">+{currency}{electricityBill.toFixed(2)}</span>
              </div>
              {lastMonthBalance !== 0 && (
                <div className={`flex items-center justify-between ${lastMonthBalance > 0 ? 'text-sky-700' : 'text-emerald-700'}`}>
                  <span>Last Month Balance:</span>
                  <span>{lastMonthBalance > 0 ? `+${currency}${lastMonthBalance.toFixed(2)}` : `-${currency}${Math.abs(lastMonthBalance).toFixed(2)}`}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold text-slate-950 text-xs">
                <span className="font-sans">Total Amount (Rent + Elec Bill + Last Month Balance):</span>
                <span className="text-emerald-700 font-mono text-sm">{currency}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Section E: Payment & Balance Calculation */}
          <div className="p-3.5 rounded-xl bg-slate-50/95 border border-slate-200 space-y-3">
            <label className="text-slate-800 font-bold block">
              5. Payment & Net Balance Calculation
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 block mb-1 text-[11px]">
                  Payment Received ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-emerald-700 font-mono font-bold text-sm focus:outline-none focus:border-brand-accent"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(totalAmount)}
                    className="text-[10px] text-emerald-700 hover:underline cursor-pointer"
                  >
                    Set Full ({currency}{totalAmount.toFixed(2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(0)}
                    className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                  >
                    Clear (0.00)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 text-[11px]">
                  Balance (Total Amount - Payment)
                </label>
                <div className={`p-2.5 rounded-lg border font-mono font-bold text-sm flex items-center justify-between ${
                  netBalance > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <span className="text-[11px] font-sans font-normal text-slate-500">Net Due:</span>
                  <span>{currency}{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <span className={`mt-1 flex items-center gap-1 text-[10px] ${netBalance <= 0 ? 'text-emerald-700' : 'text-sky-700'}`}>
                  {netBalance <= 0 ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {netBalance <= 0 ? 'Account settled' : 'Pending balance will carry over'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/95 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-700" />
                <span>6. Supporting Attachment</span>
              </label>
              <span className="text-[10px] text-slate-400">PDF or image · max 1 MB</span>
            </div>
            {attachment ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-100 p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-blue-700" />
                  <div className="min-w-0">
                    <a
                      href={attachment.dataUrl}
                      download={attachment.name}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs font-semibold text-blue-700 hover:underline"
                    >
                      {attachment.name}
                    </a>
                    <p className="text-[10px] text-slate-400">{Math.ceil(attachment.size / 1024)} KB saved with this entry</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setAttachment(undefined)}
                  className="p-1.5 text-slate-500 hover:bg-slate-200 hover:text-rose-600"
                  title="Remove attachment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-brand-surface px-4 py-4 text-xs font-medium text-slate-500 hover:border-blue-500/50 hover:text-blue-700">
                <Paperclip className="h-4 w-4" />
                Choose receipt, bill, or supporting document
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => handleAttachment(event.target.files?.[0])}
                  className="hidden"
                />
              </label>
            )}
            {attachmentError && <p className="text-[11px] text-rose-600">{attachmentError}</p>}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReadingInvalid}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Rent Payment</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
