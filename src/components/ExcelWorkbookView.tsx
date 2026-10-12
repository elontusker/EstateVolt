import React from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { useProperty } from "../context/PropertyContext";
import { useOneDriveSync } from "../context/OneDriveSyncContext";

export const ExcelWorkbookView: React.FC = () => {
  const {
    buildings,
    flats,
    statements,
    buildingExpenses,
    maintenanceRequests,
  } = useProperty();
  const {
    isConfigured,
    accountName,
    status,
    lastSyncedAt,
    error,
    workbookUrl,
    embedUrl,
    connect,
    disconnect,
    syncNow,
  } = useOneDriveSync();
  const isBusy = status === "connecting" || status === "syncing";

  const sheets = [
    { label: "Billing", count: statements.length },
    {
      label: "Payments",
      count: statements.reduce(
        (total, statement) => total + statement.payments.length,
        0,
      ),
    },
    { label: "Flats", count: flats.length },
    { label: "Buildings", count: buildings.length },
    { label: "Expenses", count: buildingExpenses.length },
    { label: "Maintenance", count: maintenanceRequests.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-700">
            <FileSpreadsheet className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Microsoft Excel Online
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Live OneDrive workbook
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            The provided workbook is embedded below and can receive every
            building, tenant, bill, payment, expense, and maintenance update.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accountName && (
            <>
              <button
                onClick={() => void syncNow()}
                disabled={isBusy}
                className="flex items-center gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`}
                />
                Sync now
              </button>
              <button
                onClick={() => void disconnect()}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            </>
          )}
          <a
            href={workbookUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Open in Excel Online
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {sheets.map((sheet) => (
          <div
            key={sheet.label}
            className="rounded-xl border border-slate-200 bg-brand-surface p-4"
          >
            <span className="text-xs font-medium text-slate-500">
              {sheet.label}
            </span>
            <p className="mt-2 font-mono text-xl font-bold text-slate-950">
              {sheet.count.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              workbook rows
            </span>
          </div>
        ))}
      </div>

      {!isConfigured && (
        <div className="overflow-hidden rounded-2xl border border-sky-200 bg-brand-surface">
          <div className="flex items-start gap-4 border-b border-slate-200 bg-brand-primary/5 p-6">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">
                Workbook embedded · Microsoft write authorization pending
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                The share link allows the workbook to be displayed. Microsoft
                Graph authorization is required before EstateVolt can upload
                the CSV data and future monthly updates.
              </p>
            </div>
          </div>
          <div className="grid gap-6 p-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                One-time Microsoft setup
              </p>
              <ol className="mt-3 space-y-3 text-sm text-slate-500">
                <li>1. Create a Single-page application in Microsoft Entra.</li>
                <li>2. Add this application URL as its SPA redirect URI.</li>
                <li>
                  3. Grant delegated User.Read and Files.ReadWrite permissions.
                </li>
                <li>4. Add the application Client ID to the environment.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">
                Required environment values
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-surface p-3 font-mono text-xs leading-relaxed text-emerald-700">
                VITE_MICROSOFT_CLIENT_ID=&quot;...&quot;{"\n"}
                VITE_MICROSOFT_TENANT_ID=&quot;common&quot;
              </pre>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                No Microsoft client secret is stored in the browser.
              </p>
            </div>
          </div>
        </div>
      )}

      {isConfigured && !accountName && (
        <div className="rounded-2xl border border-slate-200 bg-brand-surface p-7 text-center">
          <h2 className="text-lg font-bold text-slate-950">
            Authorize the workbook owner
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Sign in with the Microsoft account that owns or can edit the shared
            workbook. The first synchronization uploads the imported CSV and
            all existing EstateVolt records.
          </p>
          <button
            onClick={() => void connect()}
            disabled={isBusy}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-wait disabled:opacity-60"
          >
            {isBusy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Sign in with Microsoft
          </button>
        </div>
      )}

      {accountName && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            status === "error"
              ? "border-rose-500/20 bg-rose-500/10"
              : "border-emerald-500/20 bg-emerald-500/10"
          }`}
        >
          <div className="flex items-center gap-3">
            {isBusy ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-sky-700" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {isBusy
                  ? "Uploading workbook updates"
                  : status === "error"
                    ? "Workbook synchronization needs attention"
                    : "Automatic synchronization active"}
              </p>
              <p className="text-xs text-slate-500">
                {error ||
                  `${accountName}${lastSyncedAt ? ` · Last synced ${lastSyncedAt.toLocaleTimeString()}` : ""}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-brand-surface">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold text-slate-950">
            EstateVolt Excel workbook
          </p>
          <p className="text-xs text-slate-400">
            Embedded from the provided OneDrive share link
          </p>
        </div>
        <iframe
          key={lastSyncedAt?.toISOString() || "initial"}
          title="EstateVolt Excel workbook"
          src={embedUrl}
          className="h-[620px] w-full bg-brand-surface"
          allowFullScreen
        />
      </div>
    </div>
  );
};
