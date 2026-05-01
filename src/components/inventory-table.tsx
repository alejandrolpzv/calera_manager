import { Card } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";

export function InventoryTable({
  inventory,
}: {
  inventory: Array<{
    id: string;
    productName: string;
    unitType: string;
    quantity: number;
    lastUpdated: Date;
  }>;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-bold text-slate-950">Inventario actual</h3>
        <p className="text-sm text-slate-500">Actualizado automaticamente desde produccion y ventas.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Producto</th>
              <th className="px-5 py-3 font-semibold">Unidad</th>
              <th className="px-5 py-3 font-semibold">Cantidad</th>
              <th className="px-5 py-3 font-semibold">Ultima actualizacion</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 bg-white/70">
                <td className="px-5 py-4 font-semibold text-slate-900">{item.productName}</td>
                <td className="px-5 py-4 text-slate-600">{item.unitType}</td>
                <td className="px-5 py-4 text-slate-900">{formatNumber(item.quantity)}</td>
                <td className="px-5 py-4 text-slate-600">{formatDate(item.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
