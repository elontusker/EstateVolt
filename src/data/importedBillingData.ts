import billingCsv from "./billing-2026-10.csv?raw";
import { FlatMonthlyStatement } from "../types";

type ImportedStatementValues = Pick<
  FlatMonthlyStatement,
  | "month"
  | "buildingName"
  | "flatNumber"
  | "tenantName"
  | "meterNumber"
  | "startReading"
  | "endReading"
  | "totalReading"
  | "ratePerUnit"
  | "fixedUtilityCharge"
  | "electricityAmount"
  | "baseRent"
  | "lastMonthBalance"
  | "totalDue"
  | "paymentReceived"
  | "balanceThisMonth"
  | "status"
>;

const parseCsvRow = (row: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
};

const toNumber = (value: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value in imported billing CSV: ${value}`);
  }

  return parsed;
};

export const IMPORTED_BILLING_STATEMENTS: ImportedStatementValues[] = billingCsv
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .filter(Boolean)
  .map((row) => {
    const [
      buildingName,
      flatNumber,
      tenantName,
      month,
      meterNumber,
      startReading,
      endReading,
      totalReading,
      ratePerUnit,
      fixedUtilityCharge,
      electricityAmount,
      baseRent,
      lastMonthBalance,
      totalDue,
      paymentReceived,
      balanceThisMonth,
      status,
    ] = parseCsvRow(row);

    return {
      buildingName,
      flatNumber,
      tenantName,
      month,
      meterNumber,
      startReading: toNumber(startReading),
      endReading: toNumber(endReading),
      totalReading: toNumber(totalReading),
      ratePerUnit: toNumber(ratePerUnit),
      fixedUtilityCharge: toNumber(fixedUtilityCharge),
      electricityAmount: toNumber(electricityAmount),
      baseRent: toNumber(baseRent),
      lastMonthBalance: toNumber(lastMonthBalance),
      totalDue: toNumber(totalDue),
      paymentReceived: toNumber(paymentReceived),
      balanceThisMonth: toNumber(balanceThisMonth),
      status: status as FlatMonthlyStatement["status"],
    };
  });
