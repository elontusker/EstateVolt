import React, { useState, useMemo } from 'react';
import { useProperty } from '../context/PropertyContext';
import { Flat } from '../types';
import { Button, Heading } from './ui/Primitives';
import { 
  Users, 
  Search, 
  Building2, 
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
  LayoutGrid,
  List,
  Trash2
} from 'lucide-react';

export const FlatsDirectoryView: React.FC = () => {
  const { flats, buildings, selectedBuildingId, updateFlat, addFlat, deleteFlat, endLease } = useProperty();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [occupancyFilter, setOccupancyFilter] = useState<'ACTIVE' | 'VACANT' | 'ALL'>('ACTIVE');
  const [viewMode, setViewMode] = useState<'LAYOUT' | 'LIST'>('LAYOUT');

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

  const filteredFlats = useMemo(() => {
    return flats.filter((flat) => {
      if (selectedBuildingId !== 'all' && flat.buildingId !== selectedBuildingId) {
        return false;
      }
      if (selectedFloor !== 'ALL' && flat.floor !== parseInt(selectedFloor, 10)) {
        return false;
      }
      if (occupancyFilter === 'ACTIVE' && (!flat.isOccupied || flat.isCommonArea)) return false;
      if (occupancyFilter === 'VACANT' && (flat.isOccupied || flat.isCommonArea)) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchFlat = flat.flatNumber.toLowerCase().includes(q);
        const matchTenant = flat.tenantName.toLowerCase().includes(q);
        const matchPhone = flat.tenantPhone.toLowerCase().includes(q);
        const matchMeter = flat.meterNumber.toLowerCase().includes(q);
        if (!matchFlat && !matchTenant && !matchPhone && !matchMeter) {
          return false;
        }
      }
      return true;
    });
  }, [flats, selectedBuildingId, selectedFloor, occupancyFilter, searchTerm]);

  const buildingMap = useMemo(() => {
    return new Map(buildings.map(b => [b.id, b.name]));
  }, [buildings]);

  const handleSaveFlatEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlat) return;
    updateFlat(editingFlat);
    setEditingFlat(null);
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
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-950">
            <span>Active Tenant & Lease Directory</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono font-normal">
              {flats.filter(flat => flat.isOccupied && (selectedBuildingId === 'all' || flat.buildingId === selectedBuildingId)).length} Active Tenants
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            One-page tenant list with lease status, contact details, rent, meter IDs, and end-lease actions.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Tenant</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-xl bg-brand-surface/90 border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search flat number, tenant name, phone or meter ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/90 border border-slate-300/70 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* Floor Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Filter Floor:</span>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-950 focus:outline-none"
          >
            <option value="ALL">All Floors</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(fl => (
              <option key={fl} value={fl}>Floor {fl}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Lease Status:</span>
          <select
            value={occupancyFilter}
            onChange={(e) => setOccupancyFilter(e.target.value as 'ACTIVE' | 'VACANT' | 'ALL')}
            className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-950 focus:outline-none"
          >
            <option value="ACTIVE">Active Tenants</option>
            <option value="VACANT">Ended / Vacant</option>
            <option value="ALL">All Flats</option>
          </select>
        </div>

        <div className="flex items-center rounded-lg border border-slate-300 bg-slate-100 p-0.5">
          <Button
            type="button"
            onClick={() => setViewMode('LAYOUT')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold ${
              viewMode === 'LAYOUT' ? 'bg-brand-tab-active text-white' : 'text-slate-500'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Layout
          </Button>
          <Button
            type="button"
            onClick={() => setViewMode('LIST')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold ${
              viewMode === 'LIST' ? 'bg-brand-tab-active text-white' : 'text-slate-500'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
        </div>

      </div>

      {viewMode === 'LAYOUT' && (
        <div className="app-surface rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Heading className="text-sm font-bold text-slate-950">Bhagat Niwas occupancy layout</Heading>
              <p className="mt-0.5 text-xs text-slate-500">Select a unit to edit its resident, rent, tariff, or availability.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-800"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Occupied</span>
              <span className="flex items-center gap-1.5 text-rose-700"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Vacant</span>
              <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Common area</span>
            </div>
          </div>
          <div className="space-y-4">
            {Array.from(new Set(flats
              .filter(flat => selectedBuildingId === 'all' || flat.buildingId === selectedBuildingId)
              .map(flat => flat.floor)))
              .sort((a, b) => a - b)
              .map(floor => (
                <section key={floor}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Floor {floor}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    {flats
                      .filter(flat => flat.floor === floor && (selectedBuildingId === 'all' || flat.buildingId === selectedBuildingId))
                      .sort((a, b) => a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }))
                      .map(flat => (
                        <Button
                          key={flat.id}
                          type="button"
                          onClick={() => setEditingFlat({ ...flat })}
                          className={`min-h-20 rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5 ${
                            flat.isCommonArea
                              ? 'border-slate-400 bg-slate-300/70 text-slate-700'
                              : flat.isOccupied
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-950'
                                : 'border-rose-500/40 bg-rose-500/15 text-rose-950'
                          }`}
                        >
                          <span className="block font-mono text-xs font-bold">Flat #{flat.flatNumber}</span>
                          <span className="mt-1 block truncate text-xs font-semibold">
                            {flat.isCommonArea ? 'Common area' : flat.isOccupied ? flat.tenantName : 'Vacant'}
                          </span>
                        </Button>
                      ))}
                  </div>
                </section>
              ))}
          </div>
        </div>
      )}

      {/* Flats Grid Table */}
      {viewMode === 'LIST' && <div className="rounded-xl border border-slate-200 bg-brand-surface/95 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap">Building</th>
                <th className="py-3 px-3 whitespace-nowrap">Flat #</th>
                <th className="py-3 px-3 whitespace-nowrap">Floor</th>
                <th className="py-3 px-4 whitespace-nowrap">Resident Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Contact Phone & Email</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Electric Meter Serial</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Base Monthly Rent</th>
                <th className="py-3 px-3 whitespace-nowrap">Lease Start</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Occupancy</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredFlats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No flats match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredFlats.map((flat) => (
                  <tr key={flat.id} className="hover:bg-slate-100/70 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {buildingMap.get(flat.buildingId) || flat.buildingId}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-slate-950">
                      #{flat.flatNumber}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono">
                      Floor {flat.floor}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-950">
                      {flat.tenantName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <div className="font-mono text-[11px] text-slate-700">{flat.tenantPhone}</div>
                      <div className="text-[11px] text-slate-500">{flat.tenantEmail}</div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-sky-700 text-xs">
                      {flat.meterNumber}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                      {currency}{flat.baseRent.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {flat.leaseStartDate}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${
                        flat.isOccupied
                          ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-slate-500 bg-slate-100 border-slate-300'
                      }`}>
                        {flat.isOccupied ? <CheckCircle2 className="w-3 h-3" /> : <CalendarOff className="w-3 h-3" />}
                        {flat.isOccupied ? 'Active' : `Ended ${flat.leaseEndDate || ''}`}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingFlat({ ...flat })}
                          className="p-1.5 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Flat or Tenant Info"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {flat.isOccupied && (
                          <button
                            onClick={() => {
                              if (confirm(`Mark the lease for ${flat.tenantName} in Flat #${flat.flatNumber} as ended today?`)) {
                                endLease(flat.id, new Date().toISOString().split('T')[0]);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                            title="End tenant lease"
                          >
                            <CalendarOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>}

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
