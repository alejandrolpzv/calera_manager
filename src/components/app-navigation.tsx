"use client";

import { UserRole } from "@prisma/client";
import { BarChart3, Boxes, CircleDollarSign, CircleHelp, Factory, FileSpreadsheet, History, Menu, PlusCircle, ReceiptText, ScanSearch, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { navigationItems } from "@/lib/constants";
import { cn } from "@/lib/utils";

const icons = {
  "/quick": PlusCircle,
  "/dashboard": BarChart3,
  "/history": History,
  "/clients": Users,
  "/receivables": CircleDollarSign,
  "/employees": Users,
  "/ai-payroll": ScanSearch,
  "/expenses": ReceiptText,
  "/income": CircleDollarSign,
  "/production": Factory,
  "/inventory": Boxes,
  "/reports": FileSpreadsheet,
};

export function AppNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navigationItems.filter((item) => item.roles.includes(role));
  const mobilePrimaryItems = useMemo(() => {
    const primaryHrefs =
      role === UserRole.ADMIN
        ? ["/dashboard", "/quick", "/income", "/expenses"]
        : ["/quick", "/income", "/expenses", "/production"];

    return primaryHrefs
      .map((href) => items.find((item) => item.href === href))
      .filter(Boolean) as typeof items;
  }, [items, role]);
  const mobileMoreItems = items.filter(
    (item) => !mobilePrimaryItems.some((primaryItem) => primaryItem.href === item.href),
  );

  return (
    <>
      <nav className="hidden md:flex md:flex-col md:gap-2">
        {items.map((item) => {
          const Icon = icons[item.href as keyof typeof icons] || CircleHelp;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-teal-700 text-white"
                  : "text-slate-700 hover:bg-white/70",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] md:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="glass-panel absolute inset-x-4 bottom-24 rounded-[28px] p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2">
              {mobileMoreItems.map((item) => {
                const Icon = icons[item.href as keyof typeof icons] || CircleHelp;
                const active = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition",
                      active ? "bg-teal-700 text-white" : "bg-white/70 text-slate-700",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="glass-panel fixed inset-x-3 bottom-3 z-50 rounded-[24px] p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryItems.map((item) => {
            const Icon = icons[item.href as keyof typeof icons] || CircleHelp;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-bold transition",
                  active
                    ? "bg-teal-700 text-white"
                    : "text-slate-600 hover:bg-white/80",
                )}
              >
                <Icon className="mb-1 h-5 w-5" />
                <span className="max-w-full truncate text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-bold transition",
              menuOpen ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-white/80",
            )}
          >
            <Menu className="mb-1 h-5 w-5" />
            <span>Mas</span>
          </button>
        </div>
      </nav>
    </>
  );
}
