"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";

type Product = {
  id: string;
  name: string;
  unitType: string;
};

export function ProductionForm({
  products,
  defaultDate,
  initialValues,
}: {
  products: Product[];
  defaultDate: string;
  initialValues?: {
    id: string;
    date: string;
    productId: string;
    quantity: number;
    notes: string;
  } | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);
  const isEditing = Boolean(initialValues?.id);

  return (
    <Card className="p-5">
      <h3 className="text-xl font-bold text-slate-950">
        {isEditing ? "Editar produccion" : "Nueva produccion"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {isEditing
          ? "Actualiza la produccion y ajusta inventario automaticamente."
          : "La produccion aumenta el inventario automaticamente."}
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

          const response = await fetch(
            isEditing ? `/api/production/${initialValues?.id}` : "/api/production",
            {
              method: isEditing ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: formData.get("date"),
                productId: formData.get("productId"),
                quantity: formData.get("quantity"),
                notes: formData.get("notes"),
              }),
            },
          );

          const result = await response.json();
          if (!response.ok) {
            setError(result.error || "No se pudo guardar la produccion.");
            savingRef.current = false;
            setLoading(false);
            return;
          }

          setSuccess(isEditing ? "Produccion actualizada." : "Produccion guardada.");
          setLoading(false);
          savingRef.current = false;

          if (isEditing) {
            router.replace("/production");
          } else {
            router.push(`/production?saved=${Date.now()}`);
          }
          startTransition(() => router.refresh());
        }}
      >
        <div>
          <Label htmlFor="production-date">Fecha</Label>
          <Input
            id="production-date"
            name="date"
            type="date"
            defaultValue={initialValues?.date || defaultDate}
            required
          />
        </div>

        <div>
          <Label htmlFor="production-product">Producto</Label>
          <Select
            id="production-product"
            name="productId"
            required
            defaultValue={initialValues?.productId || products[0]?.id}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.unitType})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="production-quantity">Cantidad producida</Label>
          <Input
            id="production-quantity"
            name="quantity"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialValues?.quantity}
            required
          />
        </div>

        <div>
          <Label htmlFor="production-notes">Notas</Label>
          <Textarea
            id="production-notes"
            name="notes"
            placeholder="Nota opcional del lote"
            defaultValue={initialValues?.notes || ""}
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-teal-700">{success}</p> : null}

        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading || products.length === 0}>
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar produccion"}
          </Button>
          {isEditing ? (
            <Link
              href="/production"
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
