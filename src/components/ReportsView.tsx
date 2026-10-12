import React, { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  Download,
  Filter,
  ReceiptText,
  Zap,
  ChevronDown,
  ChevronUp,
  Trophy,
} from "lucide-react";
import { useProperty } from "../context/PropertyContext";
import { Button, Heading, Select } from "./ui/Primitives";

type ReportPeriod = "MONTHLY" | "YEARLY";
type ElectricityFilter = "ALL" | "RECEIVED";

export const ReportsView: React.FC = () => {
  const {
    statements,
    buildingExpenses,
    buildings,
    selectedBuildingId,
    selectedMonth,
  } = useProperty();
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [reportMonth, setReportMonth] = useState(selectedMonth);
  const [reportYear, setReportYear] = useState(selectedMonth.slice(0, 4));
  const [electricityFilter, setElectricityFilter] =
    useState<ElectricityFilter>("ALL");
  const [tenantFilter, setTenantFilter] = useState("ALL");
  const [showDetails, setShowDetails] = useState(false);

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(statements.map((statement) => statement.month.slice(0, 4))),
      ).sort((a, b) => b.localeCompare(a)),
    [statements],
  );

  const availableTenants = useMemo(
    () =>
      Array.from(
        new Set(
          statements
            .filter(statement => selectedBuildingId === "all" || statement.buildingId === selectedBuildingId)
            .map(statement => statement.tenantName),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [statements, selectedBuildingId],
  );

  const reportStatements = useMemo(
    () =>
      statements.filter((statement) => {
        if (
          selectedBuildingId !== "all" &&
          statement.buildingId !== selectedBuildingId
        ) {
          return false;
        }

        const inPeriod =
          period === "MONTHLY"
            ? statement.month === reportMonth
            : statement.month.startsWith(`${reportYear}-`);
        if (!inPeriod) return false;
        if (tenantFilter !== "ALL" && statement.tenantName !== tenantFilter) {
          return false;
        }

        if (
          electricityFilter === "RECEIVED" &&
          statement.paymentReceived <= 0
        ) {
          return false;
        }

        return true;
      }),
    [
      statements,
      selectedBuildingId,
      period,
      reportMonth,
      reportYear,
      electricityFilter,
      tenantFilter,
    ],
  );

  const periodExpenses = useMemo(
    () =>
      buildingExpenses.filter((expense) => {
        if (
          selectedBuildingId !== "all" &&
          expense.buildingId !== selectedBuildingId
        ) {
          return false;
        }

        return period === "MONTHLY"
          ? expense.month === reportMonth
          : expense.month.startsWith(`${reportYear}-`);
      }),
    [
      buildingExpenses,
      selectedBuildingId,
      period,
      reportMonth,
      reportYear,
    ],
  );

  const metrics = useMemo(
    () =>
      reportStatements.reduce(
        (totals, statement) => {
          const electricityReceived = Math.min(
            statement.paymentReceived,
            statement.electricityAmount,
          );
          totals.totalBilled += statement.totalDue;
          totals.totalReceived += statement.paymentReceived;
          totals.electricityBilled += statement.electricityAmount;
          totals.electricityReceived += electricityReceived;
          totals.outstanding += Math.max(0, statement.balanceThisMonth);
          return totals;
        },
        {
          totalBilled: 0,
          totalReceived: 0,
          electricityBilled: 0,
          electricityReceived: 0,
          outstanding: 0,
        },
      ),
    [reportStatements],
  );

  const expenseTotal = periodExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const currency =
    buildings.find((building) => building.id === selectedBuildingId)
      ?.currency || "₹";

  const yearlyRows = useMemo(() => {
    const months = new Map<
      string,
      {
        billed: number;
        received: number;
        electricity: number;
        electricityReceived: number;
        outstanding: number;
        records: number;
      }
    >();

    reportStatements.forEach((statement) => {
      const row = months.get(statement.month) || {
        billed: 0,
        received: 0,
        electricity: 0,
        electricityReceived: 0,
        outstanding: 0,
        records: 0,
      };
      row.billed += statement.totalDue;
      row.received += statement.paymentReceived;
      row.electricity += statement.electricityAmount;
      row.electricityReceived += Math.min(
        statement.paymentReceived,
        statement.electricityAmount,
      );
      row.outstanding += Math.max(0, statement.balanceThisMonth);
      row.records += 1;
      months.set(statement.month, row);
    });

    return Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [reportStatements]);

  const tenantTotals = useMemo(() => {
    const totals = new Map<string, { rent: number; paid: number; records: number }>();
    statements
      .filter(statement => selectedBuildingId === "all" || statement.buildingId === selectedBuildingId)
      .forEach(statement => {
        const current = totals.get(statement.tenantName) || { rent: 0, paid: 0, records: 0 };
        current.rent += statement.baseRent;
        current.paid += statement.paymentReceived;
        current.records += 1;
        totals.set(statement.tenantName, current);
      });
    return Array.from(totals.entries())
      .sort(([, a], [, b]) => b.paid - a.paid)
      .slice(0, 8);
  }, [statements, selectedBuildingId]);

  const exportReport = () => {
    const headers = [
      "Payment Date",
      "Month",
      "Building",
      "Flat",
      "Tenant",
      "Rent",
      "Electricity Billed",
      "Electricity Received",
      "Total Billed",
      "Total Payment",
      "Outstanding",
      "Status",
    ];
    const rows = reportStatements.map((statement) => [
      statement.paymentDate || statement.billingDate || `${statement.month}-01`,
      statement.month,
      statement.buildingName,
      statement.flatNumber,
      statement.tenantName,
      statement.baseRent,
      statement.electricityAmount,
      Math.min(statement.paymentReceived, statement.electricityAmount),
      statement.totalDue,
      statement.paymentReceived,
      statement.balanceThisMonth,
      statement.status,
    ]);
    const escape = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(","),
      ...rows.map((row) => row.map(escape).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `EstateVolt_${period}_${period === "MONTHLY" ? reportMonth : reportYear}_Report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const money = (value: number) =>
    `${currency}${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-700">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Collections intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Monthly & Yearly Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track billed rent, electricity collections, expenses, and
            outstanding balances for any reporting period.
          </p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200"
        >
          <Download className="h-4 w-4" />
          Export report
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-brand-surface p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
          {(["MONTHLY", "YEARLY"] as ReportPeriod[]).map((option) => (
            <button
              key={option}
              onClick={() => setPeriod(option)}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
                period === option
                  ? "bg-brand-tab-active text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              {option === "MONTHLY" ? "Monthly report" : "Yearly report"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <CalendarRange className="h-4 w-4 text-slate-500" />
            {period === "MONTHLY" ? (
              <input
                type="month"
                value={reportMonth}
                onChange={(event) => setReportMonth(event.target.value)}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
              />
            ) : (
              <select
                value={reportYear}
                onChange={(event) => setReportYear(event.target.value)}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year} className="bg-slate-100">
                    {year}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <Select
              value={electricityFilter}
              onChange={(event) =>
                setElectricityFilter(
                  event.target.value as ElectricityFilter,
                )
              }
              className="bg-transparent text-xs text-slate-950 outline-none"
            >
              <option value="ALL" className="bg-slate-100">
                All collection records
              </option>
              <option value="RECEIVED" className="bg-slate-100">
                Electricity received only
              </option>
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <Select
              value={tenantFilter}
              onChange={event => setTenantFilter(event.target.value)}
              className="max-w-56 bg-transparent text-xs text-slate-950 outline-none"
              aria-label="Filter reports by tenant"
            >
              <option value="ALL">All tenants</option>
              {availableTenants.map(tenant => (
                <option key={tenant} value={tenant}>{tenant}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          ["Total billed", metrics.totalBilled, "text-slate-950"],
          ["Payments received", metrics.totalReceived, "text-emerald-700"],
          ["Electricity billed", metrics.electricityBilled, "text-sky-700"],
          [
            "Electricity received",
            metrics.electricityReceived,
            "text-blue-700",
          ],
          ["Outstanding", metrics.outstanding, "text-rose-600"],
          ["Building expenses", expenseTotal, "text-blue-700"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="app-surface rounded-2xl p-4">
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className={`mt-2 font-mono text-xl font-bold ${color}`}>
              {money(Number(value))}
            </p>
          </div>
        ))}
      </div>

      <div className="app-surface rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-brand-primary" />
          <div>
            <Heading className="text-sm font-bold text-slate-950">Top paying tenants · all time</Heading>
            <p className="text-xs text-slate-500">Total rent billed and payments received since 2019.</p>
          </div>
        </div>
        <div className="space-y-3">
          {tenantTotals.map(([tenant, totals], index) => {
            const maxPaid = tenantTotals[0]?.[1].paid || 1;
            return (
              <div key={tenant} className="grid gap-2 sm:grid-cols-5 sm:items-center">
                <div className="min-w-0 sm:col-span-2">
                  <p className="truncate text-xs font-semibold text-slate-950">{index + 1}. {tenant}</p>
                  <p className="text-xs text-slate-500">{totals.records} records · rent {money(totals.rent)}</p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 sm:col-span-2">
                  <div
                    className="h-full rounded-full bg-brand-primary"
                    style={{ width: `${Math.max(3, (totals.paid / maxPaid) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-emerald-700">{money(totals.paid)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="app-surface overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-slate-950">
              {period === "MONTHLY"
                ? "Tenant collection detail"
                : "Monthly performance summary"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {reportStatements.length} matching billing records
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowDetails(value => !value)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showDetails ? "Hide detail" : "Show detail"}
          </Button>
        </div>
        {showDetails && <div className="overflow-x-auto">
          {period === "MONTHLY" ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-[11px] text-slate-700">
                <tr>
                  <th className="px-4 py-3">Payment date</th>
                  <th className="px-4 py-3">Tenant / Flat</th>
                  <th className="px-4 py-3">Building</th>
                  <th className="px-4 py-3 text-right">Rent</th>
                  <th className="px-4 py-3 text-right">Electricity billed</th>
                  <th className="px-4 py-3 text-right">Electricity received</th>
                  <th className="px-4 py-3 text-right">Total payment</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportStatements.map((statement) => (
                  <tr key={statement.id} className="hover:bg-slate-100/70">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {statement.paymentDate || statement.billingDate || `${statement.month}-01`}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">
                        {statement.tenantName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Flat #{statement.flatNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {statement.buildingName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-800">
                      {money(statement.baseRent)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sky-700">
                      {money(statement.electricityAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700">
                      {money(
                        Math.min(
                          statement.paymentReceived,
                          statement.electricityAmount,
                        ),
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {money(statement.paymentReceived)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-600">
                      {money(Math.max(0, statement.balanceThisMonth))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-[11px] text-slate-700">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Records</th>
                  <th className="px-4 py-3 text-right">Total billed</th>
                  <th className="px-4 py-3 text-right">Payments received</th>
                  <th className="px-4 py-3 text-right">Electricity billed</th>
                  <th className="px-4 py-3 text-right">Electricity received</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {yearlyRows.map(([month, row]) => (
                  <tr key={month} className="hover:bg-slate-100/70">
                    <td className="px-4 py-3 font-mono font-bold text-slate-950">
                      {month}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {row.records}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-800">
                      {money(row.billed)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {money(row.received)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sky-700">
                      {money(row.electricity)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700">
                      {money(row.electricityReceived)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-600">
                      {money(row.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs text-blue-700">
        <Zap className="mt-0.5 h-4 w-4 shrink-0" />
        Electricity received is the portion of each recorded payment allocated
        up to that statement&apos;s electricity charge.
      </div>
    </div>
  );
};
