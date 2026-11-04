import React, { useEffect, useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { Settings, X, RotateCcw, Plus, Building2, Trash2, Zap } from 'lucide-react';
import { Button, Heading, Input } from './ui/Primitives';
import {
  loadElectricityMeters,
  saveElectricityMeters,
} from '../utils/electricityMeters';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    buildings,
    flats,
    selectedBuildingId,
    setSelectedBuildingId,
    updateBuilding,
    updateFlat,
    addBuilding,
    resetToSampleData,
  } = useProperty();

  const [selectedBldId, setSelectedBldId] = useState<string>(
    selectedBuildingId === 'all' ? buildings[0]?.id || '' : selectedBuildingId,
  );
  const activeBuilding = buildings.find(b => b.id === selectedBldId) || buildings[0];

  const [buildingName, setBuildingName] = useState(activeBuilding?.name || '');
  const [buildingAddress, setBuildingAddress] = useState(activeBuilding?.address || '');
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');
  const [newBuildingFloors, setNewBuildingFloors] = useState(1);
  const [newBuildingUnits, setNewBuildingUnits] = useState(1);
  const [newBuildingRate, setNewBuildingRate] = useState(9);
  const [electricityMeters, setElectricityMeters] = useState<string[]>(
    loadElectricityMeters,
  );

  const [flatDrafts, setFlatDrafts] = useState<Record<string, {
    tenantName: string;
    baseRent: number;
    electricityRatePerUnit: number;
  }>>({});

  useEffect(() => {
    if (!isOpen) return;
    const buildingId =
      selectedBuildingId === 'all'
        ? buildings[0]?.id || ''
        : selectedBuildingId;
    setSelectedBldId(buildingId);
    const selectedBuilding = buildings.find(building => building.id === buildingId);
    if (selectedBuilding) {
      setBuildingName(selectedBuilding.name);
      setBuildingAddress(selectedBuilding.address);
    }
    setElectricityMeters(loadElectricityMeters());
    setFlatDrafts(Object.fromEntries(flats.map(flat => [flat.id, {
      tenantName: flat.tenantName,
      baseRent: flat.baseRent,
      electricityRatePerUnit: flat.electricityRatePerUnit ?? activeBuilding?.electricityRatePerUnit ?? 9,
    }])));
  }, [
    isOpen,
    flats,
    buildings,
    selectedBuildingId,
    activeBuilding?.electricityRatePerUnit,
  ]);

  if (!isOpen) return null;

  const handleSelectBuilding = (bldId: string) => {
    setSelectedBldId(bldId);
    setSelectedBuildingId(bldId);
    const b = buildings.find(item => item.id === bldId);
    if (b) {
      setBuildingName(b.name);
      setBuildingAddress(b.address);
    }
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBuilding) return;
    const normalizedMeters = electricityMeters
      .map(meter => meter.trim())
      .filter(Boolean);
    if (normalizedMeters.length === 0) {
      alert('Please keep at least one electricity meter.');
      return;
    }
    if (
      new Set(normalizedMeters.map(meter => meter.toLowerCase())).size !==
      normalizedMeters.length
    ) {
      alert('Electricity meter names must be unique.');
      return;
    }

    updateBuilding({
      ...activeBuilding,
      name: buildingName.trim() || activeBuilding.name,
      address: buildingAddress.trim() || activeBuilding.address,
      fixedMeterCharge: 0,
      currency: '₹',
    });
    flats
      .filter(flat => flat.buildingId === activeBuilding.id)
      .forEach(flat => {
        const draft = flatDrafts[flat.id];
        if (!draft) return;
        updateFlat({
          ...flat,
          tenantName: draft.tenantName.trim() || flat.tenantName,
          baseRent: draft.baseRent,
          electricityRatePerUnit: draft.electricityRatePerUnit,
          fixedUtilityCharge: 0,
        });
      });

    saveElectricityMeters(normalizedMeters);
    setElectricityMeters(normalizedMeters);
    alert('Building details, electricity meters, rent, and utility tariffs were updated.');
    onClose();
  };

  const handleAddBuilding = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newBuildingName.trim();
    if (!name) return;
    const id = `bld-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
    const address = newBuildingAddress.trim() || 'Address not provided';
    addBuilding({
      id,
      name,
      address,
      totalFloors: Math.max(1, newBuildingFloors),
      totalFlats: Math.max(0, newBuildingUnits),
      electricityRatePerUnit: Math.max(0, newBuildingRate),
      fixedMeterCharge: 0,
      currency: '₹',
    });
    setSelectedBldId(id);
    setSelectedBuildingId(id);
    setBuildingName(name);
    setBuildingAddress(address);
    setNewBuildingName('');
    setNewBuildingAddress('');
    setNewBuildingFloors(1);
    setNewBuildingUnits(1);
    setNewBuildingRate(9);
    setIsAddingBuilding(false);
  };

  const addElectricityMeter = () => {
    let meterNumber = electricityMeters.length + 1;
    let name = `Meter ${meterNumber}`;
    while (
      electricityMeters.some(
        meter => meter.toLowerCase() === name.toLowerCase(),
      )
    ) {
      meterNumber += 1;
      name = `Meter ${meterNumber}`;
    }
    setElectricityMeters(current => [...current, name]);
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
              <Heading className="text-base font-bold text-slate-950">Building & Flat Configuration</Heading>
              <p className="text-xs text-slate-500">
                Edit each tenant name, monthly rent, and flat-level electricity tariff in Indian Rupees
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
            <Button
              type="button"
              onClick={() => setIsAddingBuilding(value => !value)}
              className="ml-auto shrink-0 gap-1.5 border border-brand-primary/30 bg-brand-tint px-3 py-1.5 font-semibold text-brand-tab-active"
            >
              <Plus className="h-3.5 w-3.5" />
              Add building
            </Button>
          </div>
        </div>

        {isAddingBuilding && (
          <form onSubmit={handleAddBuilding} className="border-b border-slate-200 bg-brand-tint/50 px-6 py-4 text-xs">
            <div className="mb-3 flex items-center gap-2 font-bold text-slate-950">
              <Building2 className="h-4 w-4 text-brand-primary" />
              New building details
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                value={newBuildingName}
                onChange={event => setNewBuildingName(event.target.value)}
                placeholder="Building name"
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 lg:col-span-2"
                required
              />
              <Input
                value={newBuildingAddress}
                onChange={event => setNewBuildingAddress(event.target.value)}
                placeholder="Address"
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 lg:col-span-2"
              />
              <Input
                type="number"
                min="1"
                value={newBuildingFloors}
                onChange={event => setNewBuildingFloors(Number(event.target.value) || 1)}
                aria-label="Total floors"
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2"
              />
              <Input
                type="number"
                min="0"
                value={newBuildingUnits}
                onChange={event => setNewBuildingUnits(Number(event.target.value) || 0)}
                aria-label="Total flats"
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newBuildingRate}
                onChange={event => setNewBuildingRate(Number(event.target.value) || 0)}
                aria-label="Electricity rate per unit"
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2"
              />
              <div className="flex gap-2 lg:col-span-3 lg:justify-end">
                <Button
                  type="button"
                  onClick={() => setIsAddingBuilding(false)}
                  className="border border-slate-300 bg-slate-100 px-4 py-2 text-slate-700"
                >
                  Cancel
                </Button>
                <Button type="submit" className="gap-1.5 bg-brand-primary px-4 py-2 font-semibold text-white">
                  <Plus className="h-3.5 w-3.5" />
                  Create building
                </Button>
              </div>
            </div>
          </form>
        )}

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

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-slate-100/90 px-4 py-3">
              <div>
                <p className="flex items-center gap-2 font-bold text-slate-950">
                  <Zap className="h-4 w-4 text-violet-700" />
                  Electricity expense meters
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  These meters appear in the Electricity Paid expense dropdown.
                </p>
              </div>
              <Button
                type="button"
                onClick={addElectricityMeter}
                className="shrink-0 gap-1.5 border border-violet-200 bg-violet-50 px-3 py-2 font-semibold text-violet-700 hover:bg-violet-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add meter
              </Button>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {electricityMeters.map((meter, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={meter}
                    onChange={event =>
                      setElectricityMeters(current =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                    aria-label={`Electricity meter ${index + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-mono"
                    required
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      setElectricityMeters(current =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    disabled={electricityMeters.length === 1}
                    className="border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                    title="Remove meter"
                    aria-label={`Remove ${meter}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
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
                <span>Flat</span>
                <span>Tenant name</span>
                <span>Monthly rent</span>
                <span>Rate per kWh</span>
              </div>
              {flats
                .filter(flat => flat.buildingId === activeBuilding?.id)
                .map(flat => {
                  const draft = flatDrafts[flat.id] || {
                    tenantName: flat.tenantName,
                    baseRent: flat.baseRent,
                    electricityRatePerUnit: flat.electricityRatePerUnit ?? activeBuilding?.electricityRatePerUnit ?? 9,
                  };
                  const updateDraft = (key: keyof typeof draft, value: number | string) =>
                    setFlatDrafts(current => ({
                      ...current,
                      [flat.id]: { ...draft, [key]: value },
                    }));
                  return (
                    <div key={flat.id} className="grid grid-cols-4 items-center gap-2 border-b border-slate-200/70 px-3 py-2 last:border-b-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">Flat #{flat.flatNumber}</p>
                      </div>
                      <Input
                        type="text"
                        value={draft.tenantName}
                        onChange={event => updateDraft('tenantName', event.target.value)}
                        className="min-w-0 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5"
                      />
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
                    </div>
                  );
                })}
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
