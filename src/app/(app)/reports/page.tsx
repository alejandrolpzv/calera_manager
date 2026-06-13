import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiPlantInsights } from "@/components/reports/ai-plant-insights";
import { PageHeader } from "@/components/page-header";
import { ReportActions } from "@/components/reports/report-actions";
import { requireAdmin } from "@/lib/auth";
import { expenseCategoryOptions } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDefaultReportRange, getProducts, getReportData } from "@/server/services/factory";

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

const reportTypeOptions = [
  { value: "all", label: "Global" },
  { value: "expenses", label: "Solo gastos" },
  { value: "income", label: "Solo ventas" },
  { value: "production", label: "Solo produccion" },
  { value: "receivables", label: "Solo cobros pendientes" },
  { value: "payroll", label: "Solo planilla" },
  { value: "raw-material", label: "Solo materia prima / piedra" },
] as const;

function groupTotals<T>(
  records: T[],
  getKey: (record: T) => string,
  getValue: (record: T) => number,
) {
  return Object.values(
    records.reduce<Record<string, { name: string; value: number }>>((acc, record) => {
      const name = getKey(record);
      const key = name.trim().toLowerCase() || "sin-clasificar";

      if (!acc[key]) {
        acc[key] = { name, value: 0 };
      }

      acc[key].value += getValue(record);
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);
}

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
  const reportType = typeof params.reportType === "string" ? params.reportType : "all";
  const expenseCategory = typeof params.expenseCategory === "string" ? params.expenseCategory : "";
  const productId = typeof params.productId === "string" ? params.productId : "";
  const paymentStatus = typeof params.paymentStatus === "string" ? params.paymentStatus : "";
  const q = typeof params.q === "string" ? params.q : "";
  const filters = { reportType, expenseCategory, productId, paymentStatus, q };
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
  const [report, products] = await Promise.all([
    getReportData(from, to, filters),
    getProducts(),
  ]);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "reportType") {
      return value && value !== "all";
    }

    return Boolean(value);
  }).length;
  const currentReportType = reportTypeOptions.find((option) => option.value === reportType) || reportTypeOptions[0];
  const showExpenses = ["all", "expenses", "payroll", "raw-material"].includes(reportType);
  const showIncome = ["all", "income", "receivables"].includes(reportType);
  const showProduction = ["all", "production", "raw-material"].includes(reportType);
  const showRawMaterial = ["all", "raw-material"].includes(reportType);
  const showPayroll = ["all", "expenses", "payroll"].includes(reportType);
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
  const totalSales = report.summary.totalSales;
  const totalCollected = report.summary.totalIncome;
  const totalEstimatedProductionCost = report.summary.totalEstimatedProductionCost || 0;
  const estimatedGrossMargin =
    report.summary.estimatedGrossMargin ?? totalSales - totalEstimatedProductionCost;
  const expectedProductionFromStone = report.summary.expectedProductionFromStone || 0;
  const productionVarianceFromStone = report.summary.productionVarianceFromStone || 0;
  const pendingTotal = report.income.reduce((sum, item) => sum + (item.balanceDue || 0), 0);
  const collectionRate = totalSales > 0 ? (totalCollected / totalSales) * 100 : 0;
  const expensesByCategory = groupTotals(
    report.expenses,
    (item) => item.category,
    (item) => item.amount,
  );
  const productionByProduct = groupTotals(
    report.production,
    (item) => item.productName,
    (item) => item.quantity,
  );
  const lowStockItems = report.inventory.filter((item) => item.quantity <= 10);
  const executiveAlerts = [
    pendingTotal > 0
      ? `${formatCurrency(pendingTotal)} pendiente de cobro en ${receivables.length} factura${receivables.length === 1 ? "" : "s"}.`
      : "",
    report.summary.profit < 0
      ? `La utilidad de caja esta negativa por ${formatCurrency(Math.abs(report.summary.profit))}.`
      : "",
    report.summary.totalProduction <= 0
      ? "No hay produccion registrada en este rango."
      : "",
    expectedProductionFromStone > 0 && productionVarianceFromStone < 0
      ? `La produccion registrada esta ${formatNumber(Math.abs(productionVarianceFromStone))} sacos debajo de lo esperado por piedra.`
      : "",
    lowStockItems.length
      ? `${lowStockItems.length} producto${lowStockItems.length === 1 ? "" : "s"} con stock bajo.`
      : "",
    totalSales > 0 && collectionRate < 50
      ? `Solo se ha cobrado ${formatNumber(collectionRate)}% de lo facturado.`
      : "",
  ].filter(Boolean);

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
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] xl:items-end">
          {preset ? <input type="hidden" name="preset" value={preset} /> : null}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="reportType">
              Tipo de reporte
            </label>
            <select
              id="reportType"
              name="reportType"
              defaultValue={reportType}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {reportTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="expenseCategory">
              Tipo de gasto
            </label>
            <select
              id="expenseCategory"
              name="expenseCategory"
              defaultValue={expenseCategory}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              {expenseCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="productId">
              Producto
            </label>
            <select
              id="productId"
              name="productId"
              defaultValue={productId}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="paymentStatus">
              Estado de cobro
            </label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              <option value="PAID">Pagado</option>
              <option value="PARTIAL">Parcial</option>
              <option value="PENDING">Pendiente</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="q">
              Buscar
            </label>
            <input
              id="q"
              name="q"
              placeholder="Cliente, factura, nota..."
              defaultValue={q}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />
          </div>
          <Button type="submit" className="md:h-[50px]">
            Aplicar filtros
          </Button>
        </form>
        {activeFilterCount ? (
          <div className="mt-4 flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"} activo{activeFilterCount === 1 ? "" : "s"}.
              Reporte actual: {currentReportType.label}. Los totales se recalculan con lo visible.
            </p>
            <a
              href={`/reports?from=${from}&to=${to}${preset ? `&preset=${preset}` : ""}`}
              className="text-sm font-bold text-teal-700"
            >
              Limpiar filtros
            </a>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden p-4 sm:p-5">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
              Reporte ejecutivo
            </p>
            <h3 className="mt-2 text-2xl font-extrabold text-slate-950">
              Estado de la planta
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Lectura rapida para decidir: caja cobrada, ventas facturadas, pendientes,
              gastos, produccion, costo por unidad y alertas operativas del rango.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Facturado</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(totalSales)}</p>
              </div>
              <div className="rounded-3xl bg-teal-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Cobrado</p>
                <p className="mt-2 text-2xl font-black text-teal-900">{formatCurrency(totalCollected)}</p>
              </div>
              <div className="rounded-3xl bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Pendiente</p>
                <p className="mt-2 text-2xl font-black text-amber-900">{formatCurrency(pendingTotal)}</p>
              </div>
              <div className="rounded-3xl bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Gastos</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(report.summary.totalExpenses)}</p>
              </div>
              <div className="rounded-3xl bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Utilidad caja</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(report.summary.profit)}</p>
              </div>
              <div className="rounded-3xl bg-white/80 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Costo / unidad</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(report.summary.costPerUnit)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-slate-950 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Alertas
            </p>
            <div className="mt-4 space-y-3">
              {executiveAlerts.length ? (
                executiveAlerts.map((alert) => (
                  <div key={alert} className="rounded-2xl bg-white/10 p-3 text-sm leading-5">
                    {alert}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-teal-500/20 p-3 text-sm leading-5 text-teal-50">
                  Sin alertas criticas en este rango.
                </div>
              )}
            </div>
            <div className="mt-4 rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cobranza</p>
              <p className="mt-2 text-xl font-black">{formatNumber(collectionRate)}%</p>
              <p className="text-xs text-slate-300">de ventas facturadas cobradas</p>
            </div>
          </div>
        </div>
      </Card>

      <AiPlantInsights from={from} to={to} filters={filters} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {showExpenses ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">Gastos</p>
            <p className="mt-2 text-2xl font-extrabold">{formatCurrency(report.summary.totalExpenses)}</p>
          </Card>
        ) : null}
        {showIncome ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">Cobrado</p>
            <p className="mt-2 text-2xl font-extrabold">{formatCurrency(totalCollected)}</p>
          </Card>
        ) : null}
        {showExpenses || showIncome ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">Utilidad</p>
            <p className="mt-2 text-2xl font-extrabold">{formatCurrency(report.summary.profit)}</p>
          </Card>
        ) : null}
        {showProduction ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">Produccion</p>
            <p className="mt-2 text-2xl font-extrabold">{formatNumber(report.summary.totalProduction)}</p>
          </Card>
        ) : null}
        {showProduction || showExpenses ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">Costo / unidad</p>
            <p className="mt-2 text-2xl font-extrabold">{formatCurrency(report.summary.costPerUnit)}</p>
          </Card>
        ) : null}
      </div>

      {showIncome ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">Costo de produccion vendido</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-700">
              {formatCurrency(totalEstimatedProductionCost)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Calculado desde el costo guardado en cada linea de venta.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">Margen bruto estimado</p>
            <p className="mt-2 text-2xl font-extrabold text-teal-700">
              {formatCurrency(estimatedGrossMargin)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Ventas facturadas menos costo estimado de producto vendido.
            </p>
          </Card>
        </div>
      ) : null}

      {showRawMaterial ? (
        <Card className="overflow-hidden p-5">
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
              Materia prima
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-950">
              Piedra vs produccion esperada
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Calculado con viajes de piedra registrados en gastos de materia prima. Asume sacos de 100 lb y sirve como pauta operativa, no como auditoria exacta.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Viajes</p>
              <p className="mt-2 text-2xl font-black text-amber-950">
                {formatNumber(report.summary.rawMaterialTrips || 0)}
              </p>
            </div>
            <div className="rounded-3xl bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Libras</p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatNumber(report.summary.rawMaterialPounds || 0)}
              </p>
            </div>
            <div className="rounded-3xl bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Esperado</p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatNumber(expectedProductionFromStone)}
              </p>
            </div>
            <div className={`rounded-3xl p-4 ${productionVarianceFromStone >= 0 ? "bg-teal-50" : "bg-rose-50"}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${productionVarianceFromStone >= 0 ? "text-teal-700" : "text-rose-700"}`}>
                Diferencia
              </p>
              <p className={`mt-2 text-2xl font-black ${productionVarianceFromStone >= 0 ? "text-teal-900" : "text-rose-700"}`}>
                {formatNumber(productionVarianceFromStone)}
              </p>
            </div>
          </div>
        </div>
      </Card>
      ) : null}

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
        {showExpenses ? (
          <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Gastos</h3>
              <p className="mt-1 text-sm text-slate-500">
                Desglose completo: {report.expenses.length} registro{report.expenses.length === 1 ? "" : "s"}.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              Todos
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {report.expenses.length ? report.expenses.map((item: ReportExpense) => (
              <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.description}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.category} | {item.createdBy}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-950">{formatCurrency(item.amount)}</p>
                </div>
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
                {item.rawMaterialLines?.length ? (
                  <div className="mt-3 space-y-2 rounded-2xl bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Desglose de materia prima
                    </p>
                    {item.rawMaterialLines.map((line) => (
                      <div key={line.id} className="grid gap-1 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                        <span className="text-slate-700">
                          {line.materialName} | {formatNumber(line.trips)} viajes x {formatNumber(line.poundsPerTrip)} lb
                        </span>
                        <span className="font-semibold text-amber-900">
                          {formatNumber(line.expectedProductionUnits)} sacos esperados
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No hay gastos en este rango.
              </p>
            )}
          </div>
          </Card>
        ) : null}

        {showIncome ? (
          <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Ingresos</h3>
              <p className="mt-1 text-sm text-slate-500">
                Desglose completo: {report.income.length} venta{report.income.length === 1 ? "" : "s"}.
              </p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
              Todos
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {report.income.length ? report.income.map((item: ReportIncome) => (
              <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                <p className="font-semibold">{item.clientName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.productName}
                  {item.referenceCode ? ` | Ref: ${item.referenceCode}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
                  <span>{formatCurrency(item.total)}</span>
                  <span className="text-teal-700">
                    Margen: {formatCurrency(item.grossMargin || 0)}
                  </span>
                </div>
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
            )) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No hay ingresos en este rango.
              </p>
            )}
          </div>
          </Card>
        ) : null}

        {showProduction ? (
          <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Produccion</h3>
              <p className="mt-1 text-sm text-slate-500">
                Desglose completo: {report.production.length} registro{report.production.length === 1 ? "" : "s"}.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Todos
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {report.production.length ? report.production.map((item: ReportProduction) => (
              <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                <p className="font-semibold">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.notes || "Sin notas"}</p>
                <p className="mt-2 text-sm font-semibold">{formatNumber(item.quantity)}</p>
              </div>
            )) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No hay produccion en este rango.
              </p>
            )}
          </div>
          </Card>
        ) : null}
      </div>

      {(showExpenses || showProduction) ? (
        <div className="grid gap-6 xl:grid-cols-2">
        {showExpenses ? (
          <Card className="p-5">
          <h3 className="text-lg font-bold">Gastos por categoria</h3>
          <div className="mt-4 space-y-3">
            {expensesByCategory.length ? (
              expensesByCategory.map((item) => (
                <div key={item.name} className="rounded-2xl bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="font-bold text-slate-950">{formatCurrency(item.value)}</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-amber-500"
                      style={{
                        width: `${Math.min(100, report.summary.totalExpenses ? (item.value / report.summary.totalExpenses) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No hay gastos en este rango.</p>
            )}
          </div>
          </Card>
        ) : null}

        {showProduction ? (
          <Card className="p-5">
          <h3 className="text-lg font-bold">Produccion por producto</h3>
          <div className="mt-4 space-y-3">
            {productionByProduct.length ? (
              productionByProduct.map((item) => (
                <div key={item.name} className="rounded-2xl bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="font-bold text-slate-950">{formatNumber(item.value)}</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-teal-600"
                      style={{
                        width: `${Math.min(100, report.summary.totalProduction ? (item.value / report.summary.totalProduction) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No hay produccion en este rango.</p>
            )}
          </div>
          </Card>
        ) : null}
      </div>
      ) : null}

      {(showPayroll || showIncome) ? (
        <div className="grid gap-6 xl:grid-cols-2">
        {showPayroll ? (
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
        ) : null}

        {showIncome ? (
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
        ) : null}
      </div>
      ) : null}
    </>
  );
}
