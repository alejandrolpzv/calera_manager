"use client";

import { useRouter } from "next/navigation";
import { ScanSearch, Upload, WandSparkles } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";

type PayrollParseResult = {
  summary: string;
  warnings: string[];
  payrollLines: Array<{
    employeeName: string;
    amount: number;
    notes: string;
  }>;
};

export function PayrollAiPanel() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PayrollParseResult | null>(null);

  const total = useMemo(
    () => result?.payrollLines.reduce((sum, item) => sum + item.amount, 0) || 0,
    [result],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Selecciona una foto de la planilla para analizar.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const body = new FormData();
    body.append("image", file);
    body.append("context", context);

    const response = await fetch("/api/ai/payroll", {
      method: "POST",
      body,
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "No se pudo analizar la imagen.");
      return;
    }

    setResult(data.result);
  }

  function sendToExpenses() {
    if (!result) {
      return;
    }

    window.sessionStorage.setItem(
      "aiPayrollDraft",
      JSON.stringify({
        description: result.summary,
        payrollLines: result.payrollLines,
      }),
    );

    router.push("/expenses");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
            <ScanSearch className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-950">Leer planilla con IA</h3>
            <p className="mt-1 text-sm text-slate-500">
              Sube una foto clara y la IA intentara separar empleados, montos y notas.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="payroll-image">Foto de la planilla</Label>
            <Input
              id="payroll-image"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <p className="mt-2 text-xs text-slate-500">
              Funciona mejor con fotos rectas, bien iluminadas y donde se vean nombres y montos.
            </p>
          </div>

          <div>
            <Label htmlFor="payroll-context">Contexto opcional</Label>
            <Input
              id="payroll-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Ejemplo: esta hoja incluye bonos y medias jornadas"
            />
          </div>

          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Analizando..." : "Analizar foto"}
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-950">Desglose detectado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Revisa los resultados antes de mandarlos al gasto de planilla.
            </p>
          </div>
          {result ? (
            <Button type="button" onClick={sendToExpenses}>
              <WandSparkles className="mr-2 h-4 w-4" />
              Enviar a gastos
            </Button>
          ) : null}
        </div>

        {result ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Resumen</p>
              <p className="mt-2 text-sm text-slate-600">{result.summary}</p>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Total detectado: L {total.toFixed(2)}
              </p>
            </div>

            {result.warnings.length ? (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {result.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="space-y-3">
              {result.payrollLines.map((line, index) => (
                <div key={`${line.employeeName}-${index}`} className="rounded-[24px] border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{line.employeeName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {line.notes || "Sin notas adicionales"}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">L {line.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aqui aparecera el desglose cuando subas una imagen. Luego podras mandarlo directo a
            la seccion de gastos como planilla preliminar.
          </div>
        )}
      </Card>
    </div>
  );
}
