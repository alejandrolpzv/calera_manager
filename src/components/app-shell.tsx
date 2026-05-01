import type React from "react";

import { UserRole } from "@prisma/client";
import { LogOut } from "lucide-react";

import { AppNavigation } from "@/components/app-navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { appName, roleLabels } from "@/lib/constants";

type AppShellProps = {
  role: UserRole;
  name: string;
  children: React.ReactNode;
};

export function AppShell({ role, name, children }: AppShellProps) {
  return (
    <div className="industrial-grid min-h-screen pb-28 md:pb-8">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 md:grid md:grid-cols-[280px_1fr] md:px-6 md:py-6">
        <Card className="h-fit p-5 md:sticky md:top-6">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                Control de planta
              </p>
              <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{appName}</h1>
              <p className="mt-2 text-sm text-slate-500">
                Visibilidad financiera y control diario de produccion.
              </p>
            </div>
            <Badge>{roleLabels[role]}</Badge>
          </div>

          <div className="mb-6 rounded-3xl bg-slate-950 px-4 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Sesion activa</p>
            <p className="mt-2 text-lg font-semibold">{name}</p>
          </div>

          <AppNavigation role={role} />

          <form action="/api/auth/logout" method="post" className="mt-8">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </form>
        </Card>

        <main className="flex flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
