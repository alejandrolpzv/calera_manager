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
    teal: "from-teal-700/15 to-transparent text-teal-900",
    amber: "from-amber-500/20 to-transparent text-amber-900",
    slate: "from-slate-500/15 to-transparent text-slate-900",
  };

  const content = (
    <Card
      className={`metric-gradient overflow-hidden p-5 transition ${href ? "hover:-translate-y-0.5 hover:ring-2 hover:ring-teal-200" : ""}`}
    >
      <div className={`mb-6 h-20 rounded-3xl bg-gradient-to-br ${accentStyles[accent]}`} />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-3xl font-extrabold text-slate-950">
          {tone === "currency" ? formatCurrency(value) : formatNumber(value)}
        </p>
        {trend ? (
          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <AccentIcon className="mr-1 h-3 w-3" />
            {trend === "up" ? "sube" : "baja"}
          </span>
        ) : null}
      </div>
      {href ? <p className="mt-4 text-xs font-semibold text-teal-700">Ver resumen</p> : null}
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
