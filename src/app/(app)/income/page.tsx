import { requireSession } from "@/lib/auth";
import { ActivityCard } from "@/components/activity-card";
import { IncomeForm } from "@/components/forms/income-form";
import { ProductForm } from "@/components/forms/product-form";
import { PageHeader } from "@/components/page-header";
import { canManageRecords } from "@/lib/permissions";
import { toInputDate } from "@/lib/utils";
import { getClients, getIncomeById, getProducts, getRecentActivity } from "@/server/services/factory";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : undefined;
  const canManage = canManageRecords(session.role);
  const [products, clients, activity, initialValues] = await Promise.all([
    getProducts(),
    getClients(),
    getRecentActivity(),
    canManage && editId ? getIncomeById(editId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Ventas"
        title="Registrar ingresos"
        description="Registra ventas, calcula totales automaticamente y descuenta inventario cuando sale producto de la planta."
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <IncomeForm
            products={products}
            clients={clients}
            defaultDate={toInputDate(new Date())}
            initialValues={initialValues}
            canManageProducts={canManage}
          />
          {canManage ? <ProductForm products={products} /> : null}
        </div>
        <ActivityCard
          title="Ultimas ventas"
          rows={activity.incomes}
          type="income"
          canManage={canManage}
        />
      </div>
    </>
  );
}
