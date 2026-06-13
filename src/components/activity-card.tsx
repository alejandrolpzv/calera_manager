import { Card } from "@/components/ui/card";
import { RecordRowActions } from "@/components/record-row-actions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

type PayrollLine = {
  id?: string;
  employeeName: string;
  amount: number;
  notes?: string | null;
};

type ActivityRow = {
  id?: string;
  date?: Date;
  category?: string;
  description?: string;
  amount?: number;
  createdBy?: string;
  productName?: string;
  quantity?: number;
  total?: number;
  clientName?: string;
  referenceCode?: string | null;
  notes?: string | null;
  payrollLines?: PayrollLine[];
  lines?: Array<{
    id: string;
    productName: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
  }>;
};

export function ActivityCard({
  title,
  rows,
  type,
  canManage = false,
}: {
  title: string;
  rows: ActivityRow[];
  type: "expense" | "income" | "production";
  canManage?: boolean;
}) {
  const apiBase =
    type === "expense" ? "/api/expenses" : type === "income" ? "/api/income" : "/api/production";

  return (
    <Card className="control-ruler p-5 pt-6">
      <h3 className="text-xl font-black tracking-[-0.035em] text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Aun no hay registros.</p>
        ) : (
          rows.map((row) => (
            <div key={String(row.id)} className="rounded-[22px] bg-white/85 p-4 ring-1 ring-slate-900/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-950">
                    {String(
                      type === "expense"
                        ? row.description
                        : type === "income"
                          ? row.clientName
                          : row.productName,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(row.date as Date)}</p>
                </div>
                <p className="shrink-0 text-sm font-black text-slate-800">
                  {type === "expense"
                    ? formatCurrency(Number(row.amount))
                    : formatNumber(Number(type === "income" ? row.total : row.quantity))}
                </p>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600">
                {String(
                  type === "expense"
                    ? row.category
                    : type === "income"
                      ? `${row.productName} | ${formatNumber(Number(row.quantity))} unidades${row.referenceCode ? ` | Ref: ${row.referenceCode}` : ""}`
                      : `${row.productName} | ${row.notes || "Sin notas"}`,
                )}
              </p>
              {type === "income" && Array.isArray(row.lines) && row.lines.length > 0 ? (
                <div className="mt-3 rounded-[20px] bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Lineas de venta
                  </p>
                  <div className="mt-2 space-y-2">
                    {row.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-700">
                          {line.productName} | {formatNumber(line.quantity)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(line.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {type === "expense" &&
              Array.isArray(row.payrollLines) &&
              row.payrollLines.length > 0 ? (
                <div className="mt-3 rounded-[20px] bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Desglose de planilla
                  </p>
                  <div className="mt-2 space-y-2">
                    {row.payrollLines.map((line) => (
                      <div
                        key={String(line.id || `${line.employeeName}-${line.amount}`)}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="text-slate-700">{line.employeeName || "Empleado"}</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(Number(line.amount || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {canManage && row.id ? (
                <RecordRowActions
                  editId={row.id}
                  deleteEndpoint={`${apiBase}/${row.id}`}
                  editBasePath={
                    type === "expense"
                      ? "/expenses"
                      : type === "income"
                        ? "/income"
                        : "/production"
                  }
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
