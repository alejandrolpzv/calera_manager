import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ReportActions } from "@/components/reports/report-actions";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDefaultReportRange, getReportData } from "@/server/services/factory";

type ReportData = Awaited<ReturnType<typeof getReportData>>;
type PayrollLine = {
  id: string;
  employeeName: string;
  workDays?: number;
  dailySalary?: number;
  bonuses?: number;
  deductions?: number;
  amount: number;
  notes?: string | null;
};
type ReportExpense = ReportData["expenses"][number];
type ReportIncome = ReportData["income"][number];
type ReportProduction = ReportData["production"][number];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const defaults = getDefaultReportRange();
  const from = typeof params.from === "string" ? params.from : defaults.from;
  const to = typeof params.to === "string" ? params.to : defaults.to;
  const preset = typeof params.preset === "string" ? params.preset : "";
  const presetCopy =
    preset === "week-to-date"
      ? {
          eyebrow: "Reporte rapido",
          title: "Estado semanal hasta hoy",
          description:
            "Resumen operativo y financiero de la semana actual hasta este momento.",
        }
      : preset === "month-to-date"
        ? {
            eyebrow: "Reporte rapido",
            title: "Estado mensual hasta hoy",
            description:
              "Resumen operativo y financiero del mes actual hasta este momento.",
          }
        : {
            eyebrow: "Analisis",
            title: "Reportes y exportacion",
            description:
              "Filtra por rango de fechas, revisa el rendimiento financiero y productivo, y exporta reportes limpios en PDF o Excel.",
          };
  const report = await getReportData(from, to);
  const payrollSummary = Object.values(
    report.expenses.reduce<Record<string, { employeeName: string; amount: number; workDays: number }>>(
      (acc, expense) => {
        for (const line of expense.payrollLines || []) {
          const key = line.employeeName.trim().toLowerCase();
          if (!acc[key]) {
            acc[key] = { employeeName: line.employeeName, amount: 0, workDays: 0 };
          }
          acc[key].amount += line.amount;
          acc[key].workDays += line.workDays || 0;
        }
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.amount - a.amount);
  const receivables = report.income.filter((item) => (item.balanceDue || 0) > 0);

  return (
    <>
      <PageHeader
        eyebrow={presetCopy.eyebrow}
        title={presetCopy.title}
        description={presetCopy.description}
      />

      <Card className="p-5">
        {preset ? (
          <div className="mb-5 rounded-3xl bg-teal-50 p-4">
            <p className="text-sm font-bold text-teal-900">
              Rango generado automaticamente: {from} a {to}
            </p>
            <p className="mt-1 text-sm text-teal-700">
              Puedes revisar el estado actual aqui mismo o exportarlo en PDF/Excel.
            </p>
          </div>
        ) : null}
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="from">
              Desde
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="to">
              Hasta
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />
          </div>
          <Button type="submit" className="md:h-[50px]">
            Aplicar rango
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Gastos</p>
          <p className="mt-2 text-2xl font-extrabold">{formatCurrency(report.summary.totalExpenses)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Ingresos</p>
          <p className="mt-2 text-2xl font-extrabold">{formatCurrency(report.summary.totalIncome)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Utilidad</p>
          <p className="mt-2 text-2xl font-extrabold">{formatCurrency(report.summary.profit)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Produccion</p>
          <p className="mt-2 text-2xl font-extrabold">{formatNumber(report.summary.totalProduction)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Costo / unidad</p>
          <p className="mt-2 text-2xl font-extrabold">{formatCurrency(report.summary.costPerUnit)}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Exportar reporte</h3>
            <p className="text-sm text-slate-500">Genera PDF o Excel para revision administrativa.</p>
          </div>
          <ReportActions data={report} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5">
          <h3 className="text-lg font-bold">Gastos</h3>
          <div className="mt-4 space-y-3">
            {report.expenses.slice(0, 10).map((item: ReportExpense) => (
              <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                <p className="font-semibold">{item.description}</p>
                <p className="mt-1 text-sm text-slate-600">{item.category}</p>
                <p className="mt-2 text-sm font-semibold">{formatCurrency(item.amount)}</p>
                {item.payrollLines?.length ? (
                  <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Desglose de planilla
                    </p>
                    {item.payrollLines.map((line: PayrollLine) => (
                      <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700">{line.employeeName}</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-bold">Ingresos</h3>
          <div className="mt-4 space-y-3">
            {report.income.slice(0, 10).map((item: ReportIncome) => (
              <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                <p className="font-semibold">{item.clientName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.productName}
                  {item.referenceCode ? ` | Ref: ${item.referenceCode}` : ""}
                </p>
                <p className="mt-2 text-sm font-semibold">{formatCurrency(item.total)}</p>
                {Array.isArray(item.lines) && item.lines.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                    {item.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700">
                          {line.productName} | {formatNumber(line.quantity)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(line.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-bold">Produccion</h3>
          <div className="mt-4 space-y-3">
            {report.production.slice(0, 10).map((item: ReportProduction) => (
              <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                <p className="font-semibold">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.notes || "Sin notas"}</p>
                <p className="mt-2 text-sm font-semibold">{formatNumber(item.quantity)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-lg font-bold">Resumen de planilla</h3>
          <div className="mt-4 space-y-3">
            {payrollSummary.length ? (
              payrollSummary.map((item) => (
                <div key={item.employeeName} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 p-4">
                  <div>
                    <p className="font-semibold">{item.employeeName}</p>
                    <p className="text-sm text-slate-500">{formatNumber(item.workDays)} dias registrados</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.amount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No hubo planilla en este rango.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-bold">Cuentas por cobrar del rango</h3>
          <div className="mt-4 space-y-3">
            {receivables.length ? (
              receivables.map((item) => (
                <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.clientName}</p>
                      <p className="text-sm text-slate-500">
                        {item.invoiceNumber ? `Factura ${item.invoiceNumber}` : item.referenceCode || "Sin referencia"}
                      </p>
                    </div>
                    <p className="font-semibold text-amber-700">{formatCurrency(item.balanceDue || 0)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No hay saldos pendientes en este rango.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
