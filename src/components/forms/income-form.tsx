"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PaymentStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";

type Product = {
  id: string;
  name: string;
  unitType: string;
  inventoryQuantity: number;
};

type Client = {
  id: string;
  name: string;
};

type SaleLine = {
  productId: string;
  productName: string;
  manualProduct: boolean;
  quantity: string;
  pricePerUnit: string;
};

export function IncomeForm({
  products,
  clients,
  defaultDate,
  initialValues,
  canManageProducts = false,
}: {
  products: Product[];
  clients: Client[];
  defaultDate: string;
  initialValues?: {
    id: string;
    date: string;
    referenceCode?: string;
    sourceApp?: string;
    invoiceNumber?: string;
    clientName: string;
    amountPaid?: number;
    dueDate?: string;
    paymentStatus?: PaymentStatus;
    paymentNotes?: string;
    comprobanteUrl?: string;
    lines: Array<{
      id?: string;
      productId: string;
      productName?: string;
      quantity: number;
      pricePerUnit: number;
    }>;
  } | null;
  canManageProducts?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<SaleLine[]>(
    initialValues?.lines?.length
      ? initialValues.lines.map((line) => ({
          productId: line.productId,
          productName: line.productName || "",
          manualProduct: false,
          quantity: String(line.quantity),
          pricePerUnit: String(line.pricePerUnit),
        }))
      : [{ productId: products[0]?.id || "", productName: "", manualProduct: false, quantity: "", pricePerUnit: "" }],
  );
  const [allowInvoiceCreation, setAllowInvoiceCreation] = useState(
    initialValues?.sourceApp === "cotizador-cdh",
  );
  const savingRef = useRef(false);
  const isEditing = Boolean(initialValues?.id);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    const storedProductId =
      typeof window !== "undefined" ? window.sessionStorage.getItem("newIncomeProductId") : null;

    if (storedProductId && products.some((product) => product.id === storedProductId)) {
      const frameId = window.requestAnimationFrame(() => {
        setLines((current) =>
          current.map((line, index) =>
            index === current.length - 1 && !line.productId
              ? { ...line, productId: storedProductId, manualProduct: false, productName: "" }
              : line,
          ),
        );
      });
      window.sessionStorage.removeItem("newIncomeProductId");
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [isEditing, products]);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const quantity = Number(line.quantity);
        const price = Number(line.pricePerUnit);
        return sum + (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(price) ? price : 0);
      }, 0),
    [lines],
  );

  function updateLine(index: number, field: keyof SaleLine, value: string) {
    setLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { productId: products[0]?.id || "", productName: "", manualProduct: false, quantity: "", pricePerUnit: "" },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-xl font-bold text-slate-950">
        {isEditing ? "Editar venta" : "Nueva venta"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {isEditing
          ? "Actualiza la factura de venta completa y recalcula inventario por cada producto."
          : "Registra una venta con varios productos y descuenta inventario por linea."}
      </p>

      <form
        className="mt-6 space-y-4"
        action={async (formData) => {
          if (savingRef.current) {
            return;
          }

          savingRef.current = true;
          setLoading(true);
          setError("");
          setSuccess("");

          const response = await fetch(isEditing ? `/api/income/${initialValues?.id}` : "/api/income", {
            method: isEditing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: formData.get("date"),
              clientName: formData.get("clientName"),
              referenceCode: formData.get("referenceCode"),
              sourceApp: formData.get("sourceApp"),
              invoiceNumber: formData.get("invoiceNumber"),
              amountPaid: Number(formData.get("amountPaid") || 0),
              dueDate: formData.get("dueDate"),
              paymentStatus: formData.get("paymentStatus"),
              paymentNotes: formData.get("paymentNotes"),
              comprobanteUrl: formData.get("comprobanteUrl"),
              allowInvoiceCreation,
              lines: lines
                .filter(
                  (line) =>
                    (line.productId || line.productName.trim()) &&
                    Number(line.quantity) > 0 &&
                    Number(line.pricePerUnit) > 0,
                )
                .map((line) => ({
                  productId: line.manualProduct ? "" : line.productId,
                  productName: line.manualProduct ? line.productName.trim() : "",
                  quantity: Number(line.quantity),
                  pricePerUnit: Number(line.pricePerUnit),
                })),
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            setError(result.error || "No se pudo guardar la venta.");
            savingRef.current = false;
            setLoading(false);
            return;
          }

          setSuccess(isEditing ? "Venta actualizada." : "Venta guardada.");
          setLoading(false);
          savingRef.current = false;

          if (isEditing) {
            router.replace(`/income?updated=${Date.now()}`);
            startTransition(() => router.refresh());
            return;
          }
          router.push(`/income?saved=${Date.now()}`);
          startTransition(() => router.refresh());
        }}
      >
        <div>
          <Label htmlFor="income-date">Fecha</Label>
          <Input
            id="income-date"
            name="date"
            type="date"
            defaultValue={initialValues?.date || defaultDate}
            required
          />
        </div>

        <div>
          <Label htmlFor="income-client">Cliente</Label>
          <Input
            id="income-client"
            name="clientName"
            placeholder="Cliente o empresa"
            defaultValue={initialValues?.clientName || ""}
            list="income-clients"
            required
          />
          <datalist id="income-clients">
            {clients.map((client) => (
              <option key={client.id} value={client.name} />
            ))}
          </datalist>
          <p className="mt-2 text-xs text-slate-500">
            Si escribes un cliente nuevo, se guarda automaticamente y quedara disponible para futuras ventas.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="income-reference">Referencia externa</Label>
            <Input
              id="income-reference"
              name="referenceCode"
              placeholder="FAC-2026-001 o ref del cotizador"
              defaultValue={initialValues?.referenceCode || ""}
            />
          </div>
          <div>
            <Label htmlFor="income-invoice">Numero de factura</Label>
            <Input
              id="income-invoice"
              name="invoiceNumber"
              placeholder="FAC-00123"
              defaultValue={initialValues?.invoiceNumber || ""}
            />
          </div>
          <div>
            <Label htmlFor="income-source">Origen</Label>
            <Select
              id="income-source"
              name="sourceApp"
              defaultValue={initialValues?.sourceApp || ""}
            >
              <option value="">Manual</option>
              <option value="cotizador-cdh">Cotizador CDH</option>
            </Select>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <div className="mb-4">
            <p className="font-semibold text-slate-900">Cobro y comprobante</p>
            <p className="text-sm text-slate-500">
              Controla si la venta esta pagada, parcial o pendiente.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="income-amountPaid">Monto pagado</Label>
              <Input
                id="income-amountPaid"
                name="amountPaid"
                type="number"
                min="0"
                step="0.01"
                defaultValue={initialValues?.amountPaid ? String(initialValues.amountPaid) : "0"}
              />
            </div>
            <div>
              <Label htmlFor="income-dueDate">Fecha de vencimiento</Label>
              <Input
                id="income-dueDate"
                name="dueDate"
                type="date"
                defaultValue={initialValues?.dueDate || ""}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="income-paymentStatus">Estado de pago</Label>
              <Select
                id="income-paymentStatus"
                name="paymentStatus"
                defaultValue={initialValues?.paymentStatus || PaymentStatus.PENDING}
              >
                <option value={PaymentStatus.PENDING}>Pendiente</option>
                <option value={PaymentStatus.PARTIAL}>Parcial</option>
                <option value={PaymentStatus.PAID}>Pagado</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="income-comprobante">Comprobante o enlace</Label>
              <Input
                id="income-comprobante"
                name="comprobanteUrl"
                placeholder="URL, nota o referencia del comprobante"
                defaultValue={initialValues?.comprobanteUrl || ""}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="income-paymentNotes">Notas de cobro</Label>
            <Input
              id="income-paymentNotes"
              name="paymentNotes"
              placeholder="Credito a 15 dias, pago en banco, cheque, etc."
              defaultValue={initialValues?.paymentNotes || ""}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={allowInvoiceCreation}
            onChange={(event) => setAllowInvoiceCreation(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          <span className="text-sm text-slate-700">
            Si un producto no existe o no alcanza el stock, créalo o complétalo desde esta factura.
          </span>
        </label>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Productos de la venta</p>
              <p className="text-sm text-slate-500">
                Agrega todas las lineas de la factura en un solo registro.
              </p>
            </div>
            <Button type="button" variant="secondary" className="px-3 py-2" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" />
              Producto
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={`income-line-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor={`income-product-${index}`}>Producto</Label>
                    {line.manualProduct ? (
                      <Input
                        id={`income-product-${index}`}
                        value={line.productName}
                        onChange={(event) => updateLine(index, "productName", event.target.value)}
                        placeholder="Nombre del producto en la factura"
                      />
                    ) : (
                      <Select
                        id={`income-product-${index}`}
                        value={line.productId}
                        onChange={(event) => updateLine(index, "productId", event.target.value)}
                        disabled={products.length === 0}
                      >
                        {products.length ? (
                          products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.unitType}) | Stock: {product.inventoryQuantity}
                            </option>
                          ))
                        ) : (
                          <option value="">No hay productos registrados</option>
                        )}
                      </Select>
                    )}
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-teal-700"
                      onClick={() =>
                        setLines((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...item,
                                  manualProduct: !item.manualProduct,
                                  productId: !item.manualProduct ? "" : products[0]?.id || "",
                                  productName: item.manualProduct ? "" : item.productName,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {line.manualProduct ? "Usar catálogo" : "Escribir producto manual"}
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      {canManageProducts
                        ? "Si falta un producto, puedes crearlo abajo en esta misma pantalla."
                        : "Si falta un producto, pide a un administrador que lo agregue al catalogo."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`income-quantity-${index}`}>Cantidad</Label>
                      <Input
                        id={`income-quantity-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity}
                        onChange={(event) => updateLine(index, "quantity", event.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`income-price-${index}`}>Precio por unidad</Label>
                      <Input
                        id={`income-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.pricePerUnit}
                        onChange={(event) => updateLine(index, "pricePerUnit", event.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Subtotal: L{" "}
                    {(
                      (Number(line.quantity) || 0) * (Number(line.pricePerUnit) || 0)
                    ).toFixed(2)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-2 text-red-700"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="income-total">Total estimado</Label>
          <Input
            id="income-total"
            name="total"
            type="number"
            value={total.toFixed(2)}
            readOnly
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-teal-700">{success}</p> : null}

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              lines.every((line) => !line.productId && !line.productName.trim())
            }
          >
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar venta"}
          </Button>
          {isEditing ? (
            <Link
              href="/income"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Cancelar edicion
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
