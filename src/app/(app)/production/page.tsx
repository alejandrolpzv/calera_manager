import { UserRole } from "@prisma/client";

import { ActivityCard } from "@/components/activity-card";
import { ProductForm } from "@/components/forms/product-form";
import { ProductionForm } from "@/components/forms/production-form";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth";
import { canManageRecords } from "@/lib/permissions";
import { toInputDate } from "@/lib/utils";
import { getProducts, getProductionById, getRecentActivity } from "@/server/services/factory";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : undefined;
  const canManage = canManageRecords(session.role);
  const [products, activity, initialValues] = await Promise.all([
    getProducts(),
    getRecentActivity(),
    canManage && editId ? getProductionById(editId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Salida de planta"
        title="Registrar produccion"
        description="Mantiene la captura diaria simple hoy y deja el sistema listo para turnos y trazabilidad por maquina manana."
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <ProductionForm
          products={products}
          defaultDate={toInputDate(new Date())}
          initialValues={initialValues}
        />
        <ActivityCard
          title="Ultima produccion"
          rows={activity.productions}
          type="production"
          canManage={canManage}
        />
      </div>

      {session.role === UserRole.ADMIN ? (
        <div className="max-w-xl">
          <ProductForm products={products} />
        </div>
      ) : null}
    </>
  );
}
