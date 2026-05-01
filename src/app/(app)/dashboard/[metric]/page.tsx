import Link from "next/link";
import { notFound } from "next/navigation";
import { endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { getDashboardData, getHistoryData, getReceivables } from "@/server/services/factory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MetricConfig = {
  title: string;
  description: string;
  valueLabel: string;
  tone?: "currency" | "number";
  getValue: Awaited<ReturnType<typeof getDashboardData>> extends infer Dashboard
    ? (dashboard: Dashboard) => number
    : never;
  related: Array<{
    label: string;
    tone?: "currency" | "number";
    getValue: Awaited<ReturnType<typeof getDashboardData>> extends infer Dashboard
      ? (dashboard: Dashboard) => number
      : never;
  }>;
  quickLinks: Array<{
    label: string;
    href: string;
  }>;
  explanation: string[];
  detailType: "income" | "sales" | "expenses" | "profit" | "production" | "cost";
  period: "week" | "month";
};

const metricConfig: Record<string, MetricConfig> = {
  "weekly-income": {
    title: "Cobrado semanal",
    description: "Dinero efectivamente recibido en la semana actual.",
    valueLabel: "Total cobrado esta semana",
    getValue: (dashboard) => dashboard.weekly.totalIncome,
    related: [
      { label: "Gastos semanales", getValue: (dashboard) => dashboard.weekly.totalExpenses },
      { label: "Utilidad semanal de caja", getValue: (dashboard) => dashboard.weekly.profit },
      { label: "Produccion mensual", tone: "number", getValue: (dashboard) => dashboard.monthly.totalProduction },
    ],
    quickLinks: [
      { label: "Ver ventas", href: "/income" },
      { label: "Ver historial filtrado", href: "/history?type=income" },
      { label: "Abrir reportes", href: "/reports" },
    ],
    explanation: [
      "Esta tarjeta suma solamente el monto pagado de las ventas registradas durante la semana actual.",
      "Las facturas pendientes quedan en cuentas por cobrar y no inflan la caja.",
    ],
    detailType: "income",
    period: "week",
  },
  "weekly-expenses": {
    title: "Gastos semanales",
    description: "Resumen de lo gastado en la semana actual.",
    valueLabel: "Total de gastos de esta semana",
    getValue: (dashboard) => dashboard.weekly.totalExpenses,
    related: [
      { label: "Ingresos semanales", getValue: (dashboard) => dashboard.weekly.totalIncome },
      { label: "Utilidad semanal", getValue: (dashboard) => dashboard.weekly.profit },
      { label: "Costo mensual por unidad", getValue: (dashboard) => dashboard.monthly.costPerUnit },
    ],
    quickLinks: [
      { label: "Ver gastos", href: "/expenses" },
      { label: "Historial de gastos", href: "/history?type=expense" },
      { label: "Abrir reportes", href: "/reports" },
    ],
    explanation: [
      "Aqui se concentra todo el gasto de la semana: diesel, materia prima, planilla y demas categorias.",
      "Te ayuda a detectar rapido si un aumento de costos esta presionando la utilidad.",
    ],
    detailType: "expenses",
    period: "week",
  },
  "monthly-profit": {
    title: "Utilidad mensual de caja",
    description: "Dinero cobrado menos gastos del mes actual.",
    valueLabel: "Utilidad de caja acumulada del mes",
    getValue: (dashboard) => dashboard.monthly.profit,
    related: [
      { label: "Cobrado mensual", getValue: (dashboard) => dashboard.monthly.totalIncome },
      { label: "Ventas facturadas", getValue: (dashboard) => dashboard.monthly.totalSales },
      { label: "Gastos mensuales", getValue: (dashboard) => dashboard.monthly.totalExpenses },
    ],
    quickLinks: [
      { label: "Ir a reportes", href: "/reports" },
      { label: "Ver historial completo", href: "/history" },
      { label: "Ver panel principal", href: "/dashboard" },
    ],
    explanation: [
      "La utilidad mensual de caja es lo cobrado menos lo gastado dentro del mes en curso.",
      "Si tienes ventas pendientes de cobro, se ven como facturacion y cuentas por cobrar, no como caja disponible.",
    ],
    detailType: "profit",
    period: "month",
  },
  "monthly-cost-per-unit": {
    title: "Costo mensual por unidad",
    description: "Costo promedio por unidad producida en el mes actual.",
    valueLabel: "Costo promedio por unidad",
    getValue: (dashboard) => dashboard.monthly.costPerUnit,
    related: [
      { label: "Gastos mensuales", getValue: (dashboard) => dashboard.monthly.totalExpenses },
      { label: "Produccion mensual", tone: "number", getValue: (dashboard) => dashboard.monthly.totalProduction },
      { label: "Utilidad mensual", getValue: (dashboard) => dashboard.monthly.profit },
    ],
    quickLinks: [
      { label: "Ver produccion", href: "/production" },
      { label: "Ver gastos", href: "/expenses" },
      { label: "Abrir reportes", href: "/reports" },
    ],
    explanation: [
      "Se calcula como gastos del mes divididos entre la produccion total del mismo periodo.",
      "Si este numero sube, normalmente hay que revisar costos o caidas de produccion.",
    ],
    detailType: "cost",
    period: "month",
  },
  "monthly-income": {
    title: "Cobrado mensual",
    description: "Dinero efectivamente recibido durante el mes actual.",
    valueLabel: "Cobros acumulados del mes",
    getValue: (dashboard) => dashboard.monthly.totalIncome,
    related: [
      { label: "Ventas facturadas", getValue: (dashboard) => dashboard.monthly.totalSales },
      { label: "Utilidad mensual de caja", getValue: (dashboard) => dashboard.monthly.profit },
      { label: "Gastos mensuales", getValue: (dashboard) => dashboard.monthly.totalExpenses },
    ],
    quickLinks: [
      { label: "Registrar venta", href: "/income" },
      { label: "Ver clientes", href: "/clients" },
      { label: "Historial de ventas", href: "/history?type=income" },
    ],
    explanation: [
      "Muestra cuanto dinero ya entro realmente por pagos de clientes dentro del mes actual.",
      "Las ventas a credito se mantienen separadas como facturacion y cuentas por cobrar.",
    ],
    detailType: "income",
    period: "month",
  },
  "monthly-sales": {
    title: "Ventas facturadas",
    description: "Total vendido/facturado durante el mes actual, incluyendo credito.",
    valueLabel: "Facturacion acumulada del mes",
    getValue: (dashboard) => dashboard.monthly.totalSales,
    related: [
      { label: "Cobrado mensual", getValue: (dashboard) => dashboard.monthly.totalIncome },
      { label: "Cuentas por cobrar", getValue: (dashboard) => dashboard.operational.pendingReceivablesTotal },
      { label: "Gastos mensuales", getValue: (dashboard) => dashboard.monthly.totalExpenses },
    ],
    quickLinks: [
      { label: "Ver ventas", href: "/income" },
      { label: "Ver cobros pendientes", href: "/receivables" },
      { label: "Historial de ventas", href: "/history?type=income" },
    ],
    explanation: [
      "Esta cifra suma el total de las facturas del mes, sin importar si ya se cobraron o siguen pendientes.",
      "Sirve para medir ventas comerciales; para caja real usa Cobrado mensual.",
    ],
    detailType: "sales",
    period: "month",
  },
  "monthly-expenses": {
    title: "Gastos mensuales",
    description: "Total gastado durante el mes actual.",
    valueLabel: "Gasto acumulado del mes",
    getValue: (dashboard) => dashboard.monthly.totalExpenses,
    related: [
      { label: "Cobrado mensual", getValue: (dashboard) => dashboard.monthly.totalIncome },
      { label: "Utilidad mensual de caja", getValue: (dashboard) => dashboard.monthly.profit },
      { label: "Costo mensual por unidad", getValue: (dashboard) => dashboard.monthly.costPerUnit },
    ],
    quickLinks: [
      { label: "Registrar gasto", href: "/expenses" },
      { label: "Historial de gastos", href: "/history?type=expense" },
      { label: "Ver reportes", href: "/reports" },
    ],
    explanation: [
      "Agrupa todos los egresos del mes y sirve como base para calcular utilidad y costo unitario.",
      "Conviene revisarlo junto al grafico de gastos por categoria para detectar donde se concentra el dinero.",
    ],
    detailType: "expenses",
    period: "month",
  },
  "monthly-production": {
    title: "Produccion total",
    description: "Produccion registrada durante el mes actual.",
    valueLabel: "Produccion del mes",
    tone: "number",
    getValue: (dashboard) => dashboard.monthly.totalProduction,
    related: [
      { label: "Costo mensual por unidad", getValue: (dashboard) => dashboard.monthly.costPerUnit },
      { label: "Cobrado mensual", getValue: (dashboard) => dashboard.monthly.totalIncome },
      { label: "Utilidad mensual de caja", getValue: (dashboard) => dashboard.monthly.profit },
    ],
    quickLinks: [
      { label: "Ver produccion", href: "/production" },
      { label: "Ver inventario", href: "/inventory" },
      { label: "Historial de produccion", href: "/history?type=production" },
    ],
    explanation: [
      "Esta cifra suma toda la produccion cargada en el mes actual.",
      "Es clave porque impacta el costo por unidad y tambien la disponibilidad de inventario para venta.",
    ],
    detailType: "production",
    period: "month",
  },
  "weekly-profit": {
    title: "Utilidad semanal de caja",
    description: "Dinero cobrado menos gastos de la semana actual.",
    valueLabel: "Utilidad de caja de esta semana",
    getValue: (dashboard) => dashboard.weekly.profit,
    related: [
      { label: "Cobrado semanal", getValue: (dashboard) => dashboard.weekly.totalIncome },
      { label: "Gastos semanales", getValue: (dashboard) => dashboard.weekly.totalExpenses },
      { label: "Utilidad mensual de caja", getValue: (dashboard) => dashboard.monthly.profit },
    ],
    quickLinks: [
      { label: "Ir a reportes", href: "/reports" },
      { label: "Ver historial", href: "/history" },
      { label: "Volver al panel", href: "/dashboard" },
    ],
    explanation: [
      "Es la diferencia entre cobros recibidos y gastos de la semana actual.",
      "Sirve para reaccionar rapido sin confundir facturas pendientes con dinero disponible.",
    ],
    detailType: "profit",
    period: "week",
  },
};

function getRange(period: "week" | "month") {
  const now = new Date();
  const fromDate = period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  const toDate = period === "week" ? now : endOfMonth(now);

  return {
    from: format(fromDate, "yyyy-MM-dd"),
    to: format(toDate, "yyyy-MM-dd"),
    label: period === "week" ? "semana actual" : "mes actual",
  };
}

function EmptyDetail({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
      No hay registros para mostrar en {label}.
    </div>
  );
}

function IncomeDetail({
  rows,
  mode,
}: {
  rows: Awaited<ReturnType<typeof getHistoryData>>["income"];
  mode: "income" | "sales";
}) {
  if (!rows.length) {
    return <EmptyDetail label="este periodo" />;
  }

  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-bold text-slate-950">{item.clientName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(item.date)}
                {item.invoiceNumber ? ` | Factura ${item.invoiceNumber}` : ""}
              </p>
              <p className="mt-2 text-sm text-slate-600">{item.productName}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-slate-500">{mode === "income" ? "Cobrado" : "Facturado"}</p>
              <p className="text-xl font-extrabold text-slate-950">
                {formatCurrency(mode === "income" ? item.amountPaid : item.total)}
              </p>
              {item.balanceDue > 0 ? (
                <p className="text-sm font-semibold text-amber-700">
                  Pendiente {formatCurrency(item.balanceDue)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpenseDetail({ rows }: { rows: Awaited<ReturnType<typeof getHistoryData>>["expenses"] }) {
  if (!rows.length) {
    return <EmptyDetail label="este periodo" />;
  }

  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <div key={item.id} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-bold text-slate-950">{item.description}</p>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(item.date)} | {item.category}
            </p>
          </div>
          <p className="text-xl font-extrabold text-slate-950">{formatCurrency(item.amount)}</p>
        </div>
      ))}
    </div>
  );
}

function ProductionDetail({ rows }: { rows: Awaited<ReturnType<typeof getHistoryData>>["production"] }) {
  if (!rows.length) {
    return <EmptyDetail label="este periodo" />;
  }

  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <div key={item.id} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-bold text-slate-950">{item.productName}</p>
            <p className="mt-1 text-sm text-slate-500">{formatDate(item.date)}</p>
            {item.notes ? <p className="mt-2 text-sm text-slate-600">{item.notes}</p> : null}
          </div>
          <p className="text-xl font-extrabold text-slate-950">{formatNumber(item.quantity)}</p>
        </div>
      ))}
    </div>
  );
}

function ReceivablesDetail({ rows }: { rows: Awaited<ReturnType<typeof getReceivables>> }) {
  if (!rows.length) {
    return <EmptyDetail label="cuentas por cobrar" />;
  }

  return (
    <div className="space-y-3">
      {rows.slice(0, 8).map((item) => (
        <div key={item.id} className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-bold text-slate-950">{item.clientName}</p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(item.date)}
              {item.invoiceNumber ? ` | Factura ${item.invoiceNumber}` : ""}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-amber-800">Saldo pendiente</p>
            <p className="text-xl font-extrabold text-amber-800">{formatCurrency(item.balanceDue)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardMetricPage({
  params,
}: {
  params: Promise<{ metric: string }>;
}) {
  await requireAdmin();
  const { metric } = await params;
  const config = metricConfig[metric];

  if (!config) {
    notFound();
  }

  const dashboard = await getDashboardData();
  const range = getRange(config.period);
  const [history, receivables] = await Promise.all([
    getHistoryData({ from: range.from, to: range.to, type: "all" }),
    getReceivables(),
  ]);
  const tone = config.tone || "currency";
  const formatValue = (value: number, kind: "currency" | "number" = "currency") =>
    kind === "currency" ? formatCurrency(value) : formatNumber(value);

  return (
    <>
      <PageHeader
        eyebrow="Detalle del panel"
        title={config.title}
        description={config.description}
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {config.valueLabel}
          </p>
          <p className="mt-3 text-4xl font-extrabold text-slate-950">
            {formatValue(config.getValue(dashboard), tone)}
          </p>

          <div className="mt-6 space-y-3 text-sm text-slate-600">
            {config.explanation.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-950">Acciones relacionadas</h3>
          <div className="mt-4 space-y-3">
            {config.quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {config.related.map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-950">
              {formatValue(item.getValue(dashboard), item.tone || "currency")}
            </p>
          </Card>
        ))}
      </section>

      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-950">Detalle del calculo</h3>
            <p className="text-sm text-slate-500">
              Registros incluidos en la {range.label}: {range.from} a {range.to}.
            </p>
          </div>
          <Link href="/history" className="text-sm font-semibold text-teal-700">
            Ver historial completo
          </Link>
        </div>

        {config.detailType === "income" ? (
          <IncomeDetail rows={history.income} mode="income" />
        ) : null}
        {config.detailType === "sales" ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <IncomeDetail rows={history.income} mode="sales" />
            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Pendiente de cobro
              </h4>
              <ReceivablesDetail rows={receivables} />
            </div>
          </div>
        ) : null}
        {config.detailType === "expenses" ? <ExpenseDetail rows={history.expenses} /> : null}
        {config.detailType === "production" ? <ProductionDetail rows={history.production} /> : null}
        {config.detailType === "profit" ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-teal-700">
                Cobros del periodo
              </h4>
              <IncomeDetail rows={history.income} mode="income" />
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Gastos del periodo
              </h4>
              <ExpenseDetail rows={history.expenses} />
            </div>
          </div>
        ) : null}
        {config.detailType === "cost" ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
                Gastos usados
              </h4>
              <ExpenseDetail rows={history.expenses} />
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                Produccion usada
              </h4>
              <ProductionDetail rows={history.production} />
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
