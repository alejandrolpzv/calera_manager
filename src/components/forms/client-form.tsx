"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";

export function ClientForm({
  initialValues,
}: {
  initialValues?: {
    id: string;
    name: string;
    phone: string;
    rtn: string;
    address: string;
    notes: string;
    isActive: boolean;
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
        {isEditing ? "Editar cliente" : "Nuevo cliente"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Completa los datos comerciales para dar mejor seguimiento a ventas, cobros y comprobantes.
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
            isEditing ? `/api/clients/${initialValues?.id}` : "/api/clients",
            {
              method: isEditing ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: formData.get("name"),
                phone: formData.get("phone"),
                rtn: formData.get("rtn"),
                address: formData.get("address"),
                notes: formData.get("notes"),
                isActive: formData.get("isActive") === "true",
              }),
            },
          );

          const result = await response.json();
          if (!response.ok) {
            setError(result.error || "No se pudo guardar el cliente.");
            savingRef.current = false;
            setLoading(false);
            return;
          }

          setSuccess(isEditing ? "Cliente actualizado." : "Cliente guardado.");
          setLoading(false);
          savingRef.current = false;

          if (isEditing) {
            router.replace("/clients");
          } else {
            router.push(`/clients?saved=${Date.now()}`);
          }
          startTransition(() => router.refresh());
        }}
      >
        <div>
          <Label htmlFor="client-name">Nombre</Label>
          <Input id="client-name" name="name" defaultValue={initialValues?.name || ""} required />
        </div>

        <div>
          <Label htmlFor="client-phone">Telefono</Label>
          <Input id="client-phone" name="phone" defaultValue={initialValues?.phone || ""} />
        </div>

        <div>
          <Label htmlFor="client-rtn">RTN</Label>
          <Input id="client-rtn" name="rtn" defaultValue={initialValues?.rtn || ""} />
        </div>

        <div>
          <Label htmlFor="client-address">Direccion</Label>
          <Input id="client-address" name="address" defaultValue={initialValues?.address || ""} />
        </div>

        <div>
          <Label htmlFor="client-notes">Notas</Label>
          <Input id="client-notes" name="notes" defaultValue={initialValues?.notes || ""} />
        </div>

        <div>
          <Label htmlFor="client-isActive">Estado</Label>
          <Select
            id="client-isActive"
            name="isActive"
            defaultValue={String(initialValues?.isActive ?? true)}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </Select>
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-teal-700">{success}</p> : null}

        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar cliente"}
          </Button>
          {isEditing ? (
            <Link
              href="/clients"
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
