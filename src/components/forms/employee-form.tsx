"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";

export function EmployeeForm({
  initialValues,
}: {
  initialValues?: {
    id: string;
    name: string;
    roleLabel: string;
    dailySalary: number;
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
        {isEditing ? "Editar empleado" : "Nuevo empleado"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {isEditing
          ? "Actualiza los datos para mantener la planilla y reportes limpios."
          : "Crea el catalogo base para usarlo en planilla y control operativo."}
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
            isEditing ? `/api/employees/${initialValues?.id}` : "/api/employees",
            {
              method: isEditing ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: formData.get("name"),
                roleLabel: formData.get("roleLabel"),
                dailySalary: Number(formData.get("dailySalary")),
                isActive: formData.get("isActive") === "true",
              }),
            },
          );

          const result = await response.json();
          if (!response.ok) {
            setError(result.error || "No se pudo guardar el empleado.");
            savingRef.current = false;
            setLoading(false);
            return;
          }

          setSuccess(isEditing ? "Empleado actualizado." : "Empleado guardado.");
          if (isEditing) {
            router.replace("/employees");
          }
          router.refresh();
          savingRef.current = false;
          setLoading(false);
        }}
      >
        <div>
          <Label htmlFor="employee-name">Nombre</Label>
          <Input
            id="employee-name"
            name="name"
            defaultValue={initialValues?.name || ""}
            placeholder="Nombre completo"
            required
          />
        </div>

        <div>
          <Label htmlFor="employee-roleLabel">Puesto o area</Label>
          <Input
            id="employee-roleLabel"
            name="roleLabel"
            defaultValue={initialValues?.roleLabel || ""}
            placeholder="Empaque, molino, carga, despacho..."
          />
        </div>

        <div>
          <Label htmlFor="employee-dailySalary">Salario por dia</Label>
          <Input
            id="employee-dailySalary"
            name="dailySalary"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={initialValues?.dailySalary ? String(initialValues.dailySalary) : ""}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <Label htmlFor="employee-isActive">Estado</Label>
          <Select
            id="employee-isActive"
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
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar empleado"}
          </Button>
          {isEditing ? (
            <Link
              href="/employees"
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
