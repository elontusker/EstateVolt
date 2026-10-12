import React, { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { FlatMonthlyStatement, PaymentReceipt } from '../types';
import { CreditCard, X, Check, DollarSign, Building2, User, Calendar } from 'lucide-react';

interface PaymentModalProps {
  statement: FlatMonthlyStatement | null;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ statement, onClose }) => {
  const { recordPayment, buildings } = useProperty();

  const [amount, setAmount] = useState<number>(() => {
    return statement ? Math.max(0, statement.balanceThisMonth) : 0;
  });

  const [method, setMethod] = useState<PaymentReceipt['method']>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState<string>(() => {
    return `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  });
  const [note, setNote] = useState<string>('Monthly settlement (Rent + Electricity)');

  if (!statement) return null;

  const building = buildings.find(b => b.id === statement.buildingId);
  const currency = building ? building.currency : '₹';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Payment amount must be greater than 0.');
      return;
    }

    recordPayment(
      statement.id,
      amount,
      method,
      referenceNo,
      note
    );

    alert(`Payment of ${currency}${amount.toFixed(2)} recorded for Flat #${statement.flatNumber} (${statement.tenantName})!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-brand-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">Record Resident Payment</h2>
              <p className="text-xs text-slate-500">
                Update payment receipt & reduce outstanding balance
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

        {/* Resident & Account Brief */}
        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-200 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Flat & Building</span>
            <span className="font-semibold text-slate-950">Flat #{statement.flatNumber} · {statement.buildingName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Tenant Name</span>
            <span className="font-semibold text-slate-800">{statement.tenantName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Due This Month</span>
            <span className="font-mono font-bold text-slate-800">
              {currency}{statement.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Balance Outstanding</span>
            <span className="font-mono font-bold text-rose-600">
              {currency}{statement.balanceThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 font-medium">Payment Amount ({currency})</label>
              <button
                type="button"
                onClick={() => setAmount(Math.max(0, statement.balanceThisMonth))}
                className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
              >
                Set Full Balance ({currency}{Math.max(0, statement.balanceThisMonth).toFixed(2)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono font-bold text-sm focus:outline-none focus:border-brand-accent"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-slate-700 font-medium block mb-1.5">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 focus:outline-none focus:border-slate-400"
            >
              <option value="BANK_TRANSFER">Bank Direct Transfer / ACH</option>
              <option value="UPI_WIRE">UPI / Wire Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHECK">Cheque</option>
              <option value="CARD">Credit / Debit Card</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="text-slate-700 font-medium block mb-1.5">
              Transaction / Reference Number
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 font-mono text-xs focus:outline-none"
              placeholder="e.g. TXN-94821 or Cash Receipt #12"
              required
            />
          </div>

          {/* Note / Memo */}
          <div>
            <label className="text-slate-700 font-medium block mb-1.5">
              Receipt Notes (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-950 text-xs focus:outline-none"
              placeholder="Notes on payment receipt"
            />
          </div>

          {/* Balance Preview after payment */}
          <div className="p-3 rounded-lg bg-slate-100/80 border border-slate-300/70 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">Remaining Balance After Payment:</span>
            <span className={`font-bold ${
              statement.balanceThisMonth - amount <= 0 ? 'text-emerald-700' : 'text-sky-700'
            }`}>
              {currency}{Math.max(0, statement.balanceThisMonth - amount).toFixed(2)}
            </span>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Confirm & Post Receipt
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
