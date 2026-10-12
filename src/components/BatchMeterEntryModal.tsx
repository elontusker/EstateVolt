import React, { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { Zap, X, Check, Save, RotateCcw, AlertTriangle } from 'lucide-react';

interface BatchMeterEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchMeterEntryModal: React.FC<BatchMeterEntryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    buildings,
    statements,
    selectedBuildingId,
    selectedMonth,
    batchUpdateReadings
  } = useProperty();

  const [activeBuildingId, setActiveBuildingId] = useState<string>(
    selectedBuildingId === 'all' ? (buildings[0]?.id || '') : selectedBuildingId
  );

  // Filter statements for selected building and month
  const buildingStatements = statements.filter(
    s => s.buildingId === activeBuildingId && s.month === selectedMonth
  );

  const activeBuilding = buildings.find(b => b.id === activeBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';
  const ratePerUnit = activeBuilding ? activeBuilding.electricityRatePerUnit : 9.0;
  const fixedCharge = activeBuilding ? activeBuilding.fixedMeterCharge : 100;

  // Local state for batch inputs: map of statementId -> endReading
  const [readingsState, setReadingsState] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    buildingStatements.forEach(s => {
      initial[s.id] = s.endReading;
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleReadingChange = (statementId: string, val: string) => {
    const num = parseFloat(val);
    setReadingsState(prev => ({
      ...prev,
      [statementId]: isNaN(num) ? 0 : num,
    }));
  };

  const handleSimulateQuickReadings = () => {
    // Helpful simulation button: landlord can click to advance readings by a standard realistic consumption (+180 to +350 kWh)
    const simulated: Record<string, number> = {};
    buildingStatements.forEach((s, idx) => {
      const increment = 190 + ((idx * 33) % 200);
      simulated[s.id] = s.startReading + increment;
    });
    setReadingsState(simulated);
  };

  const handleSaveAll = () => {
    // Validate that no end reading is strictly less than start reading
    const updates: { statementId: string; endReading: number }[] = [];
    for (const stmt of buildingStatements) {
      const end = readingsState[stmt.id] !== undefined ? readingsState[stmt.id] : stmt.endReading;
      if (end < stmt.startReading) {
        alert(`Validation Error: Flat #${stmt.flatNumber} has end reading (${end}) lower than start reading (${stmt.startReading}).`);
        return;
      }
      updates.push({ statementId: stmt.id, endReading: end });
    }

    batchUpdateReadings(updates);
    alert(`Successfully updated meter readings for ${updates.length} flats in ${activeBuilding?.name}!`);
    onClose();
  };

  // Calculate live aggregate stats for the batch
  let totalBatchUnits = 0;
  let totalBatchCost = 0;
  buildingStatements.forEach(s => {
    const currentEnd = readingsState[s.id] !== undefined ? readingsState[s.id] : s.endReading;
    const units = Math.max(0, currentEnd - s.startReading);
    totalBatchUnits += units;
    totalBatchCost += (units * ratePerUnit + fixedCharge);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-slate-200 rounded-2xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-brand-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
                <span>Fast Batch Meter Entry</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-mono font-normal">
                  {buildingStatements.length} Meters Listed
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Quickly input month-end electricity meter readings across every active apartment with live tariff calculation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Building selector & Controls strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Target Building:</span>
            <select
              value={activeBuildingId}
              onChange={(e) => setActiveBuildingId(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-950 font-medium focus:outline-none"
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.totalFlats} Flats)
                </option>
              ))}
            </select>
            <span className="text-slate-500 font-mono">
              Tariff: {currency}{ratePerUnit}/kWh + {currency}{fixedCharge} base
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-slate-700">
              Batch Consumption: <strong className="text-sky-700">{totalBatchUnits.toLocaleString()} kWh</strong>
              <span className="text-slate-500 ml-2">({currency}{totalBatchCost.toFixed(2)})</span>
            </div>
            <button
              type="button"
              onClick={handleSimulateQuickReadings}
              className="px-2.5 py-1 text-[11px] text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
              title="Auto-fill with realistic consumption increments"
            >
              Auto-fill Increments
            </button>
          </div>
        </div>

        {/* Scrollable Grid Table */}
        <div className="overflow-y-auto flex-1 p-6 space-y-2">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="sticky top-0 z-10 bg-brand-surface shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-sans font-semibold">
                <th className="py-2.5 px-3">Flat</th>
                <th className="py-2.5 px-3">Tenant Name</th>
                <th className="py-2.5 px-3">Meter ID</th>
                <th className="py-2.5 px-3 text-right">Start Reading</th>
                <th className="py-2.5 px-3 text-right text-sky-700 font-bold">End Reading [INPUT]</th>
                <th className="py-2.5 px-3 text-right text-sky-700 font-bold">Total Units</th>
                <th className="py-2.5 px-3 text-right text-emerald-700 font-bold">Electricity Cost</th>
                <th className="py-2.5 px-3 text-right text-slate-700 font-semibold">Rent</th>
                <th className="py-2.5 px-3 text-right text-slate-500">Last Month Balance</th>
                <th className="py-2.5 px-3 text-right text-slate-950 font-bold bg-slate-100/90 border-x border-slate-300/70">
                  <div className="flex flex-col items-end">
                    <span>Total Amount</span>
                    <span className="text-[9px] text-slate-500 font-normal font-sans">(Rent + Elec + Last Bal)</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right text-emerald-700 font-semibold">Payment</th>
                <th className="py-2.5 px-3 text-right text-rose-600 font-bold bg-slate-100/90 border-l border-slate-300/70">
                  <div className="flex flex-col items-end">
                    <span>Balance</span>
                    <span className="text-[9px] text-rose-500 font-normal font-sans">(Total Amount - Payment)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {buildingStatements.map((stmt, idx) => {
                const currentEnd = readingsState[stmt.id] !== undefined ? readingsState[stmt.id] : stmt.endReading;
                const units = Math.max(0, currentEnd - stmt.startReading);
                const cost = Number((units * ratePerUnit + fixedCharge).toFixed(2));
                const flatRent = stmt.baseRent;
                const lastBal = stmt.lastMonthBalance;
                const totalAmt = Number((flatRent + cost + lastBal).toFixed(2));
                const payment = stmt.paymentReceived;
                const balance = Number((totalAmt - payment).toFixed(2));
                const isInvalid = currentEnd < stmt.startReading;

                return (
                  <tr
                    key={stmt.id}
                    className={`hover:bg-slate-100/70 transition-colors ${
                      isInvalid ? 'bg-rose-50' : idx % 2 === 0 ? 'bg-brand-surface' : 'bg-brand-surface/80'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-950 whitespace-nowrap">
                      #{stmt.flatNumber}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-700 whitespace-nowrap">
                      {stmt.tenantName}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {stmt.meterNumber}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                      {stmt.startReading.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={readingsState[stmt.id] ?? stmt.endReading}
                          onChange={(e) => handleReadingChange(stmt.id, e.target.value)}
                          className={`w-24 px-2 py-1 text-right bg-slate-100 border rounded text-xs font-mono font-bold focus:outline-none transition-colors ${
                            isInvalid
                              ? 'border-rose-500 text-rose-600 bg-rose-50'
                              : 'border-slate-300 text-slate-950 focus:border-sky-500'
                          }`}
                        />
                      </div>
                      {isInvalid && (
                        <div className="text-[10px] text-rose-600 font-sans mt-0.5">
                          Must be &ge; {stmt.startReading}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-sky-700 tabular-nums whitespace-nowrap">
                      {units.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                      {currency}{cost.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                      {currency}{flatRent.toLocaleString('en-IN')}
                    </td>
                    <td className={`py-2 px-3 text-right tabular-nums whitespace-nowrap ${lastBal > 0 ? 'text-sky-700 font-semibold' : lastBal < 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {lastBal > 0 ? `+${currency}${lastBal.toFixed(2)}` : lastBal < 0 ? `-${currency}${Math.abs(lastBal).toFixed(2)}` : '0.00'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-950 tabular-nums bg-brand-surface/80 border-x border-slate-200 whitespace-nowrap">
                      {currency}{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                      {payment > 0 ? `${currency}${payment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0.00'}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold tabular-nums bg-brand-surface/80 border-l border-slate-200 whitespace-nowrap ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {currency}{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Applying changes will automatically re-compute total dues and balances for all {buildingStatements.length} flats.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply All Readings</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
