import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useProperty } from '../context/PropertyContext';
import { Flat } from '../types';
import { Button, Heading, Select } from './ui/Primitives';
import { formatMonth } from '../utils/formatMonth';
import { 
  Users, 
  CalendarRange,
  Plus, 
  Edit3, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Home, 
  Zap, 
  X, 
  Save,
  CalendarOff,
  UserPlus,
  Trash2
} from 'lucide-react';

export const FlatsDirectoryView: React.FC = () => {
  const {
    flats,
    buildings,
    statements,
    selectedBuildingId,
    selectedMonth,
    setSelectedMonth,
    updateFlat,
    addFlat,
    deleteFlat,
    endLease,
  } = useProperty();

  const [reportMonth, setReportMonth] = useState(selectedMonth);
  const [headerPortalTarget, setHeaderPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHeaderPortalTarget(document.getElementById('report-filter-slot'));
  }, []);

  // Edit Flat Modal state
  const [editingFlat, setEditingFlat] = useState<Flat | null>(null);

  // Add Flat Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBldId, setNewBldId] = useState<string>(buildings[0]?.id || '');
  const [newFlatNum, setNewFlatNum] = useState<string>('');
  const [newFloor, setNewFloor] = useState<number>(1);
  const [newTenantName, setNewTenantName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRent, setNewRent] = useState<number>(20000);
  const [newLeaseStart, setNewLeaseStart] = useState(new Date().toISOString().split('T')[0]);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';
  const buildingFlats = useMemo(
    () =>
      flats.filter(
        flat =>
          selectedBuildingId === 'all' ||
          flat.buildingId === selectedBuildingId,
      ),
    [flats, selectedBuildingId],
  );
  const availableMonths = useMemo(
    () =>
      Array.from(
        new Set(
          statements
            .filter(statement =>
              selectedBuildingId === 'all' ||
              statement.buildingId === selectedBuildingId,
            )
            .map(statement => statement.month),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [statements, selectedBuildingId],
  );
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(reportMonth)) {
      setReportMonth(availableMonths[0]);
    }
  }, [availableMonths, reportMonth]);

  const layoutItems = useMemo(() => {
    const monthStatements = statements.filter(
      statement =>
        statement.month === reportMonth &&
        (selectedBuildingId === 'all' ||
          statement.buildingId === selectedBuildingId),
    );
    const currentFlatsById = new Map(flats.map(flat => [flat.id, flat]));
    const hasCurrentFlatLinks = monthStatements.some(statement =>
      currentFlatsById.has(statement.flatId),
    );
    const statementFlatIds = new Set(
      monthStatements.map(statement => statement.flatId),
    );
    const inferFloor = (flatNumber: string) => {
      const number = Number(flatNumber.replace(/\D/g, ''));
      if (!number || number <= 14) return 1;
      if (number <= 28) return 2;
      return 3;
    };

    const statementItems = monthStatements.map(statement => {
      const flat = currentFlatsById.get(statement.flatId);
      return {
        key: statement.id,
        flat,
        flatNumber: statement.flatNumber,
        floor: flat?.floor ?? inferFloor(statement.flatNumber),
        tenantName: statement.tenantName,
        isOccupied: true,
        isCommonArea: false,
        balance: statement.balanceThisMonth,
        leaseStartDate: flat?.leaseStartDate,
      };
    });
    const staticItems = buildingFlats
      .filter(flat =>
        flat.isCommonArea ||
        (hasCurrentFlatLinks && !statementFlatIds.has(flat.id)),
      )
      .map(flat => ({
        key: flat.id,
        flat,
        flatNumber: flat.flatNumber,
        floor: flat.floor,
        tenantName: flat.isCommonArea ? flat.tenantName : 'Vacant',
        isOccupied: flat.isOccupied,
        isCommonArea: flat.isCommonArea,
        balance: 0,
        leaseStartDate: flat.leaseStartDate,
      }));

    return [...statementItems, ...staticItems];
  }, [statements, reportMonth, selectedBuildingId, flats, buildingFlats]);

  const floorLabel = (floor: number) => {
    if (floor === 0) return 'Ground floor';
    if (floor === 1) return '1st floor';
    if (floor === 2) return '2nd floor';
    return `Floor ${floor}`;
  };

  const handleSaveFlatEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlat) return;
    updateFlat(editingFlat);
    setEditingFlat(null);
  };

  const openAddTenant = () => {
    setNewBldId(
      selectedBuildingId === 'all'
        ? buildings[0]?.id || ''
        : selectedBuildingId,
    );
    setIsAddModalOpen(true);
  };

  const handleAddNewFlat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlatNum) {
      alert('Please fill in a flat number');
      return;
    }
    const bld = buildings.find(b => b.id === newBldId) || buildings[0];
    const duplicateFlat = flats.find(
      flat => flat.buildingId === bld.id && flat.flatNumber.toLowerCase() === newFlatNum.toLowerCase()
    );
    if (duplicateFlat) {
      alert(
        duplicateFlat.isOccupied
          ? `Flat #${newFlatNum} already has an active tenant.`
          : `Flat #${newFlatNum} already exists. Open "Ended / Vacant", edit that flat, and set the new lease to Active.`
      );
      return;
    }
    const newFlat: Flat = {
      id: `${bld.id}-${newFlatNum}`,
      buildingId: bld.id,
      flatNumber: newFlatNum,
      floor: newFloor,
      tenantName: newTenantName || 'Vacant',
      tenantPhone: newPhone || '+1 (555) 000-0000',
      tenantEmail: newEmail || 'tenant@example.com',
      baseRent: newRent,
      meterNumber: `MTR-${bld.name.slice(0, 3).toUpperCase()}-${newFlatNum}`,
      electricityRatePerUnit: bld.electricityRatePerUnit,
      fixedUtilityCharge: bld.fixedMeterCharge,
      isOccupied: Boolean(newTenantName.trim()),
      isCommonArea: false,
      leaseStatus: newTenantName.trim() ? 'ACTIVE' : 'CLOSED',
      leaseStartDate: newLeaseStart,
    };

    addFlat(newFlat);
    setIsAddModalOpen(false);
    setNewFlatNum('');
    setNewTenantName('');
    setNewPhone('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      {headerPortalTarget && createPortal(
        <div className="flex min-w-max items-center gap-2 px-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <CalendarRange className="h-4 w-4 text-slate-500" />
            <Select
              value={reportMonth}
              onChange={event => {
                setReportMonth(event.target.value);
                setSelectedMonth(event.target.value);
              }}
              className="bg-transparent font-mono text-xs text-slate-950 outline-none"
              aria-label="Filter layout by month"
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>{formatMonth(month)}</option>
              ))}
            </Select>
          </div>

        </div>,
        headerPortalTarget,
      )}

      <div className="app-surface rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Heading className="text-sm font-bold text-slate-950">
                {selectedBuildingId === 'all'
                  ? 'All buildings occupancy layout'
                  : `${activeBuilding?.name || 'Building'} occupancy layout`}
                {' · '}
                {formatMonth(reportMonth)}
              </Heading>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-800"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Active</span>
              <span className="flex items-center gap-1.5 text-slate-700"><span className="h-2.5 w-2.5 rounded-full border border-slate-400 bg-white" />Vacant</span>
              <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Common area</span>
            </div>
          </div>
          {layoutItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <Heading className="text-sm font-bold text-slate-950">
                {buildingFlats.length === 0
                  ? 'No building layout has been created yet'
                  : 'No tenant records for the selected month'}
              </Heading>
              <p className="mt-1 text-xs text-slate-500">
                {buildingFlats.length === 0
                  ? 'Create the first flat to start this building layout.'
                  : 'Choose another month to view its building layout.'}
              </p>
              {buildingFlats.length === 0 && selectedBuildingId !== 'all' && (
                <Button
                  type="button"
                  onClick={openAddTenant}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Create first flat
                </Button>
              )}
            </div>
          ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {Array.from(new Set(layoutItems
              .map(item => item.floor)))
              .sort((a, b) => a - b)
              .map(floor => (
                <section key={floor} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                      {floorLabel(floor)}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] font-semibold text-slate-400 shadow-sm">
                      {layoutItems.filter(item => item.floor === floor).length} units
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                    {layoutItems
                      .filter(item => item.floor === floor)
                      .sort((a, b) => a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }))
                      .map(item => (
                        <Button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            if (item.flat) setEditingFlat({ ...item.flat });
                          }}
                          title={item.flat ? 'Edit flat or tenant' : 'Historical tenant record'}
                          className={`flex min-h-20 flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center shadow-sm transition-all ${
                            item.isCommonArea
                              ? 'border-slate-500 bg-slate-400 text-slate-950 hover:bg-slate-300'
                              : item.isOccupied
                                ? 'border-emerald-900 bg-emerald-800 text-white hover:-translate-y-0.5 hover:bg-emerald-700'
                                : 'border-slate-200 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-slate-300'
                          }`}
                        >
                          <span className={`block font-mono text-xs font-medium leading-none ${
                            item.isOccupied && !item.isCommonArea
                              ? 'text-emerald-100'
                              : 'text-slate-500'
                          }`}>
                            {item.flatNumber}
                          </span>
                          <span className={`mt-2 block w-full truncate text-xs font-bold leading-none ${
                            item.isOccupied && !item.isCommonArea
                              ? 'text-white'
                              : 'text-slate-950'
                          }`}>
                            {item.tenantName}
                            {!item.tenantName.includes('(') &&
                              item.leaseStartDate &&
                              ` (${item.leaseStartDate.slice(8, 10)})`}
                          </span>
                          {item.isCommonArea ? (
                            <span className="mt-2 block text-[10px] font-semibold leading-none text-slate-500">
                              Common area
                            </span>
                          ) : (
                            <span className={`mt-2 block font-mono text-xs font-bold leading-none ${
                              item.isOccupied
                                ? item.balance > 0
                                  ? 'text-rose-200'
                                  : 'text-emerald-100'
                                : item.balance > 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-700'
                            }`}>
                              {currency}{item.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </Button>
                      ))}
                  </div>
                </section>
              ))}
          </div>
          )}
      </div>

      {/* Edit Flat Modal */}
      {editingFlat && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950">Edit Flat #{editingFlat.flatNumber}</h2>
              <button
                onClick={() => setEditingFlat(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Close edit tenant dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFlatEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-medium block mb-1">Tenant Name</label>
                <input
                  type="text"
                  value={editingFlat.tenantName}
                  onChange={(e) => setEditingFlat({ ...editingFlat, tenantName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Tenant Phone</label>
                <input
                  type="text"
                  value={editingFlat.tenantPhone}
                  onChange={(e) => setEditingFlat({ ...editingFlat, tenantPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Tenant Email</label>
                <input
                  type="email"
                  value={editingFlat.tenantEmail}
                  onChange={(e) => setEditingFlat({ ...editingFlat, tenantEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                />
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Monthly Base Rent ({currency})</label>
                <input
                  type="number"
                  value={editingFlat.baseRent}
                  onChange={(e) => setEditingFlat({ ...editingFlat, baseRent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Current Lease Start</label>
                  <input
                    type="date"
                    value={editingFlat.leaseStartDate}
                    onChange={(e) => setEditingFlat({
                      ...editingFlat,
                      leaseStartDate: e.target.value,
                    })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Lease Status</label>
                  <select
                    value={editingFlat.isCommonArea ? 'COMMON' : editingFlat.isOccupied ? 'ACTIVE' : 'ENDED'}
                    onChange={(e) => setEditingFlat({
                      ...editingFlat,
                      isOccupied: e.target.value === 'ACTIVE',
                      isCommonArea: e.target.value === 'COMMON',
                      leaseStatus: e.target.value === 'ACTIVE' ? 'ACTIVE' : 'CLOSED',
                      tenantName: e.target.value === 'COMMON'
                        ? 'Common Area'
                        : editingFlat.tenantName,
                      leaseEndDate: e.target.value === 'ACTIVE'
                        ? undefined
                        : editingFlat.leaseEndDate || new Date().toISOString().split('T')[0],
                    })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                  >
                    <option value="ACTIVE">Active tenant</option>
                    <option value="ENDED">Lease ended / vacant</option>
                    <option value="COMMON">Common area · not rentable</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete Flat #${editingFlat.flatNumber} and its linked records?`)) {
                      deleteFlat(editingFlat.id);
                      setEditingFlat(null);
                    }
                  }}
                  className="mr-auto flex items-center gap-1.5 px-3 py-2 text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete flat
                </Button>
                <button
                  type="button"
                  onClick={() => setEditingFlat(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Flat Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950">Add New Tenant & Apartment</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Close add tenant dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewFlat} className="p-6 space-y-4 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Flat Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 805"
                    value={newFlatNum}
                    onChange={(e) => setNewFlatNum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Floor Level</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newFloor}
                    onChange={(e) => setNewFloor(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Tenant Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Daniel Taylor"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="tenant@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Lease Start Date</label>
                  <input
                    type="date"
                    value={newLeaseStart}
                    onChange={(e) => setNewLeaseStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 123-4567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Monthly Rent ({currency})</label>
                  <input
                    type="number"
                    value={newRent}
                    onChange={(e) => setNewRent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold rounded-lg"
                >
                  Add Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
