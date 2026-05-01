import { revalidatePath } from "next/cache";

const incomeAffectedPaths = [
  "/dashboard",
  "/dashboard/monthly-income",
  "/dashboard/monthly-sales",
  "/dashboard/weekly-income",
  "/dashboard/monthly-profit",
  "/dashboard/weekly-profit",
  "/dashboard/monthly-cost-per-unit",
  "/income",
  "/inventory",
  "/clients",
  "/receivables",
  "/history",
  "/reports",
];

export function revalidateIncomeAffectedPaths() {
  for (const path of incomeAffectedPaths) {
    revalidatePath(path);
  }
}
