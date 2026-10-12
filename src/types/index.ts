export type CurrencySymbol = '₹' | '$' | '€' | '£' | 'AED' | string;

export interface Building {
  id: string;
  name: string;
  address: string;
  totalFloors: number;
  totalFlats: number;
  electricityRatePerUnit: number; // e.g. ₹9.00 per kWh
  fixedMeterCharge: number;        // e.g. ₹100 base meter fee
  currency: CurrencySymbol;
}

export interface Flat {
  id: string;
  buildingId: string;
  flatNumber: string;
  floor: number;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  baseRent: number;
  meterNumber: string;
  electricityRatePerUnit?: number;
  fixedUtilityCharge?: number;
  isOccupied: boolean;
  isCommonArea?: boolean;
  leaseStartDate: string;
  leaseEndDate?: string;
}

export interface PaymentReceipt {
  id: string;
  flatId: string;
  buildingId: string;
  month: string; // YYYY-MM
  amount: number;
  date: string;
  method: 'CASH' | 'BANK_TRANSFER' | 'UPI_WIRE' | 'CHECK' | 'CARD';
  referenceNo: string;
  note?: string;
}

// Tenant Monthly Statement (strictly Rent + Electricity + Last Month Balance)
export interface FlatMonthlyStatement {
  id: string;
  flatId: string;
  buildingId: string;
  month: string; // YYYY-MM
  paymentDate?: string; // YYYY-MM-DD
  billingDate?: string; // Legacy imported records
  buildingName: string;
  flatNumber: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  meterNumber: string;
  baseRent: number;
  lastMonthBalance: number; // Previous month arrears or advance credit
  startReading: number;
  endReading: number;
  totalReading: number; // kWh units (endReading - startReading)
  ratePerUnit: number;
  fixedUtilityCharge: number;
  electricityAmount: number; // (totalReading * ratePerUnit) + fixedUtilityCharge
  totalDue: number; // lastMonthBalance + baseRent + electricityAmount
  paymentReceived: number;
  balanceThisMonth: number; // totalDue - paymentReceived
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  payments: PaymentReceipt[];
  attachment?: {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  };
}

export type ExpenseCategory = 
  | 'COMMON_ELECTRICITY' 
  | 'SECURITY_GUARDS' 
  | 'HOUSEKEEPING_STAFF' 
  | 'ELEVATOR_AMC' 
  | 'WATER_TANKERS' 
  | 'GENERATOR_DIESEL' 
  | 'REPAIRS_CIVIL' 
  | 'PEST_CONTROL' 
  | 'OTHER_FACILITIES';

// Monthly Operating Expense for the entire building
export interface BuildingExpense {
  id: string;
  buildingId: string;
  buildingName: string;
  month: string; // YYYY-MM
  category: ExpenseCategory;
  title: string;
  vendor: string;
  amount: number; // in ₹
  date: string;
  status: 'PAID' | 'PENDING';
  invoiceRef?: string;
  notes?: string;
}

export type MaintenanceCategory = 
  | 'ELECTRICAL' 
  | 'PLUMBING' 
  | 'HVAC' 
  | 'CARPENTRY' 
  | 'APPLIANCE' 
  | 'PEST_CONTROL' 
  | 'GENERAL';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type MaintenanceStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'RESOLVED' | 'CLOSED';

export interface MaintenanceRequest {
  id: string;
  ticketNumber: string;
  buildingId: string;
  buildingName: string;
  flatId: string;
  flatNumber: string;
  tenantName: string;
  tenantPhone: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  title: string;
  description: string;
  reportedDate: string;
  assignedTechnician?: string;
  technicianPhone?: string;
  estimatedCost: number;
  actualCost: number;
  isBilledToTenant: boolean;
  resolutionNotes?: string;
  resolvedDate?: string;
}
