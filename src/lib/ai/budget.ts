import { AiBudgetExhaustedError } from "./errors";

export type MonthlyUsageReader = {
  getSpendUsdBetween(start: Date, end: Date): Promise<number>;
};

export type MonthlyBudgetStatus = {
  allowed: boolean;
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  periodStart: Date;
  periodEnd: Date;
};

export function getUtcCalendarMonth(date: Date): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)),
  };
}

export async function getMonthlyBudgetStatus(
  usageReader: MonthlyUsageReader,
  budgetUsd: number,
  now: Date = new Date(),
): Promise<MonthlyBudgetStatus> {
  const { start, end } = getUtcCalendarMonth(now);
  const spentUsd = await usageReader.getSpendUsdBetween(start, end);

  return {
    allowed: spentUsd < budgetUsd,
    budgetUsd,
    spentUsd,
    remainingUsd: Math.max(0, budgetUsd - spentUsd),
    periodStart: start,
    periodEnd: end,
  };
}

export async function assertMonthlyBudgetAvailable(
  usageReader: MonthlyUsageReader,
  budgetUsd: number,
  now: Date = new Date(),
): Promise<MonthlyBudgetStatus> {
  const status = await getMonthlyBudgetStatus(usageReader, budgetUsd, now);

  if (!status.allowed) {
    throw new AiBudgetExhaustedError(status.budgetUsd, status.spentUsd);
  }

  return status;
}
