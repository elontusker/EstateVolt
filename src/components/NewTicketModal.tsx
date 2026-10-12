import React, { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { MaintenanceCategory, MaintenancePriority } from '../types';
import { Wrench, X, Plus, AlertTriangle, User, Home } from 'lucide-react';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({ isOpen, onClose }) => {
  const { buildings, flats, addMaintenanceRequest, selectedBuildingId } = useProperty();

  const [buildingId, setBuildingId] = useState<string>(
    selectedBuildingId === 'all' ? (buildings[0]?.id || '') : selectedBuildingId
  );
  
  // Flats in selected building
  const buildingFlats = flats.filter(f => f.buildingId === buildingId);
  const [flatId, setFlatId] = useState<string>(buildingFlats[0]?.id || '');

  const [category, setCategory] = useState<MaintenanceCategory>('ELECTRICAL');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [assignedTechnician, setAssignedTechnician] = useState<string>('');
  const [technicianPhone, setTechnicianPhone] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<number>(1000);
  const [isBilledToTenant, setIsBilledToTenant] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentBuilding = buildings.find(b => b.id === buildingId);
  const currentFlat = flats.find(f => f.id === flatId) || buildingFlats[0];

  const handleBuildingChange = (newBldId: string) => {
    setBuildingId(newBldId);
    const newFlats = flats.filter(f => f.buildingId === newBldId);
    if (newFlats.length > 0) {
      setFlatId(newFlats[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please provide a title and detailed issue description.');
      return;
    }

    if (!currentBuilding || !currentFlat) {
      alert('Please select a valid building and flat.');
      return;
    }

    addMaintenanceRequest({
      buildingId: currentBuilding.id,
      buildingName: currentBuilding.name,
      flatId: currentFlat.id,
      flatNumber: currentFlat.flatNumber,
      tenantName: currentFlat.tenantName,
      tenantPhone: currentFlat.tenantPhone,
      category,
      priority,
      status: 'NEW',
      title,
      description,
      assignedTechnician: assignedTechnician || undefined,
      technicianPhone: technicianPhone || undefined,
      estimatedCost,
      actualCost: 0,
      isBilledToTenant,
    });

    alert(`Maintenance Ticket registered successfully for Flat #${currentFlat.flatNumber}!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-brand-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-700 border border-blue-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">Create Maintenance Request</h2>
              <p className="text-xs text-slate-500">
                Log a repair ticket for an apartment or building facility
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Building & Flat Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Building</label>
              <select
                value={buildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none"
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.totalFlats} Flats)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-medium block mb-1">Flat Number</label>
              <select
                value={flatId}
                onChange={(e) => setFlatId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono focus:outline-none"
              >
                {buildingFlats.map(f => (
                  <option key={f.id} value={f.id}>
                    Flat #{f.flatNumber} · {f.tenantName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tenant Contact Snapshot */}
          {currentFlat && (
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Resident: <strong className="text-slate-800">{currentFlat.tenantName}</strong></span>
              <span>Phone: <strong className="text-slate-800 font-mono">{currentFlat.tenantPhone}</strong></span>
            </div>
          )}

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none"
              >
                <option value="ELECTRICAL">Electrical</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="HVAC">HVAC / Cooling / Heat</option>
                <option value="CARPENTRY">Carpentry & Doors</option>
                <option value="APPLIANCE">Kitchen / Appliance</option>
                <option value="PEST_CONTROL">Pest Control</option>
                <option value="GENERAL">General Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-medium block mb-1">Urgency / Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none"
              >
                <option value="LOW">Low - Routine</option>
                <option value="MEDIUM">Medium - Normal</option>
                <option value="HIGH">High - Urgent</option>
                <option value="EMERGENCY">Emergency - Immediate Hazard</option>
              </select>
            </div>
          </div>

          {/* Issue Title */}
          <div>
            <label className="text-slate-700 font-medium block mb-1">Issue Summary / Title</label>
            <input
              type="text"
              placeholder="e.g. Master bathroom faucet dripping or AC blowing warm air"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Issue Description */}
          <div>
            <label className="text-slate-700 font-medium block mb-1">Detailed Description</label>
            <textarea
              rows={3}
              placeholder="Provide exact room location, symptoms, when it started, and any safety hazards..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none"
              required
            />
          </div>

          {/* Technician Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-medium block mb-1">Assign Technician (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Carlos (Rapid Plumbing)"
                value={assignedTechnician}
                onChange={(e) => setAssignedTechnician(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-medium block mb-1">Estimated Cost ({currentBuilding?.currency || '₹'})</label>
              <input
                type="number"
                step="5"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg font-semibold shadow-sm cursor-pointer"
            >
              Register Ticket
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
