import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { RecordRowActions } from "@/components/record-row-actions";
import { requireAdmin } from "@/lib/auth";
import { expenseCategoryOptions } from "@/lib/constants";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { getDefaultReportRange, getHistoryData, getProducts } from "@/server/services/factory";

type ProductListItem = Awaited<ReturnType<typeof getProducts>>[number];

type PayrollLine = {
  id: string;
  employeeName: string;
  amount: number;
  notes?: string | null;
};

type ExpenseRow = {
  id: string;
  date: Date;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  payrollLines: PayrollLine[];
};

type IncomeRow = {
  id: string;
  date: Date;
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  clientName: string;
  referenceCode?: string | null;
  sourceApp?: string | null;
  lines: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
  }>;
  createdBy: string;
};

type ProductionRow = {
  id: string;
  date: Date;
  productId: string;
  productName: string;
  quantity: number;
  notes?: string | null;
  createdBy: string;
};

function ExpenseSection({ rows }: { rows: ExpenseRow[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Historial de gastos</h3>
          <p className="text-sm text-slate-500">{rows.length} registros filtrados</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No hay gastos para este filtro.</p>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/80 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.description}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(item.date)} | {item.category} | Creado por {item.createdBy}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
              </div>

              {item.payrollLines.length ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Desglose de planilla
                  </p>
                  <div className="mt-2 space-y-2">
                    {item.payrollLines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700">{line.employeeName}</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <RecordRowActions
                editId={item.id}
                deleteEndpoint={`/api/expenses/${item.id}`}
                editBasePath="/expenses"
              />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function IncomeSection({ rows }: { rows: IncomeRow[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-950">Historial de ventas</h3>
        <p className="text-sm text-slate-500">{rows.length} registros filtrados</p>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No hay ventas para este filtro.</p>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/80 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.clientName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(item.date)} | {item.productName} | {formatNumber(item.quantity)} unidades
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Creado por {item.createdBy}
                    {item.referenceCode ? ` | Ref: ${item.referenceCode}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(item.pricePerUnit)} por unidad
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Lineas de venta
                </p>
                <div className="mt-2 space-y-2">
                  {item.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-700">
                        {line.productName} | {formatNumber(line.quantity)} x {formatCurrency(line.pricePerUnit)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(line.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <RecordRowActions
                editId={item.id}
                deleteEndpoint={`/api/income/${item.id}`}
                editBasePath="/income"
              />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function ProductionSection({ rows }: { rows: ProductionRow[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-950">Historial de producción</h3>
        <p className="text-sm text-slate-500">{rows.length} registros filtrados</p>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No hay producción para este filtro.</p>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/80 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.productName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(item.date)} | {formatNumber(item.quantity)} unidades
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Creado por {item.createdBy}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatNumber(item.quantity)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.notes || "Sin notas"}</p>

              <RecordRowActions
                editId={item.id}
                deleteEndpoint={`/api/production/${item.id}`}
                editBasePath="/production"
              />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const defaults = getDefaultReportRange();
  const filters = {
    from: typeof params.from === "string" ? params.from : defaults.from,
    to: typeof params.to === "string" ? params.to : defaults.to,
    type: typeof params.type === "string" ? params.type : "all",
    expenseCategory: typeof params.expenseCategory === "string" ? params.expenseCategory : "",
    productId: typeof params.productId === "string" ? params.productId : "",
    q: typeof params.q === "string" ? params.q : "",
  };

  const [history, products] = await Promise.all([
    getHistoryData(filters),
    getProducts(),
  ]);

  const showExpenses = filters.type === "all" || filters.type === "expense";
  const showIncome = filters.type === "all" || filters.type === "income";
  const showProduction = filters.type === "all" || filters.type === "production";

  return (
    <>
      <PageHeader
        eyebrow="Control administrativo"
        title="Historial con filtros"
        description="Revisa movimientos históricos de gastos, ventas y producción con filtros por fecha, tipo, producto, categoría y texto."
      />

      <Card className="p-5">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="from">
              Desde
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={filters.from}
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
              defaultValue={filters.to}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="type">
              Tipo
            </label>
            <select
              id="type"
              name="type"
              defaultValue={filters.type}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="all">Todos</option>
              <option value="expense">Gastos</option>
              <option value="income">Ventas</option>
              <option value="production">Producción</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="expenseCategory">
              Categoría gasto
            </label>
            <select
              id="expenseCategory"
              name="expenseCategory"
              defaultValue={filters.expenseCategory}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="">Todas</option>
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
              defaultValue={filters.productId}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              {products.map((product: ProductListItem) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="q">
              Buscar
            </label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={filters.q}
              placeholder="Cliente, nota, empleado..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />
          </div>
          <div className="md:col-span-2 xl:col-span-6 flex flex-col gap-3 sm:flex-row">
            <Button type="submit">Aplicar filtros</Button>
            <Link
              href="/history"
              className="inline-flex items-center justify-center rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-white"
            >
              Limpiar filtros
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Gastos</p>
          <p className="mt-2 text-2xl font-extrabold">{history.summary.expenseCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Ventas</p>
          <p className="mt-2 text-2xl font-extrabold">{history.summary.incomeCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Producción</p>
          <p className="mt-2 text-2xl font-extrabold">{history.summary.productionCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Total gastos</p>
          <p className="mt-2 text-2xl font-extrabold">{formatCurrency(history.summary.totalExpenses)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Total ventas</p>
          <p className="mt-2 text-2xl font-extrabold">{formatCurrency(history.summary.totalIncome)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Producción total</p>
          <p className="mt-2 text-2xl font-extrabold">{formatNumber(history.summary.totalProduction)}</p>
        </Card>
      </div>

      <div className="grid gap-6">
        {showExpenses ? <ExpenseSection rows={history.expenses} /> : null}
        {showIncome ? <IncomeSection rows={history.income} /> : null}
        {showProduction ? <ProductionSection rows={history.production} /> : null}
      </div>
    </>
  );
}
