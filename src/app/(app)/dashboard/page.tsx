import { getDashboardData, getInventorySnapshot, getRecentActivity } from "@/server/services/factory";
import { requireAdmin } from "@/lib/auth";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ActivityCard } from "@/components/activity-card";
import { InventoryTable } from "@/components/inventory-table";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  await requireAdmin();
  const today = new Date();
  const todayParam = format(today, "yyyy-MM-dd");
  const weekStartParam = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStartParam = format(startOfMonth(today), "yyyy-MM-dd");
  const dashboard = await getDashboardData();
  const activity = await getRecentActivity();
  const inventory = await getInventorySnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Resumen administrativo"
        title="Panel de fabrica"
        description="Monitorea el rendimiento financiero semanal y mensual, la produccion y el inventario desde un solo centro de control optimizado para movil."
      />

      <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
              Reportes rapidos
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">
              Estado actual de la planta
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Abre un resumen listo para revisar y exportar, con gastos, ventas,
              cobros, produccion, planilla y saldos pendientes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[460px]">
            <Link
              href={`/reports?from=${weekStartParam}&to=${todayParam}&preset=week-to-date`}
              className="rounded-3xl bg-teal-700 px-5 py-4 text-white shadow-lg shadow-teal-900/15 transition hover:bg-teal-800"
            >
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-teal-100">
                Semana
              </span>
              <span className="mt-1 block text-lg font-extrabold">Hasta hoy</span>
              <span className="mt-1 block text-xs text-teal-100">
                {weekStartParam} a {todayParam}
              </span>
            </Link>
            <Link
              href={`/reports?from=${monthStartParam}&to=${todayParam}&preset=month-to-date`}
              className="rounded-3xl bg-slate-950 px-5 py-4 text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-900"
            >
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Mes
              </span>
              <span className="mt-1 block text-lg font-extrabold">Hasta hoy</span>
              <span className="mt-1 block text-xs text-slate-300">
                {monthStartParam} a {todayParam}
              </span>
            </Link>
          </div>
        </div>
      </Card>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Cobrado semanal"
          value={dashboard.weekly.totalIncome}
          trend="up"
          href="/dashboard/weekly-income"
        />
        <StatCard
          label="Gastos semanales"
          value={dashboard.weekly.totalExpenses}
          accent="amber"
          trend="down"
          href="/dashboard/weekly-expenses"
        />
        <StatCard
          label="Utilidad mensual de caja"
          value={dashboard.monthly.profit}
          accent="teal"
          href="/dashboard/monthly-profit"
        />
        <StatCard
          label="Costo mensual por unidad"
          value={dashboard.monthly.costPerUnit}
          accent="slate"
          href="/dashboard/monthly-cost-per-unit"
        />
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Cobrado mensual"
          value={dashboard.monthly.totalIncome}
          href="/dashboard/monthly-income"
        />
        <StatCard
          label="Gastos mensuales"
          value={dashboard.monthly.totalExpenses}
          accent="amber"
          href="/dashboard/monthly-expenses"
        />
        <StatCard
          label="Produccion total"
          value={dashboard.monthly.totalProduction}
          tone="number"
          accent="slate"
          href="/dashboard/monthly-production"
        />
        <StatCard
          label="Ventas facturadas"
          value={dashboard.monthly.totalSales}
          accent="teal"
          href="/dashboard/monthly-sales"
        />
      </section>

      <DashboardCharts
        expensesByCategory={dashboard.expensesByCategory}
        incomeVsExpenses={dashboard.incomeVsExpenses}
        productionOverTime={dashboard.productionOverTime}
      />

      <section className="grid min-w-0 gap-4 xl:grid-cols-3 xl:gap-6">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Top clientes</h3>
              <p className="text-sm text-slate-500">Quienes mas compran este periodo.</p>
            </div>
            <Link href="/clients" className="text-sm font-semibold text-teal-700">
              Ver clientes
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.operational.topClients.map((client) => (
              <div key={client.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{client.name}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(client.total)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Top productos</h3>
              <p className="text-sm text-slate-500">Lo mas vendido del periodo.</p>
            </div>
            <Link href="/income" className="text-sm font-semibold text-teal-700">
              Ver ventas
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.operational.topProducts.map((product, index) => (
              <div key={`${product.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{product.name}</span>
                <span className="font-semibold text-slate-900">{formatNumber(product.quantity)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Alertas operativas</h3>
              <p className="text-sm text-slate-500">Stock bajo y cobros pendientes.</p>
            </div>
            <Link href="/receivables" className="text-sm font-semibold text-teal-700">
              Ver cobros
            </Link>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Cuentas por cobrar
            </p>
            <p className="mt-2 text-lg font-extrabold text-amber-700">
              {formatCurrency(dashboard.operational.pendingReceivablesTotal)}
            </p>
            <p className="text-sm text-slate-600">
              {dashboard.operational.pendingReceivablesCount} facturas pendientes o parciales
            </p>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Stock bajo
            </p>
            <div className="mt-2 space-y-2">
              {dashboard.operational.lowStock.length ? (
                dashboard.operational.lowStock.map((item, index) => (
                  <div key={`${item.productName}-${item.unitType}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">{item.productName}</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(item.quantity)} {item.unitType}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No hay alertas de stock bajo.</p>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-3 xl:gap-6">
        <ActivityCard title="Gastos recientes" rows={activity.expenses} type="expense" />
        <ActivityCard title="Ventas recientes" rows={activity.incomes} type="income" />
        <ActivityCard title="Produccion reciente" rows={activity.productions} type="production" />
      </section>

      <InventoryTable inventory={inventory} />
    </>
  );
}
