"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";

type Product = {
  id: string;
  name: string;
  unitType: string;
  inventoryQuantity: number;
};

export function ProductForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const savingRef = useRef(false);
  const deletingRef = useRef(false);

  async function onDeleteProduct(productId: string) {
    if (deletingRef.current) {
      return;
    }

    const confirmed = window.confirm("¿Seguro que quieres eliminar este producto?");

    if (!confirmed) {
      return;
    }

    deletingRef.current = true;
    setDeletingId(productId);
    setError("");
    setSuccess("");

    const response = await fetch(`/api/products/${productId}`, {
      method: "DELETE",
    });

    const result = await response.json().catch(() => ({ error: "No se pudo eliminar el producto." }));
    setDeletingId("");
    deletingRef.current = false;

    if (!response.ok) {
      setError(result.error || "No se pudo eliminar el producto.");
      return;
    }

    setSuccess("Producto eliminado.");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <h3 className="text-xl font-bold text-slate-950">Agregar producto</h3>
      <p className="mt-2 text-sm text-slate-500">Catalogo editable preparado para futuras lineas de producto.</p>

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

          const response = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.get("name"),
              unitType: formData.get("unitType"),
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            setError(result.error || "No se pudo crear el producto.");
            savingRef.current = false;
            setLoading(false);
            return;
          }

          setSuccess("Producto creado.");
          if (typeof window !== "undefined" && result.productId) {
            window.sessionStorage.setItem("newIncomeProductId", String(result.productId));
          }
          router.refresh();
          savingRef.current = false;
          setLoading(false);
        }}
      >
        <div>
          <Label htmlFor="product-name">Nombre del producto</Label>
          <Input id="product-name" name="name" placeholder="Calcium Carbonate Premium" required />
        </div>

        <div>
          <Label htmlFor="product-unit">Tipo de unidad</Label>
          <Input id="product-unit" name="unitType" defaultValue="Sacos de 100 lbs" required />
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-teal-700">{success}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Guardando..." : "Crear producto"}
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
          Productos del catalogo
        </h4>
        <div className="mt-4 space-y-3">
          {products.length ? (
            products.map((product) => (
              <div key={product.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{product.unitType}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Stock actual: {product.inventoryQuantity}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-2 text-red-700"
                    onClick={() => onDeleteProduct(product.id)}
                    disabled={deletingId === product.id}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {deletingId === product.id ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Todavia no hay productos en el catalogo.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
