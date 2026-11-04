import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useProperty } from '../context/PropertyContext';
import { formatMonth } from '../utils/formatMonth';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../types';
import { 
  Search, 
  Plus, 
  Download, 
  AlertTriangle, 
  UserCheck, 
  AlertOctagon,
  X
} from 'lucide-react';
import { Button, Input, Select } from './ui/Primitives';

interface MaintenanceViewProps {
  onOpenNewTicket: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ onOpenNewTicket }) => {
  const { 
    maintenanceRequests, 
    updateMaintenanceStatus, 
    selectedBuildingId, 
    selectedMonth,
    buildings,
    exportMaintenanceCSV 
  } = useProperty();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('table');
  const [periodScope, setPeriodScope] = useState<'MONTH' | 'YEAR' | 'ALL'>('ALL');
  const [periodYear, setPeriodYear] = useState(selectedMonth.slice(0, 4));
  const [filterPortalTarget, setFilterPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setFilterPortalTarget(document.getElementById('report-filter-slot'));
  }, []);

  const availableYears = useMemo(
    () => Array.from(new Set(maintenanceRequests.map(ticket => ticket.reportedDate.slice(0, 4)))).sort((a, b) => b.localeCompare(a)),
    [maintenanceRequests],
  );

  // Resolution modal state
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceRequest | null>(null);
  const [editStatus, setEditStatus] = useState<MaintenanceStatus>('IN_PROGRESS');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editActualCost, setEditActualCost] = useState<number>(0);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const currency = activeBuilding ? activeBuilding.currency : '₹';

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return maintenanceRequests.filter((ticket) => {
      if (selectedBuildingId !== 'all' && ticket.buildingId !== selectedBuildingId) {
        return false;
      }
      if (periodScope === 'MONTH' && !ticket.reportedDate.startsWith(selectedMonth)) return false;
      if (periodScope === 'YEAR' && !ticket.reportedDate.startsWith(periodYear)) return false;
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'ALL' && ticket.priority !== priorityFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL' && ticket.category !== categoryFilter) {
        return false;
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchTitle = ticket.title.toLowerCase().includes(q);
        const matchFlat = ticket.flatNumber.toLowerCase().includes(q);
        const matchTenant = ticket.tenantName.toLowerCase().includes(q);
        const matchTicket = ticket.ticketNumber.toLowerCase().includes(q);
        const matchTech = (ticket.assignedTechnician || '').toLowerCase().includes(q);
        if (!matchTitle && !matchFlat && !matchTenant && !matchTicket && !matchTech) {
          return false;
        }
      }
      return true;
    });
  }, [maintenanceRequests, selectedBuildingId, selectedMonth, periodScope, periodYear, statusFilter, priorityFilter, categoryFilter, searchTerm]);

  // Status metrics
  const metrics = useMemo(() => {
    const list = selectedBuildingId === 'all' 
      ? maintenanceRequests 
      : maintenanceRequests.filter(m => m.buildingId === selectedBuildingId);

    const openCount = list.filter(m => m.status === 'NEW').length;
    const inProgressCount = list.filter(m => m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS').length;
    const resolvedCount = list.filter(m => m.status === 'RESOLVED' || m.status === 'CLOSED').length;
    const emergencyCount = list.filter(m => m.priority === 'EMERGENCY' && m.status !== 'RESOLVED' && m.status !== 'CLOSED').length;

    return { openCount, inProgressCount, resolvedCount, emergencyCount, total: list.length };
  }, [maintenanceRequests, selectedBuildingId]);

  const handleOpenDetailModal = (ticket: MaintenanceRequest) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditNotes(ticket.resolutionNotes || '');
    setEditActualCost(ticket.actualCost || ticket.estimatedCost);
  };

  const handleSaveTicketUpdate = () => {
    if (!selectedTicket) return;
    updateMaintenanceStatus(selectedTicket.id, editStatus, editNotes, editActualCost);
    setSelectedTicket(null);
  };

  const getPriorityBadge = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'EMERGENCY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <AlertOctagon className="w-3 h-3" /> Emergency
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" /> High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            Medium
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="text-[11px] font-semibold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
            New
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
            In Progress
          </span>
        );
      case 'WAITING_PARTS':
        return (
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            Waiting Parts
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            Resolved
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {filterPortalTarget && createPortal(
        <div className="flex min-w-max items-center gap-2 px-2">
          <div className="flex min-w-52 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <Input
              type="search"
              placeholder="Search maintenance..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-950"
              aria-label="Search maintenance requests"
            />
          </div>

          <Select
            value={periodScope}
            onChange={event => setPeriodScope(event.target.value as 'MONTH' | 'YEAR' | 'ALL')}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-950"
            aria-label="Filter maintenance by period"
          >
            <option value="ALL">Overall · since 2019</option>
            <option value="MONTH">Selected month · {formatMonth(selectedMonth)}</option>
            <option value="YEAR">Full year</option>
          </Select>

          {periodScope === 'YEAR' && (
            <Select
              value={periodYear}
              onChange={event => setPeriodYear(event.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-950"
              aria-label="Filter maintenance by year"
            >
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </Select>
          )}

          <Select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-950"
            aria-label="Filter maintenance by status"
          >
            <option value="ALL">All statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_PARTS">Waiting Parts</option>
            <option value="RESOLVED">Resolved</option>
          </Select>

          <Select
            value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-950"
            aria-label="Filter maintenance by priority"
          >
            <option value="ALL">All priorities</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>

          <Select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-950"
            aria-label="Filter maintenance by category"
          >
            <option value="ALL">All categories</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="HVAC">HVAC</option>
            <option value="CARPENTRY">Carpentry</option>
            <option value="APPLIANCE">Appliance</option>
          </Select>

          <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            {(['table', 'board'] as const).map(mode => (
              <Button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  viewMode === mode
                    ? 'bg-brand-tab-active text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {mode === 'table' ? 'Table' : 'Board'}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            onClick={exportMaintenanceCSV}
            className="border border-slate-300 bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            title="Export maintenance CSV"
            aria-label="Export maintenance CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>,
        filterPortalTarget,
      )}
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-950">
            <span>Maintenance & Repair Requests</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 border border-blue-500/20 font-mono font-normal">
              {metrics.total} Requests Logged
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onOpenNewTicket}
            className="gap-2 bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Request</span>
          </Button>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-brand-surface border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>New Requests</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-bold text-slate-950 font-mono mt-1 tabular-nums">
            {metrics.openCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting technician assignment</div>
        </div>

        <div className="p-3.5 rounded-xl bg-brand-surface border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">
            In Progress & Parts
          </div>
          <div className="text-2xl font-bold text-sky-700 font-mono mt-1 tabular-nums">
            {metrics.inProgressCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Under active repair</div>
        </div>

        <div className="p-3.5 rounded-xl bg-brand-surface border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Emergency Items</span>
            {metrics.emergencyCount > 0 && (
              <span className="text-[10px] font-bold text-rose-600 font-mono">Action Needed</span>
            )}
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono mt-1 tabular-nums">
            {metrics.emergencyCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">High voltage or plumbing burst</div>
        </div>

        <div className="p-3.5 rounded-xl bg-brand-surface border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">
            Resolved & Closed
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1 tabular-nums">
            {metrics.resolvedCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Satisfactorily completed</div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="rounded-xl border border-slate-200 bg-brand-surface/95 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px] font-semibold tracking-wider">
                  <th className="py-3 px-3.5 whitespace-nowrap">Ticket</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Building & Flat</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Tenant</th>
                  <th className="py-3 px-4">Issue Description</th>
                  <th className="py-3 px-3 whitespace-nowrap">Category</th>
                  <th className="py-3 px-3 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Assigned Tech</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Cost</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      No maintenance tickets match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-100/70 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-500 font-bold whitespace-nowrap">
                        {t.ticketNumber}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-950">Flat #{t.flatNumber}</span>
                        <span className="text-[11px] text-slate-500 block">{t.buildingName}</span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{t.tenantName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.tenantPhone}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800">{t.title}</div>
                        <div className="text-slate-500 text-[11px] truncate mt-0.5">{t.description}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-700 font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700">
                        {t.assignedTechnician ? (
                          <div>
                            <div className="font-medium">{t.assignedTechnician}</div>
                            {t.technicianPhone && (
                              <div className="text-[10px] text-slate-500 font-mono">{t.technicianPhone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                        {t.actualCost > 0 
                          ? `${currency}${t.actualCost.toFixed(2)}` 
                          : t.estimatedCost > 0 
                          ? `~${currency}${t.estimatedCost.toFixed(2)}` 
                          : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetailModal(t)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['NEW', 'IN_PROGRESS', 'WAITING_PARTS', 'RESOLVED'] as MaintenanceStatus[]).map((st) => {
            const columnTickets = filteredTickets.filter(t => t.status === st);
            const statusLabels: Record<MaintenanceStatus, string> = {
              NEW: 'New / Backlog',
              IN_PROGRESS: 'In Progress',
              WAITING_PARTS: 'Waiting for Parts',
              RESOLVED: 'Resolved & Tested',
              CLOSED: 'Archived',
            };

            return (
              <div key={st} className="rounded-xl bg-brand-surface/95 border border-slate-200 flex flex-col max-h-[750px]">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800">{statusLabels[st]}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {columnTickets.length}
                  </span>
                </div>

                <div className="p-3 overflow-y-auto space-y-3 flex-1">
                  {columnTickets.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs italic">
                      No tickets
                    </div>
                  ) : (
                    columnTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleOpenDetailModal(ticket)}
                        className="p-3.5 rounded-lg bg-slate-100/80 hover:bg-slate-100 border border-slate-300/70 hover:border-slate-400 transition-all cursor-pointer text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-slate-500 font-bold">{ticket.ticketNumber}</span>
                          {getPriorityBadge(ticket.priority)}
                        </div>

                        <div className="font-semibold text-slate-900 line-clamp-2">
                          {ticket.title}
                        </div>

                        <div className="text-[11px] text-slate-500 line-clamp-2">
                          {ticket.description}
                        </div>

                        <div className="pt-2 border-t border-slate-300/70 flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 font-medium">Flat #{ticket.flatNumber}</span>
                          <span className="text-slate-500 font-mono">{ticket.reportedDate}</span>
                        </div>

                        {ticket.assignedTechnician && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <UserCheck className="w-3 h-3 text-blue-700" />
                            <span>{ticket.assignedTechnician}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-500">{selectedTicket.ticketNumber}</span>
                <h2 className="text-base font-bold text-slate-950 mt-0.5">{selectedTicket.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1 text-slate-500 hover:text-slate-950"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              {/* Premises info */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Flat:</span>
                  <span className="font-bold text-slate-950">#{selectedTicket.flatNumber} · {selectedTicket.buildingName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resident:</span>
                  <span className="text-slate-800">{selectedTicket.tenantName} ({selectedTicket.tenantPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-800 font-medium">{selectedTicket.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reported Date:</span>
                  <span className="font-mono text-slate-700">{selectedTicket.reportedDate}</span>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <label className="text-slate-700 font-medium block mb-1.5">Change Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MaintenanceStatus)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none"
                >
                  <option value="NEW">New / Unassigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_PARTS">Waiting for Parts</option>
                  <option value="RESOLVED">Resolved (Mark Complete)</option>
                  <option value="CLOSED">Closed & Archived</option>
                </select>
              </div>

              {/* Actual Cost */}
              <div>
                <label className="text-slate-700 font-medium block mb-1.5">
                  Actual Repair Cost ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editActualCost}
                  onChange={(e) => setEditActualCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono focus:outline-none"
                />
              </div>

              {/* Resolution Notes */}
              <div>
                <label className="text-slate-700 font-medium block mb-1.5">
                  Technician / Resolution Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record work carried out, replacement components, test results..."
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTicketUpdate}
                  className="px-5 py-2 text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg font-semibold"
                >
                  Update Ticket
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
