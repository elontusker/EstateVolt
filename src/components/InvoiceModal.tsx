import React, { useState } from 'react';
import { FlatMonthlyStatement, Building } from '../types';
import { 
  Printer, 
  X, 
  Copy, 
  Check, 
  Zap, 
  User, 
  Calendar, 
  Receipt,
  FileCheck2
} from 'lucide-react';

interface InvoiceModalProps {
  statement: FlatMonthlyStatement | null;
  building?: Building;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  statement,
  building,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!statement) return null;

  const currency = building ? building.currency : '₹';

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `
🏢 *RENT & ELECTRICITY BILL*
Building: ${statement.buildingName}
Flat No: #${statement.flatNumber}
Resident: ${statement.tenantName}
Billing Cycle: ${statement.month}
----------------------------------------
⚡ *ELECTRICITY USAGE (Meter: ${statement.meterNumber})*
- Month Start Reading: ${statement.startReading} kWh
- Month End Reading: ${statement.endReading} kWh
- Total Consumed: ${statement.totalReading} kWh
- Tariff: ${currency}${statement.ratePerUnit}/unit + ${currency}${statement.fixedUtilityCharge} meter fee
- Electricity Total: ${currency}${statement.electricityAmount.toFixed(2)}

🏠 *FLAT RENT*
- Rent: ${currency}${statement.baseRent.toLocaleString('en-IN')}

📊 *RECONCILIATION & BALANCE*
- Last Month Balance: ${currency}${statement.lastMonthBalance.toFixed(2)}
- Total Amount (Rent + Elec Bill + Last Month Balance): ${currency}${statement.totalDue.toFixed(2)}
- Payment: ${currency}${statement.paymentReceived.toFixed(2)}
👉 *BALANCE (Total Amount - Payment): ${currency}${statement.balanceThisMonth.toFixed(2)}*
----------------------------------------
Please remit payment via UPI / Bank Transfer by the 10th. Thank you!
    `.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-brand-surface text-slate-900 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print-only-container">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-brand-surface border-b border-slate-200 text-slate-950 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-semibold">Tenant Rent & Electricity Invoice</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Copy bill text for WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Text' : 'Copy for WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document */}
        <div className="overflow-y-auto flex-1 p-8 text-slate-700 printable-card">
          
          {/* Invoice Header */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 text-emerald-700 font-bold text-xl tracking-tight">
                <img
                  src="/rently-brand.png"
                  alt="Rently"
                  className="h-16 w-auto object-contain"
                />
                <span>Management</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Estate Office · {statement.buildingName}
              </p>
              <p className="text-xs text-slate-400">
                {building?.address || 'Metro City Residential Complex'}
              </p>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-500 block">
                Tax Invoice & Statement
              </span>
              <span className="text-lg font-mono font-bold text-slate-900 block mt-0.5">
                INV-{statement.month}-{statement.flatNumber}
              </span>
              <span className="text-xs text-slate-400 block">
                Billing Cycle: {statement.month}
              </span>
            </div>
          </div>

          {/* Tenant and Flat Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-6 border-b border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Resident Details:</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">{statement.tenantName}</span>
              <span className="text-slate-400 block">{statement.tenantPhone}</span>
              <span className="text-slate-400 block">{statement.tenantEmail}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Flat & Meter:</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">Flat #{statement.flatNumber}</span>
              <span className="text-slate-400 block">{statement.buildingName}</span>
              <span className="text-slate-400 block font-mono">Electric Sub-Meter: {statement.meterNumber}</span>
            </div>

            <div className="sm:text-right">
              <span className="text-slate-400 block font-medium">Payment Status:</span>
              <span className={`inline-block font-bold text-xs uppercase px-2 py-0.5 rounded mt-1 ${
                statement.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : statement.status === 'PARTIAL'
                  ? 'bg-sky-100 text-sky-900'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {statement.status}
              </span>
              <span className="text-slate-400 text-[11px] block mt-1">Due Date: 10th of Month</span>
            </div>
          </div>

          {/* Electricity Meter Breakdown Callout */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
              <span className="flex items-center gap-1.5 text-sky-800">
                <Zap className="w-4 h-4" />
                <span>Monthly Electricity Consumption & Metering Audit</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">Sub-meter: {statement.meterNumber}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-brand-surface border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[10px] block font-sans">Month Start Reading</span>
                <span className="text-sm font-bold text-slate-700 tabular-nums">{statement.startReading.toLocaleString()} kWh</span>
              </div>
              <div className="p-2.5 bg-brand-surface border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[10px] block font-sans">Month End Reading</span>
                <span className="text-sm font-bold text-slate-700 tabular-nums">{statement.endReading.toLocaleString()} kWh</span>
              </div>
              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-sky-950">
                <span className="text-sky-800 text-[10px] block font-sans font-medium">Total Units Consumed</span>
                <span className="text-sm font-bold tabular-nums">{statement.totalReading.toLocaleString()} kWh</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                <span className="text-emerald-700 text-[10px] block font-sans font-medium">Electricity Bill</span>
                <span className="text-sm font-bold tabular-nums">{currency}{statement.electricityAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-sans flex items-center justify-between pt-1">
              <span>Tariff Formula: ({statement.totalReading} units × {currency}{statement.ratePerUnit}/unit) + {currency}{statement.fixedUtilityCharge} base meter charge</span>
              <span className="font-medium text-slate-600">Verified by Building Management</span>
            </div>
          </div>

          {/* Itemized Table (No maintenance column) */}
          <div className="mb-6">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5 text-center">Unit / Basis</th>
                  <th className="py-2.5 text-right">Rate</th>
                  <th className="py-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-mono">
                {/* 1. Flat Base Rent */}
                <tr>
                  <td className="py-3 font-sans">
                    <div className="font-semibold text-slate-900">Flat Base Rent</div>
                    <div className="text-[11px] text-slate-400">Monthly residential lease for Flat #{statement.flatNumber}</div>
                  </td>
                  <td className="py-3 text-center text-slate-400 font-sans">1 Month</td>
                  <td className="py-3 text-right text-slate-400">{currency}{statement.baseRent.toLocaleString('en-IN')}</td>
                  <td className="py-3 text-right font-semibold text-slate-900">{currency}{statement.baseRent.toLocaleString('en-IN')}</td>
                </tr>

                {/* 2. Electricity Energy Usage */}
                <tr>
                  <td className="py-3 font-sans">
                    <div className="font-semibold text-slate-900">Electricity Energy Consumption</div>
                    <div className="text-[11px] text-slate-400">{statement.totalReading} kWh (End: {statement.endReading} - Start: {statement.startReading})</div>
                  </td>
                  <td className="py-3 text-center text-slate-400 font-sans">{statement.totalReading} kWh</td>
                  <td className="py-3 text-right text-slate-400">{currency}{statement.ratePerUnit}/unit</td>
                  <td className="py-3 text-right font-semibold text-slate-900">
                    {currency}{(statement.totalReading * statement.ratePerUnit).toFixed(2)}
                  </td>
                </tr>

                {/* 3. Electric Meter Base Charge */}
                <tr>
                  <td className="py-3 font-sans">
                    <div className="font-semibold text-slate-900">Fixed Electric Meter Maintenance Charge</div>
                    <div className="text-[11px] text-slate-400">Sub-meter connection and line infrastructure</div>
                  </td>
                  <td className="py-3 text-center text-slate-400 font-sans">Fixed</td>
                  <td className="py-3 text-right text-slate-400">{currency}{statement.fixedUtilityCharge.toFixed(2)}</td>
                  <td className="py-3 text-right font-semibold text-slate-900">{currency}{statement.fixedUtilityCharge.toFixed(2)}</td>
                </tr>

                {/* 4. Last Month Balance (if any) */}
                {statement.lastMonthBalance !== 0 && (
                  <tr className={statement.lastMonthBalance > 0 ? 'bg-sky-50/70' : 'bg-emerald-50/50'}>
                    <td className="py-3 font-sans">
                      <div className={`font-semibold ${statement.lastMonthBalance > 0 ? 'text-sky-900' : 'text-emerald-800'}`}>
                        {statement.lastMonthBalance > 0 ? 'Previous Month Unpaid Arrears' : 'Previous Month Advance Credit'}
                      </div>
                      <div className="text-[11px] text-slate-400">Carried forward from previous billing cycle</div>
                    </td>
                    <td className="py-3 text-center text-slate-400 font-sans">Carryover</td>
                    <td className="py-3 text-right text-slate-400">-</td>
                    <td className={`py-3 text-right font-bold ${statement.lastMonthBalance > 0 ? 'text-sky-800' : 'text-emerald-700'}`}>
                      {statement.lastMonthBalance > 0 ? `+${currency}${statement.lastMonthBalance.toFixed(2)}` : `-${currency}${Math.abs(statement.lastMonthBalance).toFixed(2)}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Grand Totals & Balance Summary */}
          <div className="border-t-2 border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            
            {/* Receipts Log if payment made */}
            <div className="text-xs text-slate-400 space-y-1 w-full sm:w-1/2">
              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                Payment History for this Cycle
              </span>
              {statement.payments.length === 0 ? (
                <p className="text-slate-500 italic text-[11px]">No payments recorded yet for {statement.month}.</p>
              ) : (
                <div className="space-y-1 mt-1 font-mono text-[11px]">
                  {statement.payments.map((p, idx) => (
                    <div key={p.id || idx} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span>{p.date} · {p.method} ({p.referenceNo})</span>
                      <strong className="text-emerald-700">+{currency}{p.amount.toLocaleString('en-IN')}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="w-full sm:w-80 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Rent:</span>
                <span>{currency}{statement.baseRent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Electricity Bill:</span>
                <span>+{currency}{statement.electricityAmount.toFixed(2)}</span>
              </div>
              
              {statement.lastMonthBalance !== 0 && (
                <div className={`flex justify-between font-medium ${statement.lastMonthBalance > 0 ? 'text-sky-800' : 'text-emerald-700'}`}>
                  <span>Last Month Balance:</span>
                  <span>{statement.lastMonthBalance > 0 ? `+${currency}${statement.lastMonthBalance.toFixed(2)}` : `-${currency}${Math.abs(statement.lastMonthBalance).toFixed(2)}`}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span className="font-sans text-[11px]">Total Amount (Rent+Elec+Last Bal):</span>
                <span>{currency}{statement.totalDue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Payment:</span>
                <span>-{currency}{statement.paymentReceived.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t-2 border-slate-100">
                <span className="font-sans">Balance (Total Amount - Payment):</span>
                <span className={statement.balanceThisMonth > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {currency}{statement.balanceThisMonth.toFixed(2)}
                </span>
              </div>
            </div>

          </div>

          {/* Signature / Payment Remittance Footer */}
          <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 text-[11px] text-slate-400">
            <div>
              <p className="font-bold text-slate-600">Payment Modes Accepted:</p>
              <p>UPI, IMPS / NEFT Direct Bank Transfer, or Cash at Estate Office.</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-600">Estate Property Manager</p>
              <p>Authorized Stamp & Sign</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
