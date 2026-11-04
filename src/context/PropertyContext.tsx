import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Building, 
  Flat, 
  FlatMonthlyStatement, 
  MaintenanceRequest, 
  PaymentReceipt,
  BuildingExpense,
  MaintenanceStatus,
  CurrencySymbol
} from '../types';
import {
  BHAGAT_NIWAS_BUILDING,
  BHAGAT_NIWAS_EXPENSES,
  BHAGAT_NIWAS_FLATS,
  BHAGAT_NIWAS_STATEMENTS,
  migrateBhagatNiwasExpenses,
  migrateBhagatNiwasFlats,
  migrateBhagatNiwasStatements,
} from '../data/bhagatNiwasData';

interface PropertyContextType {
  buildings: Building[];
  flats: Flat[];
  statements: FlatMonthlyStatement[];
  buildingExpenses: BuildingExpense[];
  maintenanceRequests: MaintenanceRequest[];
  selectedBuildingId: string;
  setSelectedBuildingId: (id: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  
  // Electricity & Billing Actions
  updateElectricityReading: (statementId: string, startReading: number, endReading: number) => void;
  updateStatement: (
    statementId: string,
    changes: Partial<Pick<
      FlatMonthlyStatement,
      | 'paymentDate'
      | 'tenantName'
      | 'flatNumber'
      | 'baseRent'
      | 'electricityReceived'
      | 'startReading'
      | 'endReading'
      | 'paymentReceived'
      | 'balanceThisMonth'
    >>
  ) => void;
  writeOffBalance: (statementId: string, reason?: string) => void;
  batchUpdateReadings: (updates: { statementId: string; endReading: number; startReading?: number }[]) => void;
  upsertRentStatement: (data: {
    flatId: string;
    month: string;
    baseRent: number;
    startReading: number;
    endReading: number;
    lastMonthBalance: number;
    paymentReceived: number;
    paymentDate: string;
    attachment?: FlatMonthlyStatement['attachment'];
  }) => void;
  recordPayment: (
    statementId: string, 
    amount: number, 
    method: PaymentReceipt['method'], 
    referenceNo: string, 
    note?: string
  ) => void;
  
  // Building Operating Expenses Actions
  addBuildingExpense: (expense: Omit<BuildingExpense, 'id'>) => void;
  updateBuildingExpense: (expense: BuildingExpense) => void;
  deleteBuildingExpense: (id: string) => void;

  // Building & Flat Configuration
  updateBuildingRates: (
    buildingId: string, 
    rates: { 
      electricityRatePerUnit: number; 
      fixedMeterCharge: number; 
      currency?: CurrencySymbol;
    }
  ) => void;
  updateBuilding: (building: Building) => void;
  addBuilding: (building: Building) => void;
  addFlat: (flat: Flat) => void;
  updateFlat: (flat: Flat) => void;
  deleteFlat: (flatId: string) => void;
  endLease: (flatId: string, leaseEndDate: string) => void;
  leaveWithoutPaying: (flatId: string, leaseEndDate: string) => void;
  
  // Maintenance Actions
  addMaintenanceRequest: (request: Omit<MaintenanceRequest, 'id' | 'ticketNumber' | 'reportedDate'>) => void;
  updateMaintenanceStatus: (
    id: string, 
    status: MaintenanceStatus, 
    resolutionNotes?: string, 
    actualCost?: number
  ) => void;
  
  // Utilities & Export
  resetToSampleData: () => void;
  exportToCSV: () => void;
  exportExpensesCSV: () => void;
  exportMaintenanceCSV: () => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

const STORAGE_KEYS = {
  BUILDINGS: 'estatevolt_buildings_v4',
  FLATS: 'estatevolt_flats_v4',
  STATEMENTS: 'estatevolt_statements_v4',
  EXPENSES: 'estatevolt_expenses_v4',
  MAINTENANCE: 'estatevolt_maintenance_v4',
};

const LEGACY_STORAGE_KEYS = [
  'estatevolt_buildings_v3',
  'estatevolt_flats_v3',
  'estatevolt_statements_v3',
  'estatevolt_expenses_v3',
  'estatevolt_maintenance_v3',
];

const parseSaved = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch (error) {
    console.error(error);
    return fallback;
  }
};

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize Buildings
  const [buildings, setBuildings] = useState<Building[]>(() => {
    return parseSaved<Building[]>(STORAGE_KEYS.BUILDINGS, [BHAGAT_NIWAS_BUILDING]);
  });

  // Initialize Flats
  const [flats, setFlats] = useState<Flat[]>(() => {
    return migrateBhagatNiwasFlats(
      parseSaved<Flat[]>(STORAGE_KEYS.FLATS, BHAGAT_NIWAS_FLATS),
    );
  });

  // Initialize Statements (Tenant Rent + Electricity + Previous Balance)
  const [statements, setStatements] = useState<FlatMonthlyStatement[]>(() => {
    return migrateBhagatNiwasStatements(
      parseSaved<FlatMonthlyStatement[]>(
        STORAGE_KEYS.STATEMENTS,
        BHAGAT_NIWAS_STATEMENTS,
      ),
    );
  });

  // Initialize Full Building Operating Expenses
  const [buildingExpenses, setBuildingExpenses] = useState<BuildingExpense[]>(() => {
    return migrateBhagatNiwasExpenses(
      parseSaved<BuildingExpense[]>(STORAGE_KEYS.EXPENSES, BHAGAT_NIWAS_EXPENSES),
    );
  });

  // Initialize Maintenance Requests
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(() => {
    return parseSaved<MaintenanceRequest[]>(STORAGE_KEYS.MAINTENANCE, []);
  });

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(BHAGAT_NIWAS_BUILDING.id);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  const statusFor = (statement: FlatMonthlyStatement) => {
    if (statement.balanceThisMonth <= 0) return 'PAID' as const;
    if (statement.paymentReceived > 0) return 'PARTIAL' as const;
    if (statement.lastMonthBalance > 0) return 'OVERDUE' as const;
    return 'UNPAID' as const;
  };

  const carryBalanceForward = (
    source: FlatMonthlyStatement[],
    flatId: string,
    changedMonth: string,
  ) => {
    const timeline = source
      .filter(statement => statement.flatId === flatId && statement.month > changedMonth)
      .sort((a, b) => a.month.localeCompare(b.month));
    let previous = source.find(
      statement => statement.flatId === flatId && statement.month === changedMonth,
    );
    if (!previous) return source;

    const replacements = new Map<string, FlatMonthlyStatement>();
    timeline.forEach(statement => {
      const lastMonthBalance = previous?.balanceThisMonth || 0;
      const totalDue = Number(
        (lastMonthBalance + statement.baseRent + statement.electricityAmount).toFixed(2),
      );
      const writtenOffAmount = statement.writtenOffAmount || 0;
      const balanceThisMonth = Number(
        (totalDue - statement.paymentReceived - writtenOffAmount).toFixed(2),
      );
      const updated = {
        ...statement,
        lastMonthBalance,
        totalDue,
        balanceThisMonth,
      };
      const withStatus = { ...updated, status: statusFor(updated) };
      replacements.set(statement.id, withStatus);
      previous = withStatus;
    });

    return source.map(statement => replacements.get(statement.id) || statement);
  };

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUILDINGS, JSON.stringify(buildings));
  }, [buildings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(flats));
  }, [flats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STATEMENTS, JSON.stringify(statements));
  }, [statements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(buildingExpenses));
  }, [buildingExpenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenanceRequests));
  }, [maintenanceRequests]);

  // Recalculate statement figures (Strictly Rent + Electricity + Last Month Balance)
  const recalculateStatement = (
    stmt: FlatMonthlyStatement, 
    startReading: number, 
    endReading: number,
    customRate?: number,
    customFixedCharge?: number
  ): FlatMonthlyStatement => {
    const rate = customRate !== undefined ? customRate : stmt.ratePerUnit;
    const fixedFee = customFixedCharge !== undefined ? customFixedCharge : stmt.fixedUtilityCharge;
    
    // Total kWh consumed in the month
    const totalReading = Math.max(0, Number((endReading - startReading).toFixed(2)));
    const electricityAmount = Number((totalReading * rate + fixedFee).toFixed(2));
    
    // Total Due = Last Month Arrears + Current Base Rent + Current Electricity Bill
    const totalDue = Number((stmt.lastMonthBalance + stmt.baseRent + electricityAmount).toFixed(2));
    const balanceThisMonth = Number(
      (totalDue - stmt.paymentReceived - (stmt.writtenOffAmount || 0)).toFixed(2),
    );

    let status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' = 'UNPAID';
    if (balanceThisMonth <= 0) {
      status = 'PAID';
    } else if (stmt.paymentReceived > 0) {
      status = 'PARTIAL';
    } else if (stmt.lastMonthBalance > 0) {
      status = 'OVERDUE';
    } else {
      status = 'UNPAID';
    }

    return {
      ...stmt,
      startReading,
      endReading,
      totalReading,
      ratePerUnit: rate,
      fixedUtilityCharge: fixedFee,
      electricityAmount,
      totalDue,
      balanceThisMonth,
      status,
    };
  };

  // Update a single electricity reading
  const updateElectricityReading = (statementId: string, startReading: number, endReading: number) => {
    setStatements(prev => {
      const target = prev.find(statement => statement.id === statementId);
      if (!target) return prev;
      const updated = prev.map(statement =>
        statement.id === statementId
          ? recalculateStatement(statement, startReading, endReading)
          : statement,
      );
      return carryBalanceForward(updated, target.flatId, target.month);
    });
  };

  const updateStatement = (
    statementId: string,
    changes: Partial<Pick<
      FlatMonthlyStatement,
      | 'paymentDate'
      | 'tenantName'
      | 'flatNumber'
      | 'baseRent'
      | 'electricityReceived'
      | 'startReading'
      | 'endReading'
      | 'paymentReceived'
      | 'balanceThisMonth'
    >>,
  ) => {
    setStatements(prev => {
      const target = prev.find(statement => statement.id === statementId);
      if (!target) return prev;
      const startReading = changes.startReading ?? target.startReading;
      const endReading = changes.endReading ?? target.endReading;
      const totalReading = Math.max(0, Number((endReading - startReading).toFixed(2)));
      const electricityAmount = Number(
        (totalReading * target.ratePerUnit + target.fixedUtilityCharge).toFixed(2),
      );
      const baseRent = changes.baseRent ?? target.baseRent;
      const totalDue = Number(
        (target.lastMonthBalance + baseRent + electricityAmount).toFixed(2),
      );
      const paymentReceived = changes.paymentReceived ?? target.paymentReceived;
      const calculatedBalance = Number(
        (totalDue - paymentReceived - (target.writtenOffAmount || 0)).toFixed(2),
      );
      const balanceThisMonth = changes.balanceThisMonth ?? calculatedBalance;
      const updatedTarget = {
        ...target,
        ...changes,
        startReading,
        endReading,
        totalReading,
        electricityAmount,
        baseRent,
        totalDue,
        paymentReceived,
        balanceThisMonth,
      };
      const withStatus = { ...updatedTarget, status: statusFor(updatedTarget) };
      const updated = prev.map(statement =>
        statement.id === statementId ? withStatus : statement,
      );
      return carryBalanceForward(updated, target.flatId, target.month);
    });
  };

  const writeOffBalance = (statementId: string, reason?: string) => {
    setStatements(prev => {
      const target = prev.find(statement => statement.id === statementId);
      if (!target || target.balanceThisMonth <= 0) return prev;
      const updatedTarget: FlatMonthlyStatement = {
        ...target,
        writtenOffAmount: Number(
          ((target.writtenOffAmount || 0) + target.balanceThisMonth).toFixed(2),
        ),
        writtenOffDate: new Date().toISOString().split('T')[0],
        writtenOffReason: reason || 'Unrecoverable tenant balance',
        balanceThisMonth: 0,
        status: 'PAID',
      };
      const updated = prev.map(statement =>
        statement.id === statementId ? updatedTarget : statement,
      );
      return carryBalanceForward(updated, target.flatId, target.month);
    });
  };

  // Bulk / batch update electricity readings
  const batchUpdateReadings = (updates: { statementId: string; endReading: number; startReading?: number }[]) => {
    const updateMap = new Map(updates.map(u => [u.statementId, u]));
    setStatements(prev => prev.map(stmt => {
      const update = updateMap.get(stmt.id);
      if (update) {
        const start = update.startReading !== undefined ? update.startReading : stmt.startReading;
        return recalculateStatement(stmt, start, update.endReading);
      }
      return stmt;
    }));
  };

  // Create or Update a Rent Statement for a flat and month
  const upsertRentStatement = (data: {
    flatId: string;
    month: string;
    baseRent: number;
    startReading: number;
    endReading: number;
    lastMonthBalance: number;
    paymentReceived: number;
    paymentDate: string;
    attachment?: FlatMonthlyStatement['attachment'];
  }) => {
    setStatements(prev => {
      const existingIdx = prev.findIndex(s => s.flatId === data.flatId && s.month === data.month);
      const existing = existingIdx >= 0 ? prev[existingIdx] : undefined;
      const flat = flats.find(f => f.id === data.flatId);
      const building = buildings.find(
        b => b.id === (flat?.buildingId || existing?.buildingId || ''),
      );
      const buildingName = building?.name || existing?.buildingName || 'Apartment Complex';
      const flatNumber = flat?.flatNumber || existing?.flatNumber || '101';
      const tenantName = flat?.tenantName || existing?.tenantName || 'Resident';
      const tenantPhone = flat?.tenantPhone || existing?.tenantPhone || '';
      const tenantEmail = flat?.tenantEmail || existing?.tenantEmail || '';
      const meterNumber = flat?.meterNumber || existing?.meterNumber || 'MTR-101';
      const ratePerUnit =
        flat?.electricityRatePerUnit ??
        existing?.ratePerUnit ??
        building?.electricityRatePerUnit ??
        9.0;
      const fixedUtilityCharge =
        flat?.fixedUtilityCharge ??
        existing?.fixedUtilityCharge ??
        building?.fixedMeterCharge ??
        0;

      const totalReading = Math.max(0, Number((data.endReading - data.startReading).toFixed(2)));
      const electricityAmount = Number((totalReading * ratePerUnit + fixedUtilityCharge).toFixed(2));
      const totalDue = Number((data.baseRent + electricityAmount + data.lastMonthBalance).toFixed(2));
      const balanceThisMonth = Number((totalDue - data.paymentReceived).toFixed(2));

      let status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' = 'UNPAID';
      if (balanceThisMonth <= 0) {
        status = 'PAID';
      } else if (data.paymentReceived > 0) {
        status = 'PARTIAL';
      } else if (data.lastMonthBalance > 0) {
        status = 'OVERDUE';
      } else {
        status = 'UNPAID';
      }

      if (existingIdx >= 0) {
        const updated: FlatMonthlyStatement = {
          ...existing!,
          baseRent: data.baseRent,
          startReading: data.startReading,
          endReading: data.endReading,
          totalReading,
          ratePerUnit,
          fixedUtilityCharge,
          electricityAmount,
          lastMonthBalance: data.lastMonthBalance,
          totalDue,
          paymentReceived: data.paymentReceived,
          balanceThisMonth,
          status,
          paymentDate: data.paymentDate,
          attachment: data.attachment,
        };
        const next = [...prev];
        next[existingIdx] = updated;
        return carryBalanceForward(next, existing!.flatId, existing!.month);
      } else {
        const newStmt: FlatMonthlyStatement = {
          id: `stmt-${data.flatId}-${data.month}-${Date.now()}`,
          flatId: data.flatId,
          buildingId: flat?.buildingId || buildings[0]?.id || '',
          month: data.month,
          paymentDate: data.paymentDate,
          buildingName,
          flatNumber,
          tenantName,
          tenantPhone,
          tenantEmail,
          meterNumber,
          baseRent: data.baseRent,
          lastMonthBalance: data.lastMonthBalance,
          startReading: data.startReading,
          endReading: data.endReading,
          totalReading,
          ratePerUnit,
          fixedUtilityCharge,
          electricityAmount,
          totalDue,
          paymentReceived: data.paymentReceived,
          balanceThisMonth,
          status,
          attachment: data.attachment,
          payments: data.paymentReceived > 0 ? [{
            id: `pay-${Date.now()}`,
            flatId: data.flatId,
            buildingId: flat?.buildingId || '',
            month: data.month,
            amount: data.paymentReceived,
            date: data.paymentDate,
            method: 'BANK_TRANSFER',
            referenceNo: `REC-${Date.now().toString().slice(-6)}`,
            note: 'Initial monthly payment entry'
          }] : [],
        };
        return [newStmt, ...prev];
      }
    });
  };

  // Record a payment receipt
  const recordPayment = (
    statementId: string, 
    amount: number, 
    method: PaymentReceipt['method'], 
    referenceNo: string, 
    note?: string
  ) => {
    setStatements(prev => prev.map(stmt => {
      if (stmt.id === statementId) {
        const newPayment: PaymentReceipt = {
          id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          flatId: stmt.flatId,
          buildingId: stmt.buildingId,
          month: stmt.month,
          amount,
          date: new Date().toISOString().split('T')[0],
          method,
          referenceNo: referenceNo || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          note,
        };

        const updatedPayments = [...stmt.payments, newPayment];
        const newPaymentReceived = Number((stmt.paymentReceived + amount).toFixed(2));
        const newBalanceThisMonth = Number((stmt.totalDue - newPaymentReceived).toFixed(2));

        let status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' = 'UNPAID';
        if (newBalanceThisMonth <= 0) {
          status = 'PAID';
        } else if (newPaymentReceived > 0) {
          status = 'PARTIAL';
        } else if (stmt.lastMonthBalance > 0) {
          status = 'OVERDUE';
        } else {
          status = 'UNPAID';
        }

        return {
          ...stmt,
          paymentReceived: newPaymentReceived,
          balanceThisMonth: newBalanceThisMonth,
          status,
          payments: updatedPayments,
        };
      }
      return stmt;
    }));
  };

  // Building Operating Expenses CRUD
  const addBuildingExpense = (expense: Omit<BuildingExpense, 'id'>) => {
    const newExpense: BuildingExpense = {
      ...expense,
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    setBuildingExpenses(prev => [newExpense, ...prev]);
  };

  const updateBuildingExpense = (expense: BuildingExpense) => {
    setBuildingExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
  };

  const deleteBuildingExpense = (id: string) => {
    setBuildingExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Update building rates and apply to matching statements
  const updateBuildingRates = (
    buildingId: string, 
    rates: { 
      electricityRatePerUnit: number; 
      fixedMeterCharge: number; 
      currency?: CurrencySymbol;
    }
  ) => {
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, ...rates } : b));

    // Recalculate existing statements for that building
    setStatements(prev => prev.map(stmt => {
      if (stmt.buildingId === buildingId) {
        const totalReading = stmt.totalReading;
        const electricityAmount = Number((totalReading * rates.electricityRatePerUnit + rates.fixedMeterCharge).toFixed(2));
        const totalDue = Number((stmt.lastMonthBalance + stmt.baseRent + electricityAmount).toFixed(2));
        const balanceThisMonth = Number((totalDue - stmt.paymentReceived).toFixed(2));
        
        let status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' = 'UNPAID';
        if (balanceThisMonth <= 0) {
          status = 'PAID';
        } else if (stmt.paymentReceived > 0) {
          status = 'PARTIAL';
        } else if (stmt.lastMonthBalance > 0) {
          status = 'OVERDUE';
        } else {
          status = 'UNPAID';
        }

        return {
          ...stmt,
          ratePerUnit: rates.electricityRatePerUnit,
          fixedUtilityCharge: rates.fixedMeterCharge,
          electricityAmount,
          totalDue,
          balanceThisMonth,
          status,
        };
      }
      return stmt;
    }));
  };

  const addBuilding = (building: Building) => {
    setBuildings(prev => [...prev, building]);
  };

  const updateBuilding = (building: Building) => {
    setBuildings(prev => prev.map(item => item.id === building.id ? building : item));
    setStatements(prev => prev.map(statement => statement.buildingId === building.id
      ? { ...statement, buildingName: building.name }
      : statement));
    setBuildingExpenses(prev => prev.map(expense => expense.buildingId === building.id
      ? { ...expense, buildingName: building.name }
      : expense));
    setMaintenanceRequests(prev => prev.map(request => request.buildingId === building.id
      ? { ...request, buildingName: building.name }
      : request));
  };

  const addFlat = (flat: Flat) => {
    setFlats(prev => [...prev, flat]);
    const bld = buildings.find(b => b.id === flat.buildingId);
    if (bld) {
      const rate = flat.electricityRatePerUnit ?? bld.electricityRatePerUnit;
      const fixedFee = flat.fixedUtilityCharge ?? bld.fixedMeterCharge;
      const baseStart = 1000;
      const endReading = 1000;
      const totalReading = 0;
      const electricityAmount = fixedFee;
      const totalDue = flat.baseRent + electricityAmount;

      const newStmt: FlatMonthlyStatement = {
        id: `stmt-${flat.id}-${selectedMonth}`,
        flatId: flat.id,
        buildingId: flat.buildingId,
        month: selectedMonth,
        buildingName: bld.name,
        flatNumber: flat.flatNumber,
        tenantName: flat.tenantName,
        tenantPhone: flat.tenantPhone,
        tenantEmail: flat.tenantEmail,
        meterNumber: flat.meterNumber,
        baseRent: flat.baseRent,
        lastMonthBalance: 0,
        startReading: baseStart,
        endReading,
        totalReading,
        ratePerUnit: rate,
        fixedUtilityCharge: fixedFee,
        electricityAmount,
        totalDue,
        paymentReceived: 0,
        balanceThisMonth: totalDue,
        status: 'UNPAID',
        payments: [],
      };
      setStatements(prev => [...prev, newStmt]);
    }
  };

  const updateFlat = (flat: Flat) => {
    const normalizedFlat = {
      ...flat,
      leaseStatus: flat.isOccupied ? 'ACTIVE' as const : flat.leaseStatus || 'CLOSED' as const,
    };
    setFlats(prev => prev.map(f => f.id === flat.id ? normalizedFlat : f));
    setStatements(prev => {
      const updated = prev.map(stmt => {
        if (stmt.flatId === normalizedFlat.id && stmt.month >= normalizedFlat.leaseStartDate.slice(0, 7)) {
          const ratePerUnit = normalizedFlat.electricityRatePerUnit ?? stmt.ratePerUnit;
          const fixedUtilityCharge = normalizedFlat.fixedUtilityCharge ?? stmt.fixedUtilityCharge;
          const electricityAmount = Number((stmt.totalReading * ratePerUnit + fixedUtilityCharge).toFixed(2));
          const totalDue = Number((stmt.lastMonthBalance + normalizedFlat.baseRent + electricityAmount).toFixed(2));
          const balanceThisMonth = Number(
            (totalDue - stmt.paymentReceived - (stmt.writtenOffAmount || 0)).toFixed(2),
          );
          const updatedStatement = {
            ...stmt,
            flatNumber: normalizedFlat.flatNumber,
            tenantName: normalizedFlat.tenantName,
            tenantPhone: normalizedFlat.tenantPhone,
            tenantEmail: normalizedFlat.tenantEmail,
            baseRent: normalizedFlat.baseRent,
            ratePerUnit,
            fixedUtilityCharge,
            electricityAmount,
            totalDue,
            balanceThisMonth,
          };
          return { ...updatedStatement, status: statusFor(updatedStatement) };
        }
        return stmt;
      });
      const firstMonth = updated
        .filter(statement => statement.flatId === normalizedFlat.id)
        .map(statement => statement.month)
        .sort()[0];
      return firstMonth ? carryBalanceForward(updated, normalizedFlat.id, firstMonth) : updated;
    });
  };

  const deleteFlat = (flatId: string) => {
    setFlats(prev => prev.filter(flat => flat.id !== flatId));
    setStatements(prev => prev.filter(statement => statement.flatId !== flatId));
  };

  const endLease = (flatId: string, leaseEndDate: string) => {
    setFlats(prev => prev.map(flat => flat.id === flatId
      ? { ...flat, isOccupied: false, leaseStatus: 'CLOSED', leaseEndDate }
      : flat));
  };

  const leaveWithoutPaying = (flatId: string, leaseEndDate: string) => {
    setStatements(prev => {
      const latest = prev
        .filter(statement => statement.flatId === flatId)
        .sort((a, b) => b.month.localeCompare(a.month))[0];
      if (!latest || latest.balanceThisMonth <= 0) return prev;
      const lostAmount = latest.balanceThisMonth;
      const updatedTarget: FlatMonthlyStatement = {
        ...latest,
        writtenOffAmount: Number(((latest.writtenOffAmount || 0) + lostAmount).toFixed(2)),
        writtenOffDate: leaseEndDate,
        writtenOffReason: 'Tenant left without paying',
        balanceThisMonth: 0,
        status: 'PAID',
      };
      const updated = prev.map(statement =>
        statement.id === latest.id ? updatedTarget : statement,
      );
      return carryBalanceForward(updated, flatId, latest.month);
    });
    setFlats(prev => prev.map(flat => flat.id === flatId
      ? {
          ...flat,
          isOccupied: false,
          leaseStatus: 'LEFT_WITHOUT_PAYING',
          leaseEndDate,
        }
      : flat));
  };

  // Add maintenance request
  const addMaintenanceRequest = (request: Omit<MaintenanceRequest, 'id' | 'ticketNumber' | 'reportedDate'>) => {
    const nextTicketNum = `MNT-${1000 + maintenanceRequests.length + 1}`;
    const newReq: MaintenanceRequest = {
      ...request,
      id: `mnt-${Date.now()}`,
      ticketNumber: nextTicketNum,
      reportedDate: new Date().toISOString().split('T')[0],
    };
    setMaintenanceRequests(prev => [newReq, ...prev]);
  };

  const updateMaintenanceStatus = (
    id: string, 
    status: MaintenanceStatus, 
    resolutionNotes?: string, 
    actualCost?: number
  ) => {
    setMaintenanceRequests(prev => prev.map(req => {
      if (req.id === id) {
        return {
          ...req,
          status,
          ...(resolutionNotes ? { resolutionNotes } : {}),
          ...(actualCost !== undefined ? { actualCost } : {}),
          ...(status === 'RESOLVED' || status === 'CLOSED' ? { resolvedDate: new Date().toISOString().split('T')[0] } : {})
        };
      }
      return req;
    }));
  };

  const resetToSampleData = () => {
    localStorage.removeItem(STORAGE_KEYS.BUILDINGS);
    localStorage.removeItem(STORAGE_KEYS.FLATS);
    localStorage.removeItem(STORAGE_KEYS.STATEMENTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.MAINTENANCE);

    setBuildings([BHAGAT_NIWAS_BUILDING]);
    setFlats(BHAGAT_NIWAS_FLATS);
    setStatements(BHAGAT_NIWAS_STATEMENTS);
    setBuildingExpenses(BHAGAT_NIWAS_EXPENSES);
    setMaintenanceRequests([]);
  };

  const exportToCSV = () => {
    const filtered = selectedBuildingId === 'all' 
      ? statements.filter(s => s.month === selectedMonth)
      : statements.filter(s => s.buildingId === selectedBuildingId && s.month === selectedMonth);

    const headers = [
      'Building Name',
      'Flat Number',
      'Tenant Name',
      'Billing Month',
      'Payment Date',
      'Start Reading (kWh)',
      'End Reading (kWh)',
      'Total Reading (kWh)',
      'Rate Per Unit',
      'Fixed Meter Fee',
      'Electricity Cost',
      'Rent',
      'Last Month Balance',
      'Total Amount (Rent+Elec Bill+Last Month Balance)',
      'Payment',
      'Balance (Total Amount - Payment)',
      'Status',
      'Attachment'
    ];

    const rows = filtered.map(s => [
      `"${s.buildingName}"`,
      `"${s.flatNumber}"`,
      `"${s.tenantName}"`,
      `"${s.month}"`,
      `"${s.paymentDate || s.billingDate || `${s.month}-01`}"`,
      s.startReading,
      s.endReading,
      s.totalReading,
      s.ratePerUnit,
      s.fixedUtilityCharge,
      s.electricityAmount,
      s.baseRent,
      s.lastMonthBalance,
      s.totalDue,
      s.paymentReceived,
      s.balanceThisMonth,
      s.status,
      `"${s.attachment?.name || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Electricity_Rent_Billing_${selectedMonth}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExpensesCSV = () => {
    const filtered = selectedBuildingId === 'all'
      ? buildingExpenses.filter(e => e.month === selectedMonth)
      : buildingExpenses.filter(e => e.buildingId === selectedBuildingId && e.month === selectedMonth);

    const headers = [
      'Building Name',
      'Billing Month',
      'Category',
      'Expense Type',
      'Title / Description',
      'Meter Number',
      'Meter Reading',
      'Amount (INR)',
      'Date',
      'Notes'
    ];

    const rows = filtered.map(e => [
      `"${e.buildingName}"`,
      `"${e.month}"`,
      `"${e.category}"`,
      `"${e.expenseType || 'EXPENSE'}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.meterNumber || ''}"`,
      e.meterReading ?? '',
      e.amount,
      e.date,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Building_Expenses_${selectedMonth}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMaintenanceCSV = () => {
    const headers = [
      'Ticket Number',
      'Building',
      'Flat Number',
      'Tenant Name',
      'Category',
      'Priority',
      'Status',
      'Title',
      'Description',
      'Reported Date',
      'Technician',
      'Phone',
      'Estimated Cost (INR)',
      'Actual Cost (INR)',
      'Resolved Date'
    ];

    const rows = maintenanceRequests.map(m => [
      `"${m.ticketNumber}"`,
      `"${m.buildingName}"`,
      `"${m.flatNumber}"`,
      `"${m.tenantName}"`,
      `"${m.category}"`,
      `"${m.priority}"`,
      `"${m.status}"`,
      `"${m.title.replace(/"/g, '""')}"`,
      `"${m.description.replace(/"/g, '""')}"`,
      m.reportedDate,
      `"${m.assignedTechnician || ''}"`,
      `"${m.technicianPhone || ''}"`,
      m.estimatedCost,
      m.actualCost,
      m.resolvedDate || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Maintenance_Requests_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PropertyContext.Provider value={{
      buildings,
      flats,
      statements,
      buildingExpenses,
      maintenanceRequests,
      selectedBuildingId,
      setSelectedBuildingId,
      selectedMonth,
      setSelectedMonth,
      updateElectricityReading,
      updateStatement,
      writeOffBalance,
      batchUpdateReadings,
      upsertRentStatement,
      recordPayment,
      addBuildingExpense,
      updateBuildingExpense,
      deleteBuildingExpense,
      updateBuildingRates,
      updateBuilding,
      addBuilding,
      addFlat,
      updateFlat,
      deleteFlat,
      endLease,
      leaveWithoutPaying,
      addMaintenanceRequest,
      updateMaintenanceStatus,
      resetToSampleData,
      exportToCSV,
      exportExpensesCSV,
      exportMaintenanceCSV,
    }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};
