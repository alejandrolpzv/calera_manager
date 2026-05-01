"use client";

import { UserRole } from "@prisma/client";
import { BarChart3, Boxes, CircleDollarSign, CircleHelp, Factory, FileSpreadsheet, History, ReceiptText, ScanSearch, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/lib/constants";
import { cn } from "@/lib/utils";

const icons = {
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
  const items = navigationItems.filter((item) => item.roles.includes(role));

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

      <nav className="glass-panel fixed inset-x-4 bottom-4 z-40 rounded-[24px] p-2 md:hidden">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const Icon = icons[item.href as keyof typeof icons] || CircleHelp;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl px-1 py-2 text-[11px] font-semibold transition",
                  active
                    ? "bg-teal-700 text-white"
                    : "text-slate-600 hover:bg-white/80",
                )}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span className="text-center leading-tight">{item.label.replace("Add ", "")}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
