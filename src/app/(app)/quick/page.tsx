import { QuickPlantMode } from "@/components/quick/quick-plant-mode";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth";
import { toInputDate } from "@/lib/utils";
import { getClients, getProducts } from "@/server/services/factory";

export default async function QuickPage() {
  await requireSession();
  const [products, clients] = await Promise.all([getProducts(), getClients()]);

  return (
    <>
      <PageHeader
        eyebrow="Modo planta"
        title="Registro rapido"
        description="Captura produccion, gastos o ventas con los campos minimos para operar desde el telefono en planta."
      />

      <QuickPlantMode
        products={products}
        clients={clients}
        defaultDate={toInputDate(new Date())}
      />
    </>
  );
}
