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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const overdueCount = receivables.filter((item) => item.dueDate && item.dueDate < today).length;
  const dueSoonCount = receivables.filter(
    (item) => item.dueDate && item.dueDate >= today && item.dueDate <= sevenDaysFromNow,
  ).length;
  const totalGrossMargin = receivables.reduce((sum, item) => sum + item.grossMargin, 0);

  function dueBadge(dueDate: Date | null) {
    if (!dueDate) {
      return { label: "Sin fecha", className: "bg-slate-100 text-slate-700" };
    }

    if (dueDate < today) {
      return { label: "Vencida", className: "bg-rose-100 text-rose-700" };
    }

    if (dueDate <= sevenDaysFromNow) {
      return { label: "Vence pronto", className: "bg-amber-100 text-amber-800" };
    }

    return { label: "Net 30", className: "bg-teal-100 text-teal-800" };
  }

  return (
    <>
      <PageHeader
        eyebrow="Cobro pendiente"
        title="Cuentas por cobrar"
        description="Controla facturas pendientes, saldos parciales y fechas de vencimiento por cliente."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Facturas pendientes</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-950">{receivables.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Saldo por cobrar</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-700">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Vencidas / 7 dias</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-700">{overdueCount} / {dueSoonCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-500">Margen bruto estimado</p>
          <p className="mt-2 text-2xl font-extrabold text-teal-700">{formatCurrency(totalGrossMargin)}</p>
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
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.paymentStatus === "PARTIAL"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {item.paymentStatus === "PARTIAL" ? "Parcial" : "Pendiente"}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${dueBadge(item.dueDate).className}`}>
                      {dueBadge(item.dueDate).label}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
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
                  <div>
                    <p className="text-slate-500">Costo est.</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(item.estimatedCost)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Margen est.</p>
                    <p className="font-semibold text-teal-700">{formatCurrency(item.grossMargin)}</p>
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
