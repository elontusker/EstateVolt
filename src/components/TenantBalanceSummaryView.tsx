import React, { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Search,
  Users,
  WalletCards,
} from "lucide-react";
import { useProperty } from "../context/PropertyContext";

export const TenantBalanceSummaryView: React.FC = () => {
  const { buildings, flats, statements, selectedMonth } = useProperty();
  const bhagatBuilding = buildings.find(
    (building) => building.id === "bld-bhagat-niwas",
  );
  const [buildingId, setBuildingId] = useState(
    bhagatBuilding?.id || buildings[0]?.id || "",
  );
  const [month, setMonth] = useState(selectedMonth);
  const [balanceFilter, setBalanceFilter] = useState<
    "ALL" | "DUE" | "CLEAR"
  >("ALL");
  const [search, setSearch] = useState("");

  const activeBuilding = buildings.find(
    (building) => building.id === buildingId,
  );
  const activeTenants = useMemo(
    () =>
      flats
        .filter((flat) => flat.buildingId === buildingId && flat.isOccupied)
        .map((flat) => {
          const matchingTenantStatements = statements
            .filter(
              (statement) =>
                statement.flatId === flat.id &&
                statement.tenantName === flat.tenantName &&
                statement.month <= month,
            )
            .sort((a, b) => b.month.localeCompare(a.month));
          const fallbackStatements = statements
            .filter(
              (statement) =>
                statement.flatId === flat.id && statement.month <= month,
            )
            .sort((a, b) => b.month.localeCompare(a.month));

          return {
            flat,
            statement: matchingTenantStatements[0] || fallbackStatements[0],
          };
        })
        .filter(({ flat, statement }) => {
          const balance = statement?.balanceThisMonth || 0;
          if (balanceFilter === "DUE" && balance <= 0) return false;
          if (balanceFilter === "CLEAR" && balance > 0) return false;
          if (search.trim()) {
            const query = search.toLowerCase();
            return [
              flat.tenantName,
              flat.flatNumber,
              flat.tenantPhone,
              flat.meterNumber,
            ].some((value) => value.toLowerCase().includes(query));
          }
          return true;
        })
        .sort((a, b) =>
          a.flat.flatNumber.localeCompare(b.flat.flatNumber, undefined, {
            numeric: true,
          }),
        ),
    [flats, statements, buildingId, month, balanceFilter, search],
  );

  const allActiveForBuilding = flats.filter(
    (flat) => flat.buildingId === buildingId && flat.isOccupied,
  );
  const totalBalance = activeTenants.reduce(
    (total, item) =>
      total + Math.max(0, item.statement?.balanceThisMonth || 0),
    0,
  );
  const tenantsWithDue = activeTenants.filter(
    (item) => (item.statement?.balanceThisMonth || 0) > 0,
  ).length;
  const monthlyRent = activeTenants.reduce(
    (total, item) => total + item.flat.baseRent,
    0,
  );
  const currency = activeBuilding?.currency || "₹";

  const money = (value: number) =>
    `${currency}${value.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-700">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Occupancy & collections
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Active Tenant Balance Summary
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Latest balance, rent, contact, and billing status for every active
            tenant in the selected building.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Active tenants",
            allActiveForBuilding.length.toLocaleString("en-IN"),
            "text-slate-950",
          ],
          [
            "Tenants with balance",
            tenantsWithDue.toLocaleString("en-IN"),
            "text-sky-700",
          ],
          ["Outstanding balance", money(totalBalance), "text-rose-600"],
          ["Monthly rent roll", money(monthlyRent), "text-emerald-700"],
        ].map(([label, value, color]) => (
          <div key={label} className="app-surface rounded-2xl p-4">
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${color}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-brand-surface p-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <select
            value={buildingId}
            onChange={(event) => setBuildingId(event.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-950 outline-none"
          >
            {buildings.map((building) => (
              <option
                key={building.id}
                value={building.id}
                className="bg-slate-100"
              >
                {building.name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-mono text-xs text-slate-950 outline-none"
        />
        <select
          value={balanceFilter}
          onChange={(event) =>
            setBalanceFilter(
              event.target.value as "ALL" | "DUE" | "CLEAR",
            )
          }
          className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-950 outline-none"
        >
          <option value="ALL">All active tenants</option>
          <option value="DUE">Balance due only</option>
          <option value="CLEAR">Clear / advance only</option>
        </select>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tenant, room, phone, or meter..."
            className="w-full rounded-lg border border-slate-300 bg-slate-100 py-2 pl-9 pr-3 text-xs text-slate-950 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="app-surface overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-slate-950">
              {activeBuilding?.name || "Building"} · {month}
            </p>
            <p className="text-xs text-slate-400">
              {activeTenants.length} tenants match the current filters
            </p>
          </div>
          <WalletCards className="h-5 w-5 text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-[11px] text-slate-700">
              <tr>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Active tenant</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Latest bill</th>
                <th className="px-4 py-3 text-right">Monthly rent</th>
                <th className="px-4 py-3 text-right">Payment</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeTenants.map(({ flat, statement }) => {
                const balance = statement?.balanceThisMonth || 0;
                return (
                  <tr key={flat.id} className="hover:bg-slate-100/70">
                    <td className="px-4 py-3 font-mono font-bold text-slate-950">
                      #{flat.flatNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">
                        {flat.tenantName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Lease from {flat.leaseStartDate}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {flat.tenantPhone || "Not provided"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {statement?.month || "No bill"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-800">
                      {money(flat.baseRent)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {money(statement?.paymentReceived || 0)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-bold ${
                        balance > 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {money(balance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                          balance > 0
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        }`}
                      >
                        {balance <= 0 && <CheckCircle2 className="h-3 w-3" />}
                        {balance > 0 ? "Balance due" : "Clear"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
