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
    <Card className="control-ruler overflow-hidden p-0 pt-1">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-xl font-black tracking-[-0.035em] text-slate-950">Inventario actual</h3>
        <p className="text-sm text-slate-500">Actualizado automaticamente desde produccion y ventas.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950 text-left text-white">
            <tr>
              <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">Producto</th>
              <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">Unidad</th>
              <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">Cantidad</th>
              <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.14em]">Ultima actualizacion</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 bg-white/75">
                <td className="px-5 py-4 font-black text-slate-950">{item.productName}</td>
                <td className="px-5 py-4 text-slate-600">{item.unitType}</td>
                <td className="px-5 py-4 font-black text-slate-900">{formatNumber(item.quantity)}</td>
                <td className="px-5 py-4 text-slate-600">{formatDate(item.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
