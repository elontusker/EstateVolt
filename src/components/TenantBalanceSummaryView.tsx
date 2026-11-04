import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
} from "lucide-react";
import { Button, Input, Select } from "./ui/Primitives";
import { useProperty } from "../context/PropertyContext";
import { formatMonth } from "../utils/formatMonth";

type ReportPeriod = "MONTHLY" | "YEARLY";

export const TenantBalanceSummaryView: React.FC = () => {
  const { buildings, flats, statements, selectedMonth, updateFlat, endLease, leaveWithoutPaying } = useProperty();
  const bhagatBuilding = buildings.find(
    (building) => building.id === "bld-bhagat-niwas",
  );
  const [buildingId, setBuildingId] = useState(
    bhagatBuilding?.id || buildings[0]?.id || "",
  );
  const [month, setMonth] = useState(selectedMonth);
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [reportYear, setReportYear] = useState(selectedMonth.slice(0, 4));
  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [roomFilter, setRoomFilter] = useState("");
  const [tenantColumnFilter, setTenantColumnFilter] = useState("");
  const [billFilter, setBillFilter] = useState("");
  const [rentFilter, setRentFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [filterPortalTarget, setFilterPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setFilterPortalTarget(document.getElementById("report-filter-slot"));
  }, []);

  const activeBuilding = buildings.find(
    (building) => building.id === buildingId,
  );
  const availableMonths = useMemo(
    () =>
      Array.from(
        new Set(
          statements
            .filter(statement => statement.buildingId === buildingId)
            .map(statement => statement.month),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [statements, buildingId],
  );
  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(
          statements
            .filter(statement => statement.buildingId === buildingId)
            .map(statement => statement.month.slice(0, 4)),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [statements, buildingId],
  );

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(month)) {
      setMonth(availableMonths[0]);
    }
  }, [availableMonths, month]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(reportYear)) {
      setReportYear(availableYears[0]);
    }
  }, [availableYears, reportYear]);

  const activeTenants = useMemo(() => {
    const groupedStatements = new Map<string, typeof statements>();

    statements
      .filter(
        statement =>
          statement.buildingId === buildingId &&
          (period === "MONTHLY"
            ? statement.month === month
            : statement.month.startsWith(`${reportYear}-`)),
      )
      .forEach(statement => {
        const key = `${statement.flatId}::${statement.tenantName.toLowerCase()}`;
        const tenantStatements = groupedStatements.get(key) || [];
        tenantStatements.push(statement);
        groupedStatements.set(key, tenantStatements);
      });

    return Array.from(groupedStatements.entries())
      .map(([key, tenantStatements]) => {
        const periodStatements = [...tenantStatements].sort(
          (a, b) => b.month.localeCompare(a.month),
        );
        const statement = periodStatements[0];
        const flat = flats.find(candidate => candidate.id === statement.flatId);

        return {
          key,
          flat,
          flatNumber: statement.flatNumber,
          tenantName: statement.tenantName,
          meterNumber: statement.meterNumber,
          baseRent: statement.baseRent,
          leaseStartDate: flat?.leaseStartDate,
          isOccupied: flat?.isOccupied || false,
          statement,
          periodStatements,
        };
      })
      .filter(({
        flatNumber,
        tenantName,
        meterNumber,
        baseRent,
        statement,
        periodStatements,
      }) => {
          if (roomFilter && !flatNumber.toLowerCase().includes(roomFilter.toLowerCase())) return false;
          if (tenantColumnFilter && !tenantName.toLowerCase().includes(tenantColumnFilter.toLowerCase())) return false;
          if (billFilter && !(statement?.month || "").includes(billFilter)) return false;
          if (rentFilter && baseRent < (Number(rentFilter) || 0)) return false;
          const periodPayment = periodStatements.reduce(
            (total, periodStatement) => total + periodStatement.paymentReceived,
            0,
          );
          if (paymentFilter && periodPayment < (Number(paymentFilter) || 0)) return false;
          if (search.trim()) {
            const query = search.toLowerCase();
            return [
              tenantName,
              flatNumber,
              meterNumber,
            ].some((value) => value.toLowerCase().includes(query));
          }
          return true;
        })
        .sort((a, b) =>
          a.flatNumber.localeCompare(b.flatNumber, undefined, {
            numeric: true,
          }),
        );
  },
    [
      flats,
      statements,
      buildingId,
      month,
      period,
      reportYear,
      search,
      roomFilter,
      tenantColumnFilter,
      billFilter,
      rentFilter,
      paymentFilter,
    ],
  );

  const matchingTenantCount = activeTenants.filter(item =>
    period === "MONTHLY" ||
    item.periodStatements.some(statement => statement.month === `${reportYear}-12`),
  ).length;
  const visibleTenantRows = period === "MONTHLY"
    ? activeTenants
    : activeTenants.flatMap(item =>
        item.periodStatements.map(statement => ({
          ...item,
          key: statement.id,
          flatNumber: statement.flatNumber,
          tenantName: statement.tenantName,
          meterNumber: statement.meterNumber,
          baseRent: statement.baseRent,
          statement,
          periodStatements: [statement],
        })),
      );
  const totalBalance = activeTenants.reduce(
    (total, item) =>
      total + Math.max(0, item.statement?.balanceThisMonth || 0),
    0,
  );
  const tenantsWithDue = activeTenants.filter(
    (item) => (item.statement?.balanceThisMonth || 0) > 0,
  ).length;
  const rentReceived = activeTenants.reduce(
    (total, item) => total + item.periodStatements.reduce(
      (statementTotal, statement) =>
        statementTotal + Math.min(statement.paymentReceived, statement.baseRent),
      0,
    ),
    0,
  );
  const lostMoney = activeTenants.reduce(
    (total, item) => total + item.periodStatements.reduce(
      (statementTotal, statement) =>
        statementTotal + (statement.writtenOffAmount || 0),
      0,
    ),
    0,
  );
  const currency = activeBuilding?.currency || "₹";

  const money = (value: number) =>
    `${currency}${value.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;

  const editTenant = (flat: (typeof flats)[number]) => {
    const tenantName = prompt("Tenant name", flat.tenantName);
    if (tenantName === null) return;
    const tenantPhone = prompt("Tenant phone", flat.tenantPhone);
    if (tenantPhone === null) return;
    const rent = prompt("Monthly rent", String(flat.baseRent));
    if (rent === null) return;
    const leaseStartDate = prompt("Lease start date (YYYY-MM-DD)", flat.leaseStartDate);
    if (leaseStartDate === null) return;
    updateFlat({
      ...flat,
      tenantName: tenantName.trim() || flat.tenantName,
      tenantPhone,
      baseRent: Number(rent) || flat.baseRent,
      leaseStartDate,
    });
  };

  const handleTenantAction = (
    action: string,
    flat: (typeof flats)[number],
  ) => {
    if (action === "EDIT") {
      editTenant(flat);
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (action === "CLOSE" && confirm(`Close the lease for ${flat.tenantName} with the balance still collectible?`)) {
      endLease(flat.id, today);
    }
    if (action === "LEFT_UNPAID" && confirm(`Mark ${flat.tenantName} as left without paying and move the latest balance to lost money?`)) {
      leaveWithoutPaying(flat.id, today);
    }
  };

  return (
    <div className="space-y-4">
      {filterPortalTarget && createPortal(
        <div className="flex min-w-max items-center gap-2 px-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <Select
              value={buildingId}
              onChange={event => setBuildingId(event.target.value)}
              className="max-w-44 bg-transparent text-xs font-semibold text-slate-950 outline-none"
              aria-label="Filter tenant summary by building"
            >
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            {(["MONTHLY", "YEARLY"] as ReportPeriod[]).map(option => (
              <Button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  period === option
                    ? "bg-brand-tab-active text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {option === "MONTHLY" ? "Monthly report" : "Yearly report"}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <CalendarRange className="h-4 w-4 text-slate-500" />
            {period === "MONTHLY" ? (
              <Select
                value={month}
                onChange={event => setMonth(event.target.value)}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
                aria-label="Filter tenant summary by month"
              >
                {availableMonths.map(optionMonth => (
                  <option key={optionMonth} value={optionMonth}>
                    {formatMonth(optionMonth)}
                  </option>
                ))}
              </Select>
            ) : (
              <Select
                value={reportYear}
                onChange={event => setReportYear(event.target.value)}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
                aria-label="Filter tenant summary by year"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            )}
          </div>

          <div className="flex min-w-48 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search tenant..."
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-950 outline-none"
            />
          </div>

          <Button
            type="button"
            onClick={() => setShowColumnFilters(value => !value)}
            className={`gap-1.5 border px-2.5 py-2 text-[11px] font-semibold ${
              showColumnFilters
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-slate-300 bg-slate-100 text-slate-700"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Columns
          </Button>
        </div>,
        filterPortalTarget,
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Balance Summary
          </h1>
        </div>
      </div>

      <div className={`grid gap-3 sm:grid-cols-2 ${
        period === "MONTHLY" ? "xl:grid-cols-5" : "xl:grid-cols-2"
      }`}>
        {[
          ...(period === "MONTHLY"
            ? [
                [
                  "Active Tenants",
                  matchingTenantCount.toLocaleString("en-IN"),
                  "text-slate-950",
                ],
                [
                  "Tenants with balance",
                  tenantsWithDue.toLocaleString("en-IN"),
                  "text-sky-700",
                ],
              ]
            : []),
          ["Outstanding balance", money(totalBalance), "text-rose-600"],
          ["Rent Received", money(rentReceived), "text-emerald-700"],
          ...(period === "MONTHLY"
            ? [["Lost money", money(lostMoney), "text-rose-700"]]
            : []),
        ].map(([label, value, color]) => (
          <div key={label} className="app-surface rounded-xl p-3">
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className={`mt-1 font-mono text-xl font-bold ${color}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="app-surface overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-950">
              {activeBuilding?.name || "Building"} · {
                period === "MONTHLY" ? formatMonth(month) : reportYear
              }
            </p>
            <p className="text-xs text-slate-400">
              {visibleTenantRows.length} {
                period === "MONTHLY" ? "tenants" : "monthly records"
              } match the current filters
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowDetails(value => !value)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showDetails ? "Hide detail" : "Show detail"}
          </Button>
        </div>
        {showDetails && <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-[11px] text-slate-700">
              <tr>
                <th className="px-3 py-2.5">Room</th>
                <th className="px-3 py-2.5">Active tenant</th>
                <th className="px-3 py-2.5">Latest bill</th>
                <th className="px-3 py-2.5 text-right">Monthly rent</th>
                <th className="px-3 py-2.5 text-right">Payment</th>
                <th className="px-3 py-2.5 text-right">Balance</th>
                <th className="px-3 py-2.5 text-center">Actions</th>
              </tr>
              {showColumnFilters && (
                <tr className="border-t border-slate-200 bg-slate-50">
                  <th className="px-2 py-2">
                    <Input
                      value={roomFilter}
                      onChange={event => setRoomFilter(event.target.value)}
                      placeholder="Filter..."
                      className="w-20 rounded border border-slate-300 bg-white px-2 py-1.5 text-[10px]"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <Input
                      value={tenantColumnFilter}
                      onChange={event => setTenantColumnFilter(event.target.value)}
                      placeholder="Filter name..."
                      className="min-w-32 rounded border border-slate-300 bg-white px-2 py-1.5 text-[10px]"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <Input
                      type="month"
                      value={billFilter}
                      onChange={event => setBillFilter(event.target.value)}
                      className="w-32 rounded border border-slate-300 bg-white px-2 py-1.5 text-[10px]"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      value={rentFilter}
                      onChange={event => setRentFilter(event.target.value)}
                      placeholder="Min rent"
                      className="w-24 rounded border border-slate-300 bg-white px-2 py-1.5 text-[10px]"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      value={paymentFilter}
                      onChange={event => setPaymentFilter(event.target.value)}
                      placeholder="Min paid"
                      className="w-24 rounded border border-slate-300 bg-white px-2 py-1.5 text-[10px]"
                    />
                  </th>
                  <th className="px-2 py-2" />
                  <th className="px-2 py-2" />
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleTenantRows.map(({
                key,
                flat,
                flatNumber,
                tenantName,
                baseRent,
                leaseStartDate,
                isOccupied,
                statement,
                periodStatements,
              }) => {
                const balance = statement?.balanceThisMonth || 0;
                const periodPayment = periodStatements.reduce(
                  (total, periodStatement) =>
                    total + periodStatement.paymentReceived,
                  0,
                );
                return (
                  <tr
                    key={key}
                    className={isOccupied ? "bg-emerald-50/70 hover:bg-emerald-50" : "bg-white hover:bg-slate-50"}
                  >
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-950">
                      #{flatNumber}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-950">
                        {tenantName}
                      </p>
                      {leaseStartDate && (
                        <p className="text-[10px] text-slate-400">
                          Lease from {leaseStartDate}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">
                      {statement?.month ? formatMonth(statement.month) : "No bill"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                      {money(baseRent)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-700">
                      {money(periodPayment)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono font-bold ${
                        balance > 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {money(balance)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {flat ? (
                        <Select
                          value=""
                          onChange={event => {
                            handleTenantAction(event.target.value, flat);
                            event.target.value = "";
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                          aria-label={`Actions for ${tenantName}`}
                        >
                          <option value="">Select action</option>
                          <option value="EDIT">Edit tenant</option>
                          {flat.isOccupied && <option value="CLOSE">Close lease</option>}
                          {flat.isOccupied && <option value="LEFT_UNPAID">Left without paying</option>}
                        </Select>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
};
