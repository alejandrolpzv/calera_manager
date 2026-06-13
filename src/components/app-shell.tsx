import type React from "react";

import { UserRole } from "@prisma/client";
import { LogOut } from "lucide-react";

import { AppNavigation } from "@/components/app-navigation";
import { MobileQuickActions } from "@/components/mobile-quick-actions";
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
    <div className="industrial-grid min-h-screen overflow-x-hidden pb-28 md:pb-8">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-4 px-3 py-3 sm:px-4 md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-6 md:px-6 md:py-6">
        <Card className="control-ruler h-fit p-4 md:sticky md:top-6 md:p-5">
          <div className="mb-4 flex items-start justify-between gap-3 md:mb-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-teal-700">
                Control de planta
              </p>
              <h1 className="mt-2 max-w-[10ch] text-2xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-3xl">
                {appName}
              </h1>
              <p className="mt-2 hidden text-sm text-slate-500 sm:block">
                Visibilidad financiera y control diario de produccion.
              </p>
            </div>
            <Badge>{roleLabels[role]}</Badge>
          </div>

          <div className="mb-0 rounded-[26px] bg-slate-950 px-4 py-3 text-white shadow-xl shadow-slate-950/10 md:mb-6 md:py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Sesion activa</p>
            <p className="mt-2 truncate text-base font-semibold md:text-lg">{name}</p>
          </div>

          <AppNavigation role={role} />

          <form action="/api/auth/logout" method="post" className="mt-8">
            <button
              type="submit"
              className="tap-target flex w-full items-center justify-center gap-2 rounded-[20px] bg-white/75 px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-white"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </form>
        </Card>

        <main className="flex min-w-0 flex-col gap-5 md:gap-6">{children}</main>
      </div>
      <MobileQuickActions role={role} />
    </div>
  );
}
