import React, { useEffect, useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { CurrencySymbol } from '../types';
import { Settings, X, Zap, RotateCcw } from 'lucide-react';
import { Heading, Input } from './ui/Primitives';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { buildings, flats, updateBuildingRates, updateBuilding, updateFlat, resetToSampleData } = useProperty();

  const [selectedBldId, setSelectedBldId] = useState<string>(buildings[0]?.id || '');
  const activeBuilding = buildings.find(b => b.id === selectedBldId) || buildings[0];

  const [ratePerUnit, setRatePerUnit] = useState<number>(activeBuilding?.electricityRatePerUnit || 9.0);
  const [fixedMeterFee, setFixedMeterFee] = useState<number>(activeBuilding?.fixedMeterCharge || 100);
  const [currency, setCurrency] = useState<CurrencySymbol>(activeBuilding?.currency || '₹');
  const [buildingName, setBuildingName] = useState(activeBuilding?.name || '');
  const [buildingAddress, setBuildingAddress] = useState(activeBuilding?.address || '');

  const [flatDrafts, setFlatDrafts] = useState<Record<string, {
    baseRent: number;
    electricityRatePerUnit: number;
    fixedUtilityCharge: number;
  }>>({});

  useEffect(() => {
    if (!isOpen) return;
    setFlatDrafts(Object.fromEntries(flats.map(flat => [flat.id, {
      baseRent: flat.baseRent,
      electricityRatePerUnit: flat.electricityRatePerUnit ?? activeBuilding?.electricityRatePerUnit ?? 9,
      fixedUtilityCharge: flat.fixedUtilityCharge ?? activeBuilding?.fixedMeterCharge ?? 0,
    }])));
  }, [isOpen, flats, activeBuilding?.electricityRatePerUnit, activeBuilding?.fixedMeterCharge]);

  if (!isOpen) return null;

  const handleSelectBuilding = (bldId: string) => {
    setSelectedBldId(bldId);
    const b = buildings.find(item => item.id === bldId);
    if (b) {
      setRatePerUnit(b.electricityRatePerUnit);
      setFixedMeterFee(b.fixedMeterCharge);
      setCurrency(b.currency);
      setBuildingName(b.name);
      setBuildingAddress(b.address);
    }
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBuilding) return;

    updateBuildingRates(activeBuilding.id, {
      electricityRatePerUnit: ratePerUnit,
      fixedMeterCharge: fixedMeterFee,
      currency,
    });
    updateBuilding({
      ...activeBuilding,
      name: buildingName.trim() || activeBuilding.name,
      address: buildingAddress.trim() || activeBuilding.address,
      electricityRatePerUnit: ratePerUnit,
      fixedMeterCharge: fixedMeterFee,
      currency,
    });
    flats
      .filter(flat => flat.buildingId === activeBuilding.id)
      .forEach(flat => {
        const draft = flatDrafts[flat.id];
        if (!draft) return;
        updateFlat({
          ...flat,
          baseRent: draft.baseRent,
          electricityRatePerUnit: draft.electricityRatePerUnit,
          fixedUtilityCharge: draft.fixedUtilityCharge,
        });
      });

    alert(`Bhagat Niwas details and flat-level rent and utility tariffs were updated.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-brand-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-brand-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <Heading className="text-base font-bold text-slate-950">Bhagat Niwas Flat Configuration</Heading>
              <p className="text-xs text-slate-500">
                Predefine monthly rent, electricity rate, and fixed utility charge for every flat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            {buildings.map(b => (
              <button
                key={b.id}
                onClick={() => handleSelectBuilding(b.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedBldId === b.id
                    ? 'bg-brand-tab-active text-white border border-brand-accent shadow-sm'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100/70'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Rate Configuration Form */}
        <form onSubmit={handleSaveRates} className="p-6 space-y-4 text-xs">
          
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Configuring Rates For:</span>
            <span className="font-bold text-slate-950 font-mono">{activeBuilding?.name} ({activeBuilding?.totalFlats} flats)</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Building Name
              </label>
              <input
                type="text"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none focus:border-brand-accent"
                required
              />
            </div>
            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Building Address
              </label>
              <input
                type="text"
                value={buildingAddress}
                onChange={(e) => setBuildingAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none focus:border-brand-accent"
                required
              />
            </div>
          </div>

          {/* Electricity Tariff per unit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-800 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-700" />
                <span>Electricity Tariff Rate (per kWh unit)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Formula: Units × Rate
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                {currency}
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono font-bold text-sm focus:outline-none focus:border-brand-accent"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Example: ₹9.00 means 250 units consumption equals ₹2,250.00.
            </p>
          </div>

          {/* Fixed Meter Base Charge & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Fixed Sub-Meter Line Charge ({currency})
              </label>
              <input
                type="number"
                step="10"
                value={fixedMeterFee}
                onChange={(e) => setFixedMeterFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Monthly meter service charge</span>
            </div>

            <div>
              <label className="text-slate-700 font-medium block mb-1">
                Unit of Measurement / Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
              >
                <option value="₹">₹ (INR - Indian Rupee)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="AED">AED (Dirham)</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <div className="border-b border-slate-300 bg-slate-100/90 px-4 py-3">
              <p className="font-bold text-slate-950">Flat-level rent and electricity tariff</p>
              <p className="mt-0.5 text-xs text-slate-500">
                These values are used automatically in Add Rent Payment and can vary by flat type.
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <div className="grid grid-cols-4 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Flat / Resident</span>
                <span>Monthly rent</span>
                <span>Rate per kWh</span>
                <span>Fixed charge</span>
              </div>
              {flats
                .filter(flat => flat.buildingId === activeBuilding?.id)
                .map(flat => {
                  const draft = flatDrafts[flat.id] || {
                    baseRent: flat.baseRent,
                    electricityRatePerUnit: flat.electricityRatePerUnit ?? ratePerUnit,
                    fixedUtilityCharge: flat.fixedUtilityCharge ?? fixedMeterFee,
                  };
                  const updateDraft = (key: keyof typeof draft, value: number) =>
                    setFlatDrafts(current => ({
                      ...current,
                      [flat.id]: { ...draft, [key]: value },
                    }));
                  return (
                    <div key={flat.id} className="grid grid-cols-4 items-center gap-2 border-b border-slate-200/70 px-3 py-2 last:border-b-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">Flat #{flat.flatNumber}</p>
                        <p className="truncate text-xs text-slate-500">{flat.isCommonArea ? 'Common area' : flat.tenantName}</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={draft.baseRent}
                        onChange={event => updateDraft('baseRent', Number(event.target.value) || 0)}
                        className="min-w-0 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 font-mono"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.electricityRatePerUnit}
                        onChange={event => updateDraft('electricityRatePerUnit', Number(event.target.value) || 0)}
                        className="min-w-0 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 font-mono"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.fixedUtilityCharge}
                        onChange={event => updateDraft('fixedUtilityCharge', Number(event.target.value) || 0)}
                        className="min-w-0 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 font-mono"
                      />
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Live Bill Calculation Sample Preview */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-slate-500 font-semibold block text-[11px]">
              Live Automated Calculation Preview (Sample 250 kWh usage):
            </span>
            <div className="font-mono text-xs text-slate-700 space-y-0.5">
              <div className="flex justify-between">
                <span>250 units × {currency}{ratePerUnit}/unit:</span>
                <span>{currency}{(250 * ratePerUnit).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>+ Fixed Meter Fee:</span>
                <span>{currency}{fixedMeterFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                <span>Total Electricity Bill:</span>
                <span>{currency}{(250 * ratePerUnit + fixedMeterFee).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset all buildings, tenants, billing, expenses, and maintenance data to the imported defaults?')) {
                  resetToSampleData();
                  onClose();
                }
              }}
              className="mr-auto flex items-center gap-1.5 px-2 py-2 text-[11px] font-medium text-rose-600 hover:text-rose-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset data
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg font-semibold shadow-sm"
            >
              Save & Recalculate Bills
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
