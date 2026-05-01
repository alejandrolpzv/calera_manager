"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

const chartColors = ["#0f766e", "#14b8a6", "#f59e0b", "#f97316", "#475569", "#1d4ed8"];

function EmptyChart({ message = "No hay datos suficientes todavia." }: { message?: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-3xl bg-slate-50 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return <EmptyChart />;
  }

  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const segments = data.reduce<Array<{ item: { name: string; value: number }; dash: number; offset: number }>>(
    (acc, item) => {
      const previousOffset = acc.length
        ? acc[acc.length - 1].offset - (acc[acc.length - 1].item.value / total) * 100
        : 25;

      acc.push({
        item,
        dash: (item.value / total) * circumference,
        offset: previousOffset,
      });

      return acc;
    },
    [],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
      <svg viewBox="0 0 220 220" role="img" aria-label="Gastos por categoria" className="mx-auto h-56 w-56">
        <circle cx="110" cy="110" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="32" />
        {segments.map(({ item, dash, offset }, index) => (
          <circle
            key={`${item.name}-${index}`}
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={chartColors[index % chartColors.length]}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="32"
            transform="rotate(-90 110 110)"
          >
            <title>{`${item.name}: ${formatCurrency(item.value)}`}</title>
          </circle>
        ))}
        <text x="110" y="104" textAnchor="middle" className="fill-slate-500 text-xs font-semibold">
          Total
        </text>
        <text x="110" y="128" textAnchor="middle" className="fill-slate-950 text-lg font-black">
          {formatCurrency(total)}
        </text>
      </svg>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={`${item.name}-legend-${index}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: chartColors[index % chartColors.length] }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="font-bold text-slate-950">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarComparisonChart({
  data,
}: {
  data: Array<{ label: string; income: number; expenses: number }>;
}) {
  const activeData = data.filter((item) => item.income > 0 || item.expenses > 0);
  const maxValue = Math.max(...data.map((item) => Math.max(item.income, item.expenses)), 0);

  if (!maxValue) {
    return <EmptyChart />;
  }

  return (
    <div className="h-72 overflow-x-auto pb-2">
      <div className="flex h-full min-w-[560px] items-end gap-3 border-b border-slate-200 px-1">
        {data.map((item, index) => {
          const incomeHeight = Math.max(4, (item.income / maxValue) * 210);
          const expensesHeight = Math.max(4, (item.expenses / maxValue) * 210);

          return (
            <div key={`${item.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-[220px] items-end gap-1.5">
                <div
                  className="w-4 rounded-t-xl bg-teal-700"
                  style={{ height: item.income ? incomeHeight : 0 }}
                  title={`Cobros ${item.label}: ${formatCurrency(item.income)}`}
                />
                <div
                  className="w-4 rounded-t-xl bg-amber-500"
                  style={{ height: item.expenses ? expensesHeight : 0 }}
                  title={`Gastos ${item.label}: ${formatCurrency(item.expenses)}`}
                />
              </div>
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-teal-700" />
          Cobros
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500" />
          Gastos
        </span>
        <span className="ml-auto text-xs text-slate-400">{activeData.length} dias con movimiento</span>
      </div>
    </div>
  );
}

function LineTrendChart({ data }: { data: Array<{ label: string; production: number }> }) {
  const maxValue = Math.max(...data.map((item) => item.production), 0);

  if (!maxValue) {
    return <EmptyChart />;
  }

  const width = 900;
  const height = 260;
  const paddingX = 34;
  const paddingY = 28;
  const step = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = paddingX + step * index;
    const y = height - paddingY - (item.production / maxValue) * (height - paddingY * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="overflow-x-auto pb-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Produccion en el tiempo"
        className="h-72 min-w-[760px]"
      >
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e2e8f0" />
        <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="#e2e8f0" />
        <path d={path} fill="none" stroke="#1d4ed8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="6" fill="#1d4ed8">
              <title>{`${point.label}: ${formatNumber(point.production)}`}</title>
            </circle>
            <text x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-500 text-xs">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DashboardCharts({
  expensesByCategory,
  incomeVsExpenses,
  productionOverTime,
}: {
  expensesByCategory: Array<{ name: string; value: number }>;
  incomeVsExpenses: Array<{ label: string; income: number; expenses: number }>;
  productionOverTime: Array<{ label: string; production: number }>;
}) {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1.1fr_1fr]">
      <Card className="min-w-0 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-950">Gastos por categoria</h3>
          <p className="text-sm text-slate-500">Distribucion mensual de costos para control rapido.</p>
        </div>
        <DonutChart data={expensesByCategory} />
      </Card>

      <Card className="min-w-0 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-950">Cobros vs gastos</h3>
          <p className="text-sm text-slate-500">Movimiento de caja de los ultimos 14 dias.</p>
        </div>
        <BarComparisonChart data={incomeVsExpenses} />
      </Card>

      <Card className="min-w-0 p-5 xl:col-span-2">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-950">Produccion en el tiempo</h3>
          <p className="text-sm text-slate-500">Tendencia de salida diaria en los ultimos 14 dias.</p>
        </div>
        <LineTrendChart data={productionOverTime} />
      </Card>
    </div>
  );
}
