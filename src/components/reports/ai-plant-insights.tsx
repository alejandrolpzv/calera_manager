"use client";

import { useState, useTransition } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PlantInsights = {
  executiveSummary: string;
  financialOpinion: string;
  costOpinion: string;
  operationalOpinion: string;
  risks: string[];
  opportunities: string[];
  recommendedActions: string[];
};

export function AiPlantInsights({ from, to }: { from: string; to: string }) {
  const [insights, setInsights] = useState<PlantInsights | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function generateInsights() {
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/plant-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "No se pudo generar el analisis.");
        }

        setInsights(data.result);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo generar el analisis.",
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
            Analista IA
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-slate-950">
            Opinion sobre costos, ingresos y operacion
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Genera una lectura ejecutiva del rango actual con riesgos, oportunidades y
            acciones recomendadas. No reemplaza tu criterio, pero ayuda a detectar
            patrones rapido.
          </p>
        </div>
        <Button
          type="button"
          onClick={generateInsights}
          disabled={isPending}
          className="min-h-12 w-full lg:w-auto"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
          {isPending ? "Analizando..." : "Generar opinion IA"}
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {insights ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <div className="rounded-[28px] bg-slate-950 p-4 text-white xl:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Diagnostico ejecutivo
            </p>
            <p className="mt-3 text-base leading-7">{insights.executiveSummary}</p>
          </div>

          <OpinionBlock title="Finanzas" text={insights.financialOpinion} />
          <OpinionBlock title="Costos" text={insights.costOpinion} />
          <OpinionBlock title="Operacion" text={insights.operationalOpinion} />

          <InsightList title="Riesgos" items={insights.risks} tone="risk" />
          <InsightList title="Oportunidades" items={insights.opportunities} tone="opportunity" />
          <InsightList title="Acciones recomendadas" items={insights.recommendedActions} tone="action" />
        </div>
      ) : null}
    </Card>
  );
}

function OpinionBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] bg-white/80 p-4">
      <h4 className="font-extrabold text-slate-950">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "risk" | "opportunity" | "action";
}) {
  const toneClass =
    tone === "risk"
      ? "bg-amber-50 text-amber-900"
      : tone === "opportunity"
        ? "bg-teal-50 text-teal-900"
        : "bg-slate-100 text-slate-900";

  return (
    <div className={`rounded-[28px] p-4 ${toneClass}`}>
      <h4 className="font-extrabold">{title}</h4>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <p key={item} className="rounded-2xl bg-white/70 p-3 text-sm leading-5">
              {item}
            </p>
          ))
        ) : (
          <p className="text-sm">Sin hallazgos relevantes.</p>
        )}
      </div>
    </div>
  );
}
