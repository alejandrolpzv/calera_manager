import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number;
  tone?: "currency" | "number";
  accent?: "teal" | "amber" | "slate";
  trend?: "up" | "down";
  href?: string;
};

export function StatCard({
  label,
  value,
  tone = "currency",
  accent = "teal",
  trend,
  href,
}: StatCardProps) {
  const AccentIcon = trend === "down" ? ArrowDown : ArrowUp;
  const accentStyles = {
    teal: "bg-teal-700",
    amber: "bg-amber-500",
    slate: "bg-slate-950",
  };

  const content = (
    <Card
      className={`metric-gradient control-ruler min-w-0 overflow-hidden p-4 pt-5 transition sm:p-5 sm:pt-6 ${href ? "hover:-translate-y-0.5 hover:ring-2 hover:ring-teal-200" : ""}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className={`h-3 w-12 rounded-full ${accentStyles[accent]}`} />
        {href ? <span className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">Abrir</span> : null}
      </div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <p className="min-w-0 break-words text-3xl font-black tracking-[-0.055em] text-slate-950 sm:text-4xl">
          {tone === "currency" ? formatCurrency(value) : formatNumber(value)}
        </p>
        {trend ? (
          <span className="inline-flex items-center rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
            <AccentIcon className="mr-1 h-3 w-3" />
            {trend === "up" ? "sube" : "baja"}
          </span>
        ) : null}
      </div>
      {href ? <p className="mt-4 text-sm font-black text-slate-950">Ver resumen</p> : null}
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block active:scale-[0.99]">
      {content}
    </Link>
  );
}
