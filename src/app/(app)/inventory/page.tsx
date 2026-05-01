import { InventoryTable } from "@/components/inventory-table";
import { PageHeader } from "@/components/page-header";
import { getInventorySnapshot } from "@/server/services/factory";

export default async function InventoryPage() {
  const inventory = await getInventorySnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Existencias"
        title="Estado del inventario"
        description="El inventario se mueve automaticamente con la produccion y las ventas, dando una vista actual del stock de planta."
      />

      <InventoryTable inventory={inventory} />
    </>
  );
}
