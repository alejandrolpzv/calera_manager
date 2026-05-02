import { format, startOfMonth, startOfWeek } from "date-fns";
import { AlertTriangle, ArrowRight, Banknote, Factory, Gauge, PackageCheck } from "lucide-react";
import Link from "next/link";

import { getDashboardData, getInventorySnapshot, getRecentActivity } from "@/server/services/factory";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ActivityCard } from "@/components/activity-card";
import { InventoryTable } from "@/components/inventory-table";
import { Card } from "@/components/ui/card";
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
  const plantScore =
    dashboard.operational.pendingReceivablesTotal > 0 || dashboard.operational.lowStock.length > 0
      ? "Atencion"
      : dashboard.monthly.profit >= 0
        ? "Estable"
        : "Critico";
  const scoreTone =
    plantScore === "Estable"
      ? "bg-teal-400 text-slate-950"
      : plantScore === "Atencion"
        ? "bg-amber-300 text-slate-950"
        : "bg-red-500 text-white";

  return (
    <>
      <PageHeader
        eyebrow="Resumen administrativo"
        title="Panel de fabrica"
        description="Monitorea el rendimiento financiero semanal y mensual, la produccion y el inventario desde un solo centro de control optimizado para movil."
      />

      <section className="plant-hero overflow-hidden rounded-[30px] p-4 text-white sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
          <div className="flex min-w-0 flex-col justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${scoreTone}`}>
                  {plantScore}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                  {todayParam}
                </span>
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                Estado actual de la planta
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                Lectura ejecutiva de caja, produccion, cobros e inventario para decidir rapido desde el telefono.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PlantPulse
                icon={Banknote}
                label="Caja mensual"
                value={formatCurrency(dashboard.monthly.profit)}
                tone={dashboard.monthly.profit >= 0 ? "good" : "bad"}
              />
              <PlantPulse
                icon={Factory}
                label="Produccion"
                value={formatNumber(dashboard.monthly.totalProduction)}
                tone={dashboard.monthly.totalProduction > 0 ? "good" : "warn"}
              />
              <PlantPulse
                icon={Gauge}
                label="Costo/unidad"
                value={formatCurrency(dashboard.monthly.costPerUnit)}
                tone="neutral"
              />
              <PlantPulse
                icon={AlertTriangle}
                label="Pendiente"
                value={formatCurrency(dashboard.operational.pendingReceivablesTotal)}
                tone={dashboard.operational.pendingReceivablesTotal > 0 ? "warn" : "good"}
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-[26px] bg-white/10 p-3 backdrop-blur sm:grid-cols-2 xl:grid-cols-1">
            <Link
              href="/quick"
              className="group rounded-[24px] bg-white px-4 py-4 text-slate-950 shadow-lg shadow-black/10 transition active:scale-[0.99]"
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-xs font-black uppercase tracking-[0.18em] text-teal-700">
                    Planta
                  </span>
                  <span className="mt-1 block text-lg font-black">Registro rapido</span>
                  <span className="mt-1 block text-sm text-slate-500">Produccion, gasto o venta</span>
                </span>
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href={`/reports?from=${weekStartParam}&to=${todayParam}&preset=week-to-date`}
              className="rounded-[24px] bg-teal-500 px-4 py-4 text-slate-950 shadow-lg shadow-black/10 transition active:scale-[0.99]"
            >
              <span className="block text-xs font-black uppercase tracking-[0.18em] text-teal-950/70">
                Semana
              </span>
              <span className="mt-1 block text-lg font-black">Estado hasta hoy</span>
              <span className="mt-1 block text-xs font-semibold text-teal-950/70">
                {weekStartParam} a {todayParam}
              </span>
            </Link>
            <Link
              href={`/reports?from=${monthStartParam}&to=${todayParam}&preset=month-to-date`}
              className="rounded-[24px] bg-white/10 px-4 py-4 text-white ring-1 ring-white/15 transition active:scale-[0.99]"
            >
              <span className="block text-xs font-black uppercase tracking-[0.18em] text-white/50">
                Mes
              </span>
              <span className="mt-1 block text-lg font-black">Resumen mensual</span>
              <span className="mt-1 block text-xs font-semibold text-white/50">
                {monthStartParam} a {todayParam}
              </span>
            </Link>
          </div>
        </div>
      </section>

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

function PlantPulse({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof PackageCheck;
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass = {
    good: "bg-teal-400/15 text-teal-100 ring-teal-300/20",
    warn: "bg-amber-300/15 text-amber-100 ring-amber-300/20",
    bad: "bg-red-400/15 text-red-100 ring-red-300/20",
    neutral: "bg-white/10 text-white ring-white/15",
  }[tone];

  return (
    <div className={`rounded-[22px] p-3 ring-1 ${toneClass}`}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-1 break-words text-lg font-black">{value}</p>
    </div>
  );
}
