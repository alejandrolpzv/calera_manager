"use client";

import { ExpenseCategory, PaymentStatus } from "@prisma/client";
import { CheckCircle2, CircleDollarSign, Factory, Loader2, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { expenseCategoryOptions } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  unitType: string;
  standardUnitCost: number;
  inventoryQuantity: number;
};

type Client = {
  id: string;
  name: string;
};

type QuickType = "production" | "expense" | "income";
type SavedRecord = {
  type: QuickType;
  label: string;
  detail: string;
  amount?: string;
  savedAt: string;
};

export function QuickPlantMode({
  products,
  clients,
  defaultDate,
}: {
  products: Product[];
  clients: Client[];
  defaultDate: string;
}) {
  const router = useRouter();
  const savingRef = useRef(false);
  const [active, setActive] = useState<QuickType>("production");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [salePaidNow, setSalePaidNow] = useState(true);
  const [formVersion, setFormVersion] = useState(0);
  const [lastSaved, setLastSaved] = useState<SavedRecord | null>(null);
  const saleTotal = useMemo(
    () => (Number(saleQuantity) || 0) * (Number(salePrice) || 0),
    [salePrice, saleQuantity],
  );

  function addDaysToInputDate(value: string, days: number) {
    const [year, month, day] = value.split("-").map(Number);
    const date = year && month && day ? new Date(year, month - 1, day) : new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  async function submitQuickRecord(formData: FormData) {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setLoading(true);
    setMessage("");
    setError("");

    const currentType = active;
    const endpoint =
      active === "production" ? "/api/production" : active === "expense" ? "/api/expenses" : "/api/income";
    const product = products.find((item) => item.id === String(formData.get("productId")));
    const savedPreview: SavedRecord =
      active === "production"
        ? {
            type: "production",
            label: "Produccion guardada",
            detail: `${formData.get("quantity") || 0} ${product?.unitType || "unidades"} | ${product?.name || "Producto"}`,
            savedAt: new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
          }
        : active === "expense"
          ? {
              type: "expense",
              label: "Gasto guardado",
              detail: String(formData.get("description") || "Gasto rapido de planta"),
              amount: formatCurrency(Number(formData.get("amount") || 0)),
              savedAt: new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
            }
          : {
              type: "income",
              label: salePaidNow ? "Venta cobrada" : "Venta Net 30",
              detail: `${formData.get("clientName") || "Cliente"} | ${product?.name || "Producto"}`,
              amount: formatCurrency(saleTotal),
              savedAt: new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" }),
            };
    const body =
      active === "production"
        ? {
            date: formData.get("date"),
            productId: formData.get("productId"),
            quantity: formData.get("quantity"),
            notes: formData.get("notes") || "Registro rapido de planta",
          }
        : active === "expense"
          ? {
              date: formData.get("date"),
              category: formData.get("category"),
              description: formData.get("description") || "Gasto rapido de planta",
              amount: formData.get("amount"),
              payrollLines: [],
            }
          : {
              date: formData.get("date"),
              clientName: formData.get("clientName"),
              amountPaid: salePaidNow ? saleTotal : 0,
              dueDate: salePaidNow ? "" : addDaysToInputDate(String(formData.get("date") || defaultDate), 30),
              paymentStatus: salePaidNow ? PaymentStatus.PAID : PaymentStatus.PENDING,
              paymentNotes: salePaidNow ? "" : "Credito Net 30",
              allowInvoiceCreation: false,
              lines: [
                {
                  productId: formData.get("productId"),
                  quantity: formData.get("quantity"),
                  pricePerUnit: formData.get("pricePerUnit"),
                  estimatedUnitCost: product?.standardUnitCost || 0,
                },
              ],
            };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "No se pudo guardar el registro.");
      }

      setMessage(
        active === "production"
          ? "Produccion guardada e inventario actualizado."
          : active === "expense"
            ? "Gasto guardado."
            : "Venta guardada e inventario descontado.",
      );
      setLastSaved(savedPreview);
      setFormVersion((version) => version + 1);
      setSaleQuantity("");
      setSalePrice("");
      setSalePaidNow(true);
      startTransition(() => {
        router.refresh();
      });
      setActive(currentType);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
      savingRef.current = false;
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <QuickSelector
          active={active === "production"}
          icon={Factory}
          title="Produccion"
          description="Producto + cantidad"
          onClick={() => setActive("production")}
        />
        <QuickSelector
          active={active === "expense"}
          icon={ReceiptText}
          title="Gasto"
          description="Categoria + monto"
          onClick={() => setActive("expense")}
        />
        <QuickSelector
          active={active === "income"}
          icon={CircleDollarSign}
          title="Venta"
          description="Cliente + producto"
          onClick={() => setActive("income")}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="bg-slate-950 p-4 text-white sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-300">
                Captura express
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">
                {active === "production"
                  ? "Produccion rapida"
                  : active === "expense"
                    ? "Gasto rapido"
                    : "Venta rapida"}
              </h3>
            </div>
            <span className="rounded-full bg-teal-300 px-3 py-1 text-xs font-black text-slate-950">
              2 taps
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Campos minimos para operar rapido desde el telefono.
            </p>
          </div>

          <form
            key={`${active}-${formVersion}`}
            className="mt-5 space-y-4"
            action={submitQuickRecord}
          >
            <div>
              <Label htmlFor="quick-date">Fecha</Label>
              <Input id="quick-date" name="date" type="date" defaultValue={defaultDate} required />
            </div>

            {active === "production" ? (
              <ProductionQuickFields products={products} />
            ) : active === "expense" ? (
              <ExpenseQuickFields />
            ) : (
              <IncomeQuickFields
                products={products}
                clients={clients}
                saleTotal={saleTotal}
                saleQuantity={saleQuantity}
                salePrice={salePrice}
                salePaidNow={salePaidNow}
                setSaleQuantity={setSaleQuantity}
                setSalePrice={setSalePrice}
                setSalePaidNow={setSalePaidNow}
              />
            )}

            {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
            {message ? <p className="rounded-2xl bg-teal-50 p-3 text-sm font-semibold text-teal-800">{message}</p> : null}

            <Button
              type="submit"
              className="min-h-14 w-full text-base"
              disabled={loading || (active !== "expense" && products.length === 0)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Guardando..." : "Guardar rapido"}
            </Button>
          </form>
        </div>
      </Card>

      {lastSaved ? <LastSavedCard record={lastSaved} /> : null}
    </div>
  );
}

function LastSavedCard({ record }: { record: SavedRecord }) {
  const tone =
    record.type === "production"
      ? "bg-teal-50 text-teal-900"
      : record.type === "expense"
        ? "bg-amber-50 text-amber-900"
        : "bg-slate-950 text-white";

  return (
    <Card className={`p-4 xl:col-start-2 ${tone}`}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-extrabold">{record.label}</p>
          <p className="mt-1 text-sm opacity-80">{record.detail}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold">
            {record.amount ? <span>{record.amount}</span> : null}
            <span>{record.savedAt}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuickSelector({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof Factory;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-tile rounded-[28px] p-4 text-left transition active:scale-[0.99] ${
        active
          ? "bg-slate-950 text-white shadow-xl shadow-slate-900/15"
          : "bg-white/85 text-slate-800 hover:bg-white"
      }`}
    >
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${active ? "bg-white/15" : "bg-teal-50 text-teal-800"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 block text-lg font-extrabold">{title}</span>
      <span className={`mt-1 block text-sm ${active ? "text-slate-300" : "text-slate-500"}`}>
        {description}
      </span>
    </button>
  );
}

function ProductionQuickFields({ products }: { products: Product[] }) {
  return (
    <>
      <div>
        <Label htmlFor="quick-production-product">Producto</Label>
        <Select id="quick-production-product" name="productId" required disabled={products.length === 0}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.unitType})
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="quick-production-quantity">Cantidad producida</Label>
        <Input id="quick-production-quantity" name="quantity" type="number" min="0" step="0.01" inputMode="decimal" required />
      </div>
      <div>
        <Label htmlFor="quick-production-notes">Nota opcional</Label>
        <Textarea id="quick-production-notes" name="notes" placeholder="Turno, lote u observacion corta" rows={3} />
      </div>
    </>
  );
}

function ExpenseQuickFields() {
  return (
    <>
      <div>
        <Label htmlFor="quick-expense-category">Categoria</Label>
        <Select id="quick-expense-category" name="category" defaultValue={ExpenseCategory.DIESEL} required>
          {expenseCategoryOptions
            .filter((option) => option.value !== ExpenseCategory.PLANILLA)
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="quick-expense-amount">Monto</Label>
        <Input id="quick-expense-amount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" required />
      </div>
      <div>
        <Label htmlFor="quick-expense-description">Descripcion corta</Label>
        <Input id="quick-expense-description" name="description" placeholder="Ej. Diesel cargador, comida, repuesto" required />
      </div>
    </>
  );
}

function IncomeQuickFields({
  products,
  clients,
  saleTotal,
  saleQuantity,
  salePrice,
  salePaidNow,
  setSaleQuantity,
  setSalePrice,
  setSalePaidNow,
}: {
  products: Product[];
  clients: Client[];
  saleTotal: number;
  saleQuantity: string;
  salePrice: string;
  salePaidNow: boolean;
  setSaleQuantity: (value: string) => void;
  setSalePrice: (value: string) => void;
  setSalePaidNow: (value: boolean) => void;
}) {
  return (
    <>
      <div>
        <Label htmlFor="quick-income-client">Cliente</Label>
        <Input id="quick-income-client" name="clientName" placeholder="Cliente o empresa" list="quick-income-clients" required />
        <datalist id="quick-income-clients">
          {clients.map((client) => (
            <option key={client.id} value={client.name} />
          ))}
        </datalist>
      </div>
      <div>
        <Label htmlFor="quick-income-product">Producto</Label>
        <Select id="quick-income-product" name="productId" required disabled={products.length === 0}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} | Stock: {product.inventoryQuantity}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="quick-income-quantity">Cantidad</Label>
          <Input
            id="quick-income-quantity"
            name="quantity"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={saleQuantity}
            onChange={(event) => setSaleQuantity(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="quick-income-price">Precio unitario</Label>
          <Input
            id="quick-income-price"
            name="pricePerUnit"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            required
          />
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
        <span>
          <span className="block font-bold text-slate-900">Cobrado ahora</span>
          <span className="block text-sm text-slate-500">
            Si no, queda como cuenta por cobrar Net 30.
          </span>
        </span>
        <input
          type="checkbox"
          checked={salePaidNow}
          onChange={(event) => setSalePaidNow(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-teal-700"
        />
      </label>
      <div className="rounded-2xl bg-teal-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Total venta</p>
        <p className="mt-1 text-2xl font-black text-teal-950">{formatCurrency(saleTotal)}</p>
      </div>
    </>
  );
}
