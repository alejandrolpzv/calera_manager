import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClientForm } from "@/components/forms/client-form";
import { PageHeader } from "@/components/page-header";
import { RecordRowActions } from "@/components/record-row-actions";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getClientById, getClients } from "@/server/services/factory";

type ClientListItem = Awaited<ReturnType<typeof getClients>>[number];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : undefined;
  const [clients, initialValues] = await Promise.all([
    getClients(),
    editId ? getClientById(editId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Relacion comercial"
        title="Clientes"
        description="Cada cliente nuevo se guarda automaticamente desde ventas y conserva su historial para futuras consultas."
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <ClientForm initialValues={initialValues} />

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Catalogo de clientes</h3>
              <p className="mt-2 text-sm text-slate-500">
                Revisa ventas acumuladas, datos comerciales y cobros pendientes por cliente.
              </p>
            </div>
            <Badge>{clients.length} clientes</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {clients.length ? (
              clients.map((client: ClientListItem) => (
                <div
                  key={client.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{client.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {client.phone || "Sin telefono"}
                        {client.rtn ? ` | RTN: ${client.rtn}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {client.salesCount} ventas registradas
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        Total vendido: {formatCurrency(client.totalSales)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-amber-700">
                        Pendiente por cobrar: {formatCurrency(client.totalPending || 0)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Ultima venta: {client.lastSaleDate ? formatDate(client.lastSaleDate) : "Sin ventas"}
                      </p>
                    </div>
                    <Link
                      href={`/history?type=income&q=${encodeURIComponent(client.name)}`}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                    >
                      Ver historial
                    </Link>
                  </div>

                  {client.address ? <p className="mt-3 text-sm text-slate-600">{client.address}</p> : null}
                  {client.notes ? <p className="mt-1 text-sm text-slate-500">{client.notes}</p> : null}

                  {client.recentSales.length ? (
                    <div className="mt-4 rounded-2xl bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Ventas recientes
                      </p>
                      <div className="mt-2 space-y-2">
                        {client.recentSales.map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-slate-800">{sale.productName}</p>
                              <p className="text-slate-500">
                                {formatDate(sale.date)}
                                {sale.invoiceNumber ? ` | Factura: ${sale.invoiceNumber}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="block font-semibold text-slate-900">
                                {formatCurrency(sale.total)}
                              </span>
                              {sale.balanceDue > 0 ? (
                                <span className="text-xs font-medium text-amber-700">
                                  Saldo: {formatCurrency(sale.balanceDue)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <RecordRowActions
                    editId={client.id}
                    editBasePath="/clients"
                    hideDelete
                  />
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Todavia no hay clientes guardados. El primero se creara automaticamente al registrar una venta nueva.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
