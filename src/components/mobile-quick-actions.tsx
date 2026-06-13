"use client";

import { UserRole } from "@prisma/client";
import { CircleDollarSign, Factory, Plus, ReceiptText, ScanSearch, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: typeof Plus;
};

export function MobileQuickActions({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const actions: QuickAction[] = [
    {
      href: "/quick",
      label: "Modo rapido",
      description: "Produccion, gasto o venta",
      icon: ReceiptText,
    },
    {
      href: "/income",
      label: "Nueva venta",
      description: "Factura con uno o varios productos",
      icon: CircleDollarSign,
    },
    {
      href: "/production",
      label: "Produccion",
      description: "Salida diaria e inventario",
      icon: Factory,
    },
    ...(role === UserRole.ADMIN || role === UserRole.OPERATOR
      ? [
          {
            href: "/ai-payroll",
            label: "IA planilla",
            description: "Leer foto de planilla",
            icon: ScanSearch,
          },
        ]
      : []),
  ];

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px] md:hidden" onClick={() => setOpen(false)}>
          <div
            className="glass-panel absolute inset-x-3 bottom-24 rounded-[30px] p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-extrabold text-slate-950">Acciones rapidas</p>
              <button
                type="button"
                className="rounded-full bg-white/80 p-2 text-slate-700"
                onClick={() => setOpen(false)}
                aria-label="Cerrar acciones rapidas"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2">
              {actions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => setOpen(false)}
                    className="tap-target flex items-center gap-3 rounded-[22px] bg-white/85 p-3 shadow-sm ring-1 ring-slate-900/5 active:scale-[0.99]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-slate-950 text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-950">{action.label}</span>
                      <span className="block truncate text-sm text-slate-500">{action.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="fixed bottom-[6.25rem] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-2xl shadow-teal-950/30 ring-4 ring-white/60 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir acciones rapidas"
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}
