"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";

type PaymentActionsProps = {
  incomeId: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
};

export function PaymentActions({
  incomeId,
  total,
  amountPaid,
  balanceDue,
}: PaymentActionsProps) {
  const router = useRouter();
  const [paymentAmount, setPaymentAmount] = useState(String(balanceDue));
  const [paymentNotes, setPaymentNotes] = useState("");
  const [loading, setLoading] = useState<"partial" | "paid" | null>(null);
  const [error, setError] = useState("");
  const [settled, setSettled] = useState(false);
  const savingRef = useRef(false);

  async function updatePayment(markPaid: boolean) {
    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setError("");
    setLoading(markPaid ? "paid" : "partial");

    const amountToAdd = Number(paymentAmount);
    const nextAmountPaid = markPaid ? total : amountPaid + (Number.isFinite(amountToAdd) ? amountToAdd : 0);

    const response = await fetch(`/api/income/${incomeId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountPaid: nextAmountPaid,
        paymentNotes,
        markPaid,
      }),
    });
    const result = await response.json();
    savingRef.current = false;
    setLoading(null);

    if (!response.ok) {
      setError(result.error || "No se pudo actualizar el pago.");
      return;
    }

    setSettled(true);
    startTransition(() => router.refresh());
  }

  if (settled) {
    return (
      <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm font-semibold text-teal-800">
        Pago actualizado. La lista se esta refrescando...
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white bg-white/80 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor={`payment-${incomeId}`}>Abono recibido</Label>
          <Input
            id={`payment-${incomeId}`}
            type="number"
            min="0"
            max={balanceDue}
            step="0.01"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-slate-500">
            Saldo pendiente: {formatCurrency(balanceDue)}
          </p>
        </div>
        <div>
          <Label htmlFor={`payment-notes-${incomeId}`}>Nota de pago</Label>
          <Input
            id={`payment-notes-${incomeId}`}
            value={paymentNotes}
            onChange={(event) => setPaymentNotes(event.target.value)}
            placeholder="Banco, efectivo, transferencia..."
          />
        </div>
        <div className="grid gap-2 sm:min-w-44">
          <Button
            type="button"
            variant="secondary"
            onClick={() => updatePayment(false)}
            disabled={loading !== null || Number(paymentAmount) <= 0}
          >
            {loading === "partial" ? "Guardando..." : "Registrar abono"}
          </Button>
          <Button
            type="button"
            onClick={() => updatePayment(true)}
            disabled={loading !== null}
          >
            {loading === "paid" ? "Guardando..." : "Marcar pagada"}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
