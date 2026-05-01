"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(result.error || "No se pudo iniciar sesion.");
      return;
    }

    router.push(result.redirectTo || "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">
          Acceso movil primero
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Inicia sesion en la planta</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Usa primero la cuenta inicial de administrador u operador y luego conecta tu
          propia base de datos de produccion.
        </p>
      </div>

      <form
        action={async (formData) => {
          await onSubmit(formData);
        }}
        className="space-y-5"
      >
        <div>
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" placeholder="admin@factory.local" required />
        </div>

        <div>
          <Label htmlFor="password">Contrasena</Label>
          <Input id="password" name="password" type="password" required />
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar al sistema"}
        </Button>
      </form>
    </Card>
  );
}
