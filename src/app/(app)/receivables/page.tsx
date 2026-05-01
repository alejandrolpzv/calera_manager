import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PaymentActions } from "@/components/receivables/payment-actions";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getReceivables } from "@/server/services/factory";

export default async function ReceivablesPage() {
  await requireAdmin();
  const receivables = await getReceivables();
  const totalPending = receivables.reduce((sum, item) => sum + item.balanceDue, 0);

  return (
    <>
      <PageHeader
        eyebrow="Cobro pendiente"
        title="Cuentas por cobrar"
        description="Controla facturas pendientes, saldos parciales y fechas de vencimiento por cliente."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Facturas pendientes</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-950">{receivables.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Saldo por cobrar</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Casos parciales</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-950">
            {receivables.filter((item) => item.paymentStatus === "PARTIAL").length}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-950">Detalle de cobros</h3>
            <p className="mt-2 text-sm text-slate-500">
              Ordenado por vencimiento para que puedas priorizar seguimiento.
            </p>
          </div>
          <Badge>{receivables.length} registros</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {receivables.length ? (
            receivables.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{item.clientName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(item.date)}
                      {item.invoiceNumber ? ` | Factura: ${item.invoiceNumber}` : ""}
                      {item.referenceCode ? ` | Ref: ${item.referenceCode}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Vence: {item.dueDate ? formatDate(item.dueDate) : "Sin fecha definida"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.paymentStatus === "PARTIAL"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.paymentStatus === "PARTIAL" ? "Parcial" : "Pendiente"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-slate-500">Total factura</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Pagado</p>
                    <p className="font-semibold text-teal-700">{formatCurrency(item.amountPaid)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Saldo</p>
                    <p className="font-semibold text-amber-700">{formatCurrency(item.balanceDue)}</p>
                  </div>
                </div>

                <PaymentActions
                  incomeId={item.id}
                  total={item.total}
                  amountPaid={item.amountPaid}
                  balanceDue={item.balanceDue}
                />
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No hay cuentas por cobrar pendientes en este momento.
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
