import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarRange,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Trophy,
  X,
} from "lucide-react";
import { useProperty } from "../context/PropertyContext";
import { Button, Heading, Input, Select } from "./ui/Primitives";
import { formatMonth } from "../utils/formatMonth";
import { RevenueD3Chart } from "./RevenueD3Chart";
import { BuildingExpensesView } from "./BuildingExpensesView";

type ReportPeriod = "MONTHLY" | "YEARLY";

export const ReportsView: React.FC = () => {
  const {
    statements,
    buildingExpenses,
    buildings,
    flats,
    selectedBuildingId,
    selectedMonth,
    setSelectedMonth,
    updateStatement,
    endLease,
    leaveWithoutPaying,
  } = useProperty();
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [reportMonth, setReportMonth] = useState(selectedMonth);
  const [reportYear, setReportYear] = useState(selectedMonth.slice(0, 4));
  const [tenantFilter, setTenantFilter] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [rankingPeriod, setRankingPeriod] = useState("ALL");
  const [filterPortalTarget, setFilterPortalTarget] = useState<HTMLElement | null>(null);
  const [paymentDetailDraft, setPaymentDetailDraft] = useState<{
    statementId: string;
    paymentDate: string;
    tenantName: string;
    flatNumber: string;
    baseRent: number;
    electricityReceived: number;
    paymentReceived: number;
    balanceThisMonth: number;
  } | null>(null);

  useEffect(() => {
    setReportMonth(selectedMonth);
    setReportYear(current => current === "ALL" ? current : selectedMonth.slice(0, 4));
  }, [selectedMonth]);

  useEffect(() => {
    setFilterPortalTarget(document.getElementById("report-filter-slot"));
  }, []);

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(statements.map((statement) => statement.month.slice(0, 4))),
      ).sort((a, b) => b.localeCompare(a)),
    [statements],
  );
  const availableMonths = useMemo(
    () =>
      Array.from(new Set(statements.map(statement => statement.month)))
        .sort((a, b) => b.localeCompare(a)),
    [statements],
  );

  const availableTenants = useMemo(
    () =>
      Array.from(
        new Set(
          statements
            .filter(statement => {
              if (
                selectedBuildingId !== "all" &&
                statement.buildingId !== selectedBuildingId
              ) {
                return false;
              }
              return period === "MONTHLY"
                ? statement.month === reportMonth
                : reportYear === "ALL" ||
                    statement.month.startsWith(`${reportYear}-`);
            })
            .map(statement => statement.tenantName),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [
      statements,
      selectedBuildingId,
      period,
      reportMonth,
      reportYear,
    ],
  );

  useEffect(() => {
    setTenantFilter("");
  }, [selectedBuildingId, period, reportMonth, reportYear]);

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
            : reportYear === "ALL" || statement.month.startsWith(`${reportYear}-`);
        if (!inPeriod) return false;
        if (
          tenantFilter.trim() &&
          !statement.tenantName.toLowerCase().includes(tenantFilter.trim().toLowerCase())
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
          : reportYear === "ALL" || expense.month.startsWith(`${reportYear}-`);
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
          const electricityReceived =
            statement.electricityReceived ??
            Math.min(statement.paymentReceived, statement.electricityAmount);
          totals.totalBilled += statement.totalDue;
          totals.totalReceived += statement.paymentReceived;
          totals.electricityBilled += statement.electricityAmount;
          totals.electricityReceived += electricityReceived;
          totals.outstanding += Math.max(0, statement.balanceThisMonth);
          totals.lostRent += statement.writtenOffAmount || 0;
          return totals;
        },
        {
          totalBilled: 0,
          totalReceived: 0,
          electricityBilled: 0,
          electricityReceived: 0,
          outstanding: 0,
          lostRent: 0,
        },
      ),
    [reportStatements],
  );

  const expenseTotal = periodExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const activeTenantCount = new Set(
    reportStatements.map(
      statement => `${statement.flatId}::${statement.tenantName.toLowerCase()}`,
    ),
  ).size;
  const electricityPaidExpense = periodExpenses
    .filter(expense => expense.category === "ELECTRICITY_PAID")
    .reduce((total, expense) => total + expense.amount, 0);
  const reportProfit = metrics.totalReceived - expenseTotal;
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
      row.electricityReceived +=
        statement.electricityReceived ??
        Math.min(statement.paymentReceived, statement.electricityAmount);
      row.outstanding += Math.max(0, statement.balanceThisMonth);
      row.records += 1;
      months.set(statement.month, row);
    });

    return Array.from(months.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [reportStatements]);

  const tenantTotals = useMemo(() => {
    const totals = new Map<string, { rent: number; paid: number; records: number }>();
    statements
      .filter(statement => {
        if (selectedBuildingId !== "all" && statement.buildingId !== selectedBuildingId) return false;
        return rankingPeriod === "ALL" || statement.month.startsWith(`${rankingPeriod}-`);
      })
      .forEach(statement => {
        const current = totals.get(statement.tenantName) || { rent: 0, paid: 0, records: 0 };
        current.rent += statement.baseRent;
        current.paid += statement.paymentReceived;
        current.records += 1;
        totals.set(statement.tenantName, current);
      });
    return Array.from(totals.entries())
      .sort(([, a], [, b]) => b.paid - a.paid)
      .slice(0, 3);
  }, [statements, selectedBuildingId, rankingPeriod]);

  const openPaymentDetailEditor = (statementId: string) => {
    const statement = statements.find(item => item.id === statementId);
    if (!statement) return;
    setPaymentDetailDraft({
      statementId: statement.id,
      paymentDate: statement.paymentDate || statement.billingDate || `${statement.month}-01`,
      tenantName: statement.tenantName,
      flatNumber: statement.flatNumber,
      baseRent: statement.baseRent,
      electricityReceived:
        statement.electricityReceived ??
        Math.min(statement.paymentReceived, statement.electricityAmount),
      paymentReceived: statement.paymentReceived,
      balanceThisMonth: statement.balanceThisMonth,
    });
  };

  const savePaymentDetailEdits = (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentDetailDraft) return;
    updateStatement(paymentDetailDraft.statementId, {
      paymentDate: paymentDetailDraft.paymentDate,
      tenantName: paymentDetailDraft.tenantName.trim(),
      flatNumber: paymentDetailDraft.flatNumber.trim(),
      baseRent: Math.max(0, paymentDetailDraft.baseRent),
      electricityReceived: Math.max(0, paymentDetailDraft.electricityReceived),
      paymentReceived: Math.max(0, paymentDetailDraft.paymentReceived),
      balanceThisMonth: paymentDetailDraft.balanceThisMonth,
    });
    setPaymentDetailDraft(null);
  };

  const handleTenantAction = (
    action: string,
    statementId: string,
    flatId: string,
    tenantName: string,
  ) => {
    if (action === "EDIT") {
      openPaymentDetailEditor(statementId);
      return;
    }
    const flat = flats.find(item => item.id === flatId);
    if (!flat?.isOccupied) return;
    const today = new Date().toISOString().split("T")[0];
    if (action === "CLOSE" && confirm(`Close the lease for ${tenantName} with the balance still collectible?`)) {
      endLease(flatId, today);
    }
    if (action === "LEFT_UNPAID" && confirm(`Mark ${tenantName} as left without paying and move the latest balance to lost money?`)) {
      leaveWithoutPaying(flatId, today);
    }
  };

  const exportReport = () => {
    const headers = [
      "Payment Date",
      "Month",
      "Building",
      "Flat",
      "Tenant",
      "Rent",
      "Electricity Received",
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
      statement.electricityReceived ??
        Math.min(statement.paymentReceived, statement.electricityAmount),
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
    link.download = `Rently_${period}_${period === "MONTHLY" ? reportMonth : reportYear}_Report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const money = (value: number) =>
    `${currency}${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-3">
      {filterPortalTarget && createPortal(
        <div className="flex min-w-max items-center gap-2 px-2">
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
                value={reportMonth}
                onChange={event => {
                  setReportMonth(event.target.value);
                  setSelectedMonth(event.target.value);
                }}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>{formatMonth(month)}</option>
                ))}
              </Select>
            ) : (
              <Select
                value={reportYear}
                onChange={event => {
                  const year = event.target.value;
                  setReportYear(year);
                  if (year !== "ALL") {
                    setSelectedMonth(`${year}-${selectedMonth.slice(5, 7)}`);
                  }
                }}
                className="bg-transparent font-mono text-xs text-slate-950 outline-none"
              >
                <option value="ALL">All years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            )}
          </div>

          <div className="flex min-w-52 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <Input
              type="search"
              list="report-tenant-options"
              value={tenantFilter}
              onChange={event => setTenantFilter(event.target.value)}
              placeholder="Search tenant..."
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-950 outline-none"
              aria-label="Filter reports by tenant"
            />
            <datalist id="report-tenant-options">
              {availableTenants.map(tenant => (
                <option key={tenant} value={tenant} />
              ))}
            </datalist>
          </div>
          <Button
            type="button"
            onClick={exportReport}
            className="rounded-lg border border-slate-300 bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            title="Export report"
            aria-label="Export report"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>,
        filterPortalTarget,
      )}

      <div className="flex items-center">
        <h1 className="text-lg font-bold tracking-tight text-slate-950">
          Monthly & Yearly Reports
        </h1>
      </div>

      <div className={`grid gap-2 sm:grid-cols-2 ${
        tenantFilter.trim() ? "xl:grid-cols-5" : "xl:grid-cols-8"
      }`}>
        <div className="app-surface rounded-xl p-2.5">
          <p className="text-[10px] font-medium text-slate-500">
            Active Tenant
          </p>
          <p className="mt-1 font-mono text-base font-bold text-slate-950">
            {activeTenantCount.toLocaleString("en-IN")}
          </p>
        </div>
        {[
          ["Payments received", metrics.totalReceived, "text-emerald-700"],
          [
            "Electricity Received",
            metrics.electricityReceived,
            "text-emerald-700",
          ],
          ["Lost Rent", metrics.lostRent, "text-rose-600"],
          ["Outstanding Balance", metrics.outstanding, "text-amber-700"],
          ...(
            tenantFilter.trim()
              ? []
              : [
                  ["Electricity paid", electricityPaidExpense, "text-orange-700"],
                  ["Total Expenses", expenseTotal, "text-blue-700"],
                  ["Profit", reportProfit, reportProfit >= 0 ? "text-emerald-700" : "text-rose-600"],
                ]
          ),
        ].map(([label, value, color]) => (
          <div key={String(label)} className="app-surface rounded-xl p-2.5">
            <p className="text-[10px] font-medium text-slate-500">{label}</p>
            <p className={`mt-1 font-mono text-base font-bold ${color}`}>
              {money(Number(value))}
            </p>
          </div>
        ))}
      </div>

      <RevenueD3Chart
        buildingId={selectedBuildingId}
        months={Array.from(new Set(reportStatements.map(statement => statement.month)))}
        collectionFilter="ALL"
      />

      <BuildingExpensesView
        reportPeriod={period}
        reportMonth={reportMonth}
        reportYear={reportYear}
      />

      <div className="app-surface rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-brand-primary" />
            <div>
              <Heading className="text-sm font-bold text-slate-950">TOP 3 PAYING TENANTS</Heading>
              <p className="text-xs text-slate-500">Payments received for the selected year or overall history.</p>
            </div>
          </div>
          <Select
            value={rankingPeriod}
            onChange={event => setRankingPeriod(event.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950"
            aria-label="Top payer ranking period"
          >
            <option value="ALL">Overall · since 2019</option>
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </Select>
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
                ? "Tenant Payment Detail"
                : "Monthly Rent Summary"}
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
                  <th className="px-4 py-3 text-right">Rent</th>
                  <th className="px-4 py-3 text-right">Electricity Received</th>
                  <th className="px-4 py-3 text-right">Total payment</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Actions</th>
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
                    <td className="px-4 py-3 text-right font-mono text-slate-800">
                      {money(statement.baseRent)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {money(
                        statement.electricityReceived ??
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
                    <td className="px-4 py-3">
                      <Select
                        value=""
                        onChange={event => handleTenantAction(
                          event.target.value,
                          statement.id,
                          statement.flatId,
                          statement.tenantName,
                        )}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                        aria-label={`Actions for ${statement.tenantName}`}
                      >
                        <option value="">Select action</option>
                        <option value="EDIT">Edit payment detail</option>
                        <option
                          value="CLOSE"
                          disabled={!flats.find(flat => flat.id === statement.flatId)?.isOccupied}
                        >
                          Close lease
                        </option>
                        <option
                          value="LEFT_UNPAID"
                          disabled={!flats.find(flat => flat.id === statement.flatId)?.isOccupied}
                        >
                          Left without paying
                        </option>
                      </Select>
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
                  <th className="px-4 py-3 text-right">Payments received</th>
                  <th className="px-4 py-3 text-right">Electricity Received</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {yearlyRows.map(([month, row]) => (
                  <tr key={month} className="hover:bg-slate-100/70">
                    <td className="px-4 py-3 font-mono font-bold text-slate-950">
                      {formatMonth(month)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {money(row.received)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
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

      {paymentDetailDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-xs">
          <form
            onSubmit={savePaymentDetailEdits}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-brand-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <Heading level={2} className="text-base font-bold text-slate-950">
                  Edit payment detail
                </Heading>
                <p className="mt-0.5 text-xs text-slate-500">
                  Modify any value shown in the Tenant Payment Detail row.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setPaymentDetailDraft(null)}
                className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Close payment detail editor"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid min-h-0 gap-4 overflow-y-auto p-5 text-xs sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-medium text-slate-700">
                  Payment date
                </span>
                <Input
                  type="date"
                  value={paymentDetailDraft.paymentDate}
                  onChange={event =>
                    setPaymentDetailDraft(current =>
                      current ? { ...current, paymentDate: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-950"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-slate-700">
                  Tenant name
                </span>
                <Input
                  value={paymentDetailDraft.tenantName}
                  onChange={event =>
                    setPaymentDetailDraft(current =>
                      current ? { ...current, tenantName: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-950"
                  autoFocus
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium text-slate-700">
                  Flat number
                </span>
                <Input
                  value={paymentDetailDraft.flatNumber}
                  onChange={event =>
                    setPaymentDetailDraft(current =>
                      current ? { ...current, flatNumber: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-950"
                  required
                />
              </label>
              {([
                ['baseRent', 'Rent'],
                ['electricityReceived', 'Electricity received'],
                ['paymentReceived', 'Total payment'],
                ['balanceThisMonth', 'Balance'],
              ] as const).map(([field, label]) => (
                <label key={field} className="block">
                  <span className="mb-1.5 block font-medium text-slate-700">
                    {label}
                  </span>
                  <Input
                    type="number"
                    step="any"
                    value={paymentDetailDraft[field]}
                    onChange={event =>
                      setPaymentDetailDraft(current =>
                        current
                          ? {
                              ...current,
                              [field]: Number(event.target.value) || 0,
                            }
                          : current,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 font-mono text-slate-950"
                    required
                  />
                </label>
              ))}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-500 sm:col-span-2">
                Building is controlled from Settings and is not shown in Tenant Payment Detail.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <Button
                type="button"
                onClick={() => setPaymentDetailDraft(null)}
                className="border border-slate-300 bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand-primary px-4 py-2 font-semibold text-white hover:bg-brand-primary-hover"
              >
                Save changes
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
