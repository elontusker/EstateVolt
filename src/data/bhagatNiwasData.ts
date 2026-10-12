import rawBhagatNiwasData from "./bhagat-niwas.json?raw";
import { Building, BuildingExpense, Flat, FlatMonthlyStatement } from "../types";

interface BhagatNiwasImport {
  building: Building;
  flats: Flat[];
  statements: FlatMonthlyStatement[];
  expenses: BuildingExpense[];
}

const parsed = JSON.parse(rawBhagatNiwasData) as BhagatNiwasImport;

export const BHAGAT_NIWAS_BUILDING = parsed.building;
export const BHAGAT_NIWAS_FLATS = parsed.flats;
export const BHAGAT_NIWAS_STATEMENTS = parsed.statements;
export const BHAGAT_NIWAS_EXPENSES = parsed.expenses;
