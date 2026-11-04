import rawBhagatNiwasData from "./bhagat-niwas.json?raw";
import { Building, BuildingExpense, Flat, FlatMonthlyStatement } from "../types";

interface BhagatNiwasImport {
  building: Building;
  flats: Flat[];
  statements: FlatMonthlyStatement[];
  expenses: BuildingExpense[];
}

const parsed = JSON.parse(rawBhagatNiwasData) as BhagatNiwasImport;

const BHAGAT_NIWAS_ID = "bld-bhagat-niwas";
const SHOP_FLAT_ID = `${BHAGAT_NIWAS_ID}-shop-1`;

export const migrateBhagatNiwasFlats = (flats: Flat[]): Flat[] => {
  if (flats.some(flat => flat.id === SHOP_FLAT_ID)) return flats;

  const rekhaFlat = flats.find(
    flat =>
      flat.id === `${BHAGAT_NIWAS_ID}-1` &&
      flat.flatNumber === "1" &&
      flat.tenantName.toLowerCase().includes("rekha"),
  );
  if (!rekhaFlat) return flats;

  const shiftedFlats = flats
    .filter(flat => flat.id !== `${BHAGAT_NIWAS_ID}-19`)
    .map(flat => {
      const match = flat.id.match(/^bld-bhagat-niwas-(\d+)$/);
      const unitNumber = match ? Number(match[1]) : 0;
      if (unitNumber < 1 || unitNumber > 18) return flat;
      return {
        ...flat,
        flatNumber: String(unitNumber + 1),
      };
    });

  const shop: Flat = {
    id: SHOP_FLAT_ID,
    buildingId: BHAGAT_NIWAS_ID,
    flatNumber: "1",
    floor: 1,
    tenantName: "Shop",
    tenantPhone: "",
    tenantEmail: "",
    baseRent: 0,
    meterNumber: "",
    electricityRatePerUnit: parsed.building.electricityRatePerUnit,
    fixedUtilityCharge: parsed.building.fixedMeterCharge,
    isOccupied: false,
    isCommonArea: true,
    leaseStatus: "CLOSED",
    leaseStartDate: "2021-01-01",
  };

  return [...shiftedFlats, shop];
};

export const migrateBhagatNiwasStatements = (
  statements: FlatMonthlyStatement[],
): FlatMonthlyStatement[] =>
  statements.map(statement => {
    const match = statement.flatId.match(/^bld-bhagat-niwas-(\d+)$/);
    const unitNumber = match ? Number(match[1]) : 0;
    if (
      unitNumber < 1 ||
      unitNumber > 18 ||
      statement.flatNumber !== String(unitNumber)
    ) {
      return statement;
    }
    return {
      ...statement,
      flatNumber: String(unitNumber + 1),
    };
  });

export const migrateBhagatNiwasExpenses = (
  expenses: BuildingExpense[],
): BuildingExpense[] =>
  expenses.map(expense =>
    (expense.category as string) === "COMMON_ELECTRICITY"
      ? { ...expense, category: "ELECTRICITY_PAID" }
      : expense,
  );

export const BHAGAT_NIWAS_BUILDING = parsed.building;
export const BHAGAT_NIWAS_FLATS = migrateBhagatNiwasFlats(parsed.flats);
export const BHAGAT_NIWAS_STATEMENTS = migrateBhagatNiwasStatements(
  parsed.statements,
);
export const BHAGAT_NIWAS_EXPENSES = migrateBhagatNiwasExpenses(
  parsed.expenses,
);
