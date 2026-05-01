"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  async function updatePayment(markPaid: boolean) {
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
    setLoading(null);

    if (!response.ok) {
      setError(result.error || "No se pudo actualizar el pago.");
      return;
    }

    router.refresh();
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
