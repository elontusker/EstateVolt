import { 
  Building, 
  Flat, 
  FlatMonthlyStatement, 
  MaintenanceRequest, 
  PaymentReceipt,
  BuildingExpense 
} from '../types';
import { IMPORTED_BILLING_STATEMENTS } from './importedBillingData';

export const INITIAL_BUILDINGS: Building[] = [
  {
    id: 'bld-skyline',
    name: 'Skyline Heights',
    address: 'Plot 42, Sector 18, Metro City',
    totalFloors: 7,
    totalFlats: 42,
    electricityRatePerUnit: 9.0, // ₹9.00 per kWh
    fixedMeterCharge: 100,      // ₹100 monthly meter charge
    currency: '₹',
  },
  {
    id: 'bld-grandview',
    name: 'Grandview Crest',
    address: '88 Parkview Enclave, Phase 2, Metro City',
    totalFloors: 8,
    totalFlats: 40,
    electricityRatePerUnit: 9.5, // ₹9.50 per kWh
    fixedMeterCharge: 120,      // ₹120 monthly meter charge
    currency: '₹',
  }
];

const FIRST_NAMES = [
  'Aarav', 'Diya', 'Vihaan', 'Ananya', 'Advik', 'Ishaan', 'Kabir', 'Riya',
  'Arjun', 'Saanvi', 'Rohan', 'Pooja', 'Aditya', 'Neha', 'Sai', 'Kavya',
  'Reyansh', 'Meera', 'Kunal', 'Tanvi', 'Rahul', 'Sneha', 'Vikram', 'Priya',
  'Manish', 'Shreya', 'Amit', 'Anushka', 'Gaurav', 'Tara', 'Deepak', 'Nisha',
  'Siddharth', 'Divya', 'Suresh', 'Simran', 'Varun', 'Swati', 'Alok', 'Preeti',
  'Rajesh', 'Poonam', 'Naveen', 'Ritu', 'Pranav', 'Payal', 'Sachin', 'Sonali',
  'Nikhil', 'Bhavna', 'Harsh', 'Radhika', 'Yash', 'Shruti', 'Akash', 'Komal'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Reddy', 'Singh', 'Chopra', 'Malhotra',
  'Mehta', 'Nair', 'Iyer', 'Bhatia', 'Joshi', 'Saxena', 'Kumar', 'Kapoor',
  'Pandey', 'Mishra', 'Agarwal', 'Shah', 'Rao', 'Deshmukh', 'Kulkarni', 'Dubey',
  'Trivedi', 'Yadav', 'Menon', 'Pillai', 'Bose', 'Mukherjee', 'Chatterjee', 'Das',
  'Sinha', 'Chauhan', 'Tiwari', 'Bansal', 'Goyal', 'Mittal', 'Jain', 'Gill'
];

// Helper to generate tenants and flats
export function generateInitialFlats(buildings: Building[]): Flat[] {
  const flats: Flat[] = [];
  let nameIndex = 0;

  buildings.forEach((building) => {
    const isSkyline = building.id === 'bld-skyline';
    const flatsPerFloor = isSkyline ? 6 : 5;
    const floors = building.totalFloors;

    for (let floor = 1; floor <= floors; floor++) {
      for (let unit = 1; unit <= flatsPerFloor; unit++) {
        const flatNumber = `${floor}0${unit}`;
        const flatId = `${building.id}-${flatNumber}`;
        const firstName = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
        const lastName = LAST_NAMES[(nameIndex + floor * 3) % LAST_NAMES.length];
        nameIndex++;

        // Base rent in Indian Rupees (₹18,000 - ₹32,000)
        const baseRent = isSkyline 
          ? 18000 + (floor * 500) + ((unit % 2) * 1000)
          : 22000 + (floor * 600) + ((unit % 2) * 1200);

        flats.push({
          id: flatId,
          buildingId: building.id,
          flatNumber,
          floor,
          tenantName: `${firstName} ${lastName}`,
          tenantPhone: `+91 ${Math.floor(98000 + (nameIndex * 17) % 1900)} ${Math.floor(10000 + (nameIndex * 43) % 90000)}`,
          tenantEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.in`,
          baseRent,
          meterNumber: `MTR-${building.name.slice(0, 3).toUpperCase()}-${flatNumber}`,
          isOccupied: true,
          leaseStartDate: `2025-${String((unit % 12) + 1).padStart(2, '0')}-01`,
        });
      }
    }
  });

  return flats;
}

export const DEFAULT_MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

// Generate monthly tenant statements (Strictly Rent + Electricity + Last Month Balance)
export function generateInitialStatements(
  buildings: Building[], 
  flats: Flat[],
  months: string[] = DEFAULT_MONTHS
): FlatMonthlyStatement[] {
  const buildingMap = new Map(buildings.map(b => [b.id, b]));
  const statements: FlatMonthlyStatement[] = [];

  const flatMeters = new Map<string, number>();
  const flatCarryover = new Map<string, number>();

  flats.forEach((flat, idx) => {
    flatMeters.set(flat.id, 2800 + (idx * 95));
    flatCarryover.set(flat.id, 0);
  });

  months.forEach((month, mIdx) => {
    const isCurrentMonth = month === '2026-10';
    const isSummer = month === '2026-06' || month === '2026-07' || month === '2026-08';

    flats.forEach((flat, idx) => {
      const building = buildingMap.get(flat.buildingId)!;
      const startReading = flatMeters.get(flat.id)!;

      // Realistic electricity units: 160 to 420 kWh
      const baseUnits = 180 + ((idx * 37 + mIdx * 19) % 170);
      const summerAcBump = isSummer ? 90 + ((idx * 13) % 80) : 0;
      const unitsUsed = baseUnits + summerAcBump;
      const endReading = startReading + unitsUsed;
      flatMeters.set(flat.id, endReading);

      const rate = building.electricityRatePerUnit;
      const fixedFee = building.fixedMeterCharge;
      const electricityAmount = Number((unitsUsed * rate + fixedFee).toFixed(2));

      // Carryover from previous month (in Rupee)
      const lastMonthBalance = flatCarryover.get(flat.id) || 0;
      
      // Total Due = Last Month Balance + Current Rent + Electricity Bill (NO maintenance fee column!)
      const totalDue = Number((lastMonthBalance + flat.baseRent + electricityAmount).toFixed(2));

      const payments: PaymentReceipt[] = [];
      let paymentReceived = 0;

      if (!isCurrentMonth) {
        if (idx % 25 === 3) {
          // Partial payment
          paymentReceived = Math.round(totalDue * 0.85);
          flatCarryover.set(flat.id, Number((totalDue - paymentReceived).toFixed(2)));
        } else {
          paymentReceived = totalDue;
          flatCarryover.set(flat.id, 0);
        }

        payments.push({
          id: `pay-${flat.id}-${month}`,
          flatId: flat.id,
          buildingId: flat.buildingId,
          month,
          amount: paymentReceived,
          date: `${month}-05`,
          method: 'UPI_WIRE',
          referenceNo: `UPI-${month.replace('-', '')}-${1000 + idx}`,
          note: `UPI Settlement for ${month}`
        });
      } else {
        // Current month (October 2026)
        if (idx % 5 === 0 || idx % 5 === 2) {
          paymentReceived = totalDue;
          payments.push({
            id: `pay-${flat.id}-1`,
            flatId: flat.id,
            buildingId: flat.buildingId,
            month,
            amount: totalDue,
            date: '2026-10-04',
            method: 'UPI_WIRE',
            referenceNo: `UPI-10-${100000 + idx * 43}`,
            note: 'October rent + electricity payment via UPI'
          });
        } else if (idx % 5 === 1) {
          const partial = Math.round(totalDue * 0.7);
          paymentReceived = partial;
          payments.push({
            id: `pay-${flat.id}-1`,
            flatId: flat.id,
            buildingId: flat.buildingId,
            month,
            amount: partial,
            date: '2026-10-02',
            method: 'BANK_TRANSFER',
            referenceNo: `NEFT-${880000 + idx * 19}`,
            note: 'Bank NEFT partial transfer'
          });
        } else if (idx % 5 === 3) {
          const rentOnly = flat.baseRent;
          paymentReceived = rentOnly;
          payments.push({
            id: `pay-${flat.id}-1`,
            flatId: flat.id,
            buildingId: flat.buildingId,
            month,
            amount: rentOnly,
            date: '2026-10-03',
            method: 'CASH',
            referenceNo: `REC-${700 + idx}`,
            note: 'Cash payment received at estate office'
          });
        } else {
          paymentReceived = 0;
        }
      }

      const balanceThisMonth = Number((totalDue - paymentReceived).toFixed(2));

      let status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' = 'UNPAID';
      if (balanceThisMonth <= 0) {
        status = 'PAID';
      } else if (paymentReceived > 0) {
        status = 'PARTIAL';
      } else if (lastMonthBalance > 0) {
        status = 'OVERDUE';
      } else {
        status = 'UNPAID';
      }

      statements.push({
        id: `stmt-${flat.id}-${month}`,
        flatId: flat.id,
        buildingId: flat.buildingId,
        month,
        buildingName: building.name,
        flatNumber: flat.flatNumber,
        tenantName: flat.tenantName,
        tenantPhone: flat.tenantPhone,
        tenantEmail: flat.tenantEmail,
        meterNumber: flat.meterNumber,
        baseRent: flat.baseRent,
        lastMonthBalance,
        startReading,
        endReading,
        totalReading: unitsUsed,
        ratePerUnit: rate,
        fixedUtilityCharge: fixedFee,
        electricityAmount,
        totalDue,
        paymentReceived,
        balanceThisMonth,
        status,
        payments,
      });
    });
  });

  const importedStatementMap = new Map(
    IMPORTED_BILLING_STATEMENTS.map(statement => [
      `${statement.buildingName}:${statement.flatNumber}:${statement.month}`,
      statement,
    ])
  );

  return statements.map(statement => {
    const importedStatement = importedStatementMap.get(
      `${statement.buildingName}:${statement.flatNumber}:${statement.month}`
    );

    return importedStatement
      ? { ...statement, ...importedStatement }
      : statement;
  });
}

// Generate monthly operating expenses for the entire building
export function generateInitialBuildingExpenses(
  buildings: Building[],
  months: string[] = DEFAULT_MONTHS
): BuildingExpense[] {
  const expenses: BuildingExpense[] = [];

  months.forEach((month, mIdx) => {
    buildings.forEach((building) => {
      const isSkyline = building.id === 'bld-skyline';
      const isSummer = month === '2026-06' || month === '2026-07' || month === '2026-08';

      // 1. Common Area Electricity (Lifts, water booster pump, corridor lights)
      expenses.push({
        id: `exp-${building.id}-${month}-comm-elec`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'ELECTRICITY_PAID',
        title: 'Common Meter Electricity (Lift, Pumps, Passage Lights)',
        vendor: 'State Electricity Distribution Co.',
        amount: isSummer ? 21500 : 16800,
        date: `${month}-08`,
        status: 'PAID',
        invoiceRef: `EB-COM-${month.replace('-', '')}-${isSkyline ? '11' : '22'}`,
        notes: 'Includes 2 passenger elevators, underground booster pump, and solar inverter sync'
      });

      // 2. Building Security Guards (24/7 Security Agency)
      expenses.push({
        id: `exp-${building.id}-${month}-security`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'SECURITY_GUARDS',
        title: '24x7 Security Guard Service (3 Shifts, 2 Guards each)',
        vendor: 'Eagle Eye Security Solutions Pvt Ltd',
        amount: isSkyline ? 34000 : 32000,
        date: `${month}-03`,
        status: 'PAID',
        invoiceRef: `SEC-INV-${month.replace('-', '')}-${isSkyline ? '01' : '02'}`,
        notes: 'Monthly guard payroll & visitor management desk'
      });

      // 3. Housekeeping & Sanitation Staff
      expenses.push({
        id: `exp-${building.id}-${month}-housekeeping`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'HOUSEKEEPING_STAFF',
        title: 'Housekeeping, Floor Scrubbing & Garbage Collection',
        vendor: 'CleanSweep Facility Management',
        amount: isSkyline ? 19500 : 18000,
        date: `${month}-05`,
        status: 'PAID',
        invoiceRef: `HK-${month.replace('-', '')}-${isSkyline ? 'A' : 'B'}`,
        notes: 'Daily hallway sweep, trash chute sanitization, and chemicals'
      });

      // 4. Elevator AMC (Otis / Schindler)
      expenses.push({
        id: `exp-${building.id}-${month}-elevator`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'ELEVATOR_AMC',
        title: 'Elevator Annual Maintenance Contract & Brake Service',
        vendor: 'Schindler India Elevator Services',
        amount: 8500,
        date: `${month}-12`,
        status: 'PAID',
        invoiceRef: `AMC-ELV-${month.replace('-', '')}`,
        notes: 'Bi-weekly rope tension, governor check and car door lubrication'
      });

      // 5. Water Supply & Tanker Charges
      expenses.push({
        id: `exp-${building.id}-${month}-water`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'WATER_TANKERS',
        title: 'Municipal Water Connection & Supplementary Tankers',
        vendor: 'Jal Board & Sagar Water Supplies',
        amount: isSummer ? 16000 : 9500,
        date: `${month}-14`,
        status: 'PAID',
        invoiceRef: `WTR-${month.replace('-', '')}-${isSkyline ? '1' : '2'}`,
        notes: 'Overhead tank refill & pump pressure testing'
      });

      // 6. Generator Diesel & Fuel (Backup Power)
      expenses.push({
        id: `exp-${building.id}-${month}-generator`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'GENERATOR_DIESEL',
        title: 'Diesel Fuel for 125 kVA Silent DG Set',
        vendor: 'Bharat Petroleum Fuel Station',
        amount: 6800,
        date: `${month}-18`,
        status: 'PAID',
        invoiceRef: `DG-DSL-${month.replace('-', '')}`,
        notes: '75 Litres diesel purchased for backup generator tank'
      });

      // 7. Building Repairs & Civil Maintenance
      expenses.push({
        id: `exp-${building.id}-${month}-repairs`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'REPAIRS_CIVIL',
        title: 'Building Common Repairs, Plumbing Valves & Waterproofing',
        vendor: 'Apex Hardware & Contractors',
        amount: mIdx % 2 === 0 ? 5800 : 4200,
        date: `${month}-22`,
        status: month === '2026-10' ? 'PENDING' : 'PAID',
        invoiceRef: `REP-${month.replace('-', '')}`,
        notes: 'Replacement of overhead float valve and terrace drain trap'
      });

      // 8. Pest Control & Garden Maintenance
      expenses.push({
        id: `exp-${building.id}-${month}-pest`,
        buildingId: building.id,
        buildingName: building.name,
        month,
        category: 'PEST_CONTROL',
        title: 'Basement Fogging, Pest Control & Courtyard Gardening',
        vendor: 'GreenGuard Environmental Care',
        amount: 3500,
        date: `${month}-25`,
        status: 'PAID',
        invoiceRef: `PEST-${month.replace('-', '')}`,
        notes: 'Mosquito larvicide spray in drains and parking lot'
      });
    });
  });

  return expenses;
}

export const INITIAL_MAINTENANCE_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'mnt-001',
    ticketNumber: 'MNT-1041',
    buildingId: 'bld-skyline',
    buildingName: 'Skyline Heights',
    flatId: 'bld-skyline-302',
    flatNumber: '302',
    tenantName: 'Ishaan Verma',
    tenantPhone: '+91 98211 44521',
    category: 'PLUMBING',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    title: 'Bathroom sink pipe leaking beneath vanity',
    description: 'Slow leak dripping continuously under the sink cabinet. Water container placed to catch drops.',
    reportedDate: '2026-10-02',
    assignedTechnician: 'Ramesh Sharma (City Plumbers)',
    technicianPhone: '+91 98450 12345',
    estimatedCost: 850,
    actualCost: 0,
    isBilledToTenant: false,
    resolutionNotes: 'Parts ordered; replacement P-trap scheduled for this afternoon.',
  },
  {
    id: 'mnt-002',
    ticketNumber: 'MNT-1042',
    buildingId: 'bld-skyline',
    buildingName: 'Skyline Heights',
    flatId: 'bld-skyline-405',
    flatNumber: '405',
    tenantName: 'Ananya Gupta',
    tenantPhone: '+91 98330 99881',
    category: 'ELECTRICAL',
    priority: 'EMERGENCY',
    status: 'IN_PROGRESS',
    title: 'Main circuit breaker tripping when water geyser starts',
    description: '32A MCB trips repeatedly whenever 25L bathroom geyser or heavy induction switches on.',
    reportedDate: '2026-10-03',
    assignedTechnician: 'Dinesh Kumar (Spark Electricians)',
    technicianPhone: '+91 98110 56789',
    estimatedCost: 1200,
    actualCost: 0,
    isBilledToTenant: false,
    resolutionNotes: 'Technician on-site testing breaker impedance and load distribution.',
  },
  {
    id: 'mnt-003',
    ticketNumber: 'MNT-1043',
    buildingId: 'bld-grandview',
    buildingName: 'Grandview Crest',
    flatId: 'bld-grandview-104',
    flatNumber: '104',
    tenantName: 'Advik Nair',
    tenantPhone: '+91 98770 33412',
    category: 'HVAC',
    priority: 'MEDIUM',
    status: 'NEW',
    title: 'Living room split AC unit not cooling adequately',
    description: 'AC fan spins but air is barely room temperature. Possible gas leakage or condenser cleaning required.',
    reportedDate: '2026-10-03',
    assignedTechnician: 'CoolWave AC Services',
    technicianPhone: '+91 98220 88765',
    estimatedCost: 1500,
    actualCost: 0,
    isBilledToTenant: false,
  },
  {
    id: 'mnt-004',
    ticketNumber: 'MNT-1044',
    buildingId: 'bld-skyline',
    buildingName: 'Skyline Heights',
    flatId: 'bld-skyline-206',
    flatNumber: '206',
    tenantName: 'Kabir Chopra',
    tenantPhone: '+91 98990 66543',
    category: 'CARPENTRY',
    priority: 'LOW',
    status: 'WAITING_PARTS',
    title: 'Balcony sliding door roller track sticking',
    description: 'Sliding glass door is hard to push open. Track wheel bearing seems worn out.',
    reportedDate: '2026-09-29',
    assignedTechnician: 'Mohan Lal (Building Carpentry)',
    technicianPhone: '+91 98101 23490',
    estimatedCost: 650,
    actualCost: 0,
    isBilledToTenant: false,
    resolutionNotes: 'Custom nylon roller wheels ordered; delivery expected in 2 days.',
  },
  {
    id: 'mnt-005',
    ticketNumber: 'MNT-1045',
    buildingId: 'bld-grandview',
    buildingName: 'Grandview Crest',
    flatId: 'bld-grandview-502',
    flatNumber: '502',
    tenantName: 'Saanvi Mehta',
    tenantPhone: '+91 98402 77890',
    category: 'APPLIANCE',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    title: 'Washing machine drainage pump filter blocked',
    description: 'Washer display threw E20 drain failure code during spin cycle.',
    reportedDate: '2026-09-28',
    assignedTechnician: 'Ramesh Sharma (City Plumbers)',
    technicianPhone: '+91 98450 12345',
    estimatedCost: 600,
    actualCost: 550,
    isBilledToTenant: false,
    resolutionNotes: 'Cleared lint and coin debris from impellor chamber. Washer cycle verified normal.',
    resolvedDate: '2026-09-30',
  }
];
