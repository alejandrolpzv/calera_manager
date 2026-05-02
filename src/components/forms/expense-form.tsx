"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { expenseCategoryOptions } from "@/lib/constants";

type PayrollLine = {
  employeeId: string;
  employeeName: string;
  workDays: string;
  dailySalary: string;
  bonuses: string;
  deductions: string;
  amount: string;
  notes: string;
};

type InitialPayrollLine = {
  employeeId?: string;
  employeeName: string;
  workDays?: number;
  dailySalary?: number;
  bonuses?: number;
  deductions?: number;
  amount: number;
  notes: string;
};

type AiPayrollDraft = {
  description?: string;
  payrollLines: Array<{
    employeeName: string;
    amount: number;
    notes?: string;
  }>;
};

export function ExpenseForm({
  defaultDate,
  initialValues,
  employees,
}: {
  defaultDate: string;
  initialValues?: {
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    payrollLines?: InitialPayrollLine[];
  } | null;
  employees: Array<{
    id: string;
    name: string;
    roleLabel: string | null;
    dailySalary: number;
    isActive: boolean;
  }>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>(initialValues?.category || expenseCategoryOptions[0].value);
  const [manualAmount, setManualAmount] = useState<string>(
    initialValues ? String(initialValues.amount) : "",
  );
  const savingRef = useRef(false);
  const [payrollLines, setPayrollLines] = useState<PayrollLine[]>(
    initialValues?.payrollLines?.length
        ? initialValues.payrollLines.map((line) => ({
            employeeId: line.employeeId || "",
            employeeName: line.employeeName,
            workDays: String(line.workDays || 0),
            dailySalary: String(line.dailySalary || 0),
            bonuses: String(line.bonuses || 0),
            deductions: String(line.deductions || 0),
            amount: String(line.amount),
            notes: line.notes || "",
          }))
      : [{ employeeId: "", employeeName: "", workDays: "1", dailySalary: "", bonuses: "0", deductions: "0", amount: "", notes: "" }],
  );

  const isPayroll = category === "PLANILLA";
  const isEditing = Boolean(initialValues?.id);
  const payrollTotal = useMemo(
    () =>
      payrollLines.reduce((sum, line) => {
        const value = Number(line.amount);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [payrollLines],
  );

  function updatePayrollLine(index: number, field: keyof PayrollLine, value: string) {
    setPayrollLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function selectEmployee(index: number, employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);

    setPayrollLines((current) =>
      current.map((line, currentIndex) => {
        if (currentIndex !== index) {
          return line;
        }

        if (!employeeId || !employee) {
          return {
            ...line,
            employeeId: "",
            employeeName: line.employeeName,
          };
        }

        return {
          ...line,
          employeeId,
          employeeName: employee.name,
          dailySalary: String(employee.dailySalary),
          workDays: line.workDays || "1",
          amount:
            String(
              (Number(line.workDays || 1) || 1) * employee.dailySalary +
                (Number(line.bonuses) || 0) -
                (Number(line.deductions) || 0),
            ),
        };
      }),
    );
  }

  function addPayrollLine() {
    setPayrollLines((current) => [
      ...current,
      { employeeId: "", employeeName: "", workDays: "1", dailySalary: "", bonuses: "0", deductions: "0", amount: "", notes: "" },
    ]);
  }

  function recalculatePayrollLine(line: PayrollLine) {
    const workDays = Number(line.workDays) || 0;
    const dailySalary = Number(line.dailySalary) || 0;
    const bonuses = Number(line.bonuses) || 0;
    const deductions = Number(line.deductions) || 0;

    return {
      ...line,
      amount: String(Math.max(0, workDays * dailySalary + bonuses - deductions)),
    };
  }

  function removePayrollLine(index: number) {
    setPayrollLines((current) =>
      current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  useEffect(() => {
    if (typeof window === "undefined" || isEditing || initialValues) {
      return;
    }

    const rawDraft = window.sessionStorage.getItem("aiPayrollDraft");
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as AiPayrollDraft;
      if (!Array.isArray(draft.payrollLines) || draft.payrollLines.length === 0) {
        return;
      }

      const nextLines = draft.payrollLines.map((line) => {
        const matchedEmployee = employees.find(
          (employee) => employee.name.trim().toLowerCase() === line.employeeName.trim().toLowerCase(),
        );

        return {
          employeeId: matchedEmployee?.id || "",
          employeeName: line.employeeName,
          workDays: "1",
          dailySalary: matchedEmployee ? String(matchedEmployee.dailySalary) : "0",
          bonuses: "0",
          deductions: "0",
          amount: String(line.amount),
          notes: line.notes || "",
        };
      });

      const frameId = window.requestAnimationFrame(() => {
        setCategory("PLANILLA");
        setPayrollLines(nextLines);
      });

      window.sessionStorage.removeItem("aiPayrollDraft");
      return () => window.cancelAnimationFrame(frameId);
    } catch {
      window.sessionStorage.removeItem("aiPayrollDraft");
    }
  }, [employees, initialValues, isEditing]);

  return (
    <Card className="p-5">
      <h3 className="text-xl font-bold text-slate-950">
        {isEditing ? "Editar gasto" : "Nuevo gasto"}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        {isEditing
          ? "Actualiza la informacion del gasto y guarda los cambios."
          : "Captura rapida para costos diarios de planta."}
      </p>

      <form
        className="mt-6 space-y-4"
        action={async (formData) => {
          if (savingRef.current) {
            return;
          }

          savingRef.current = true;
          setLoading(true);
          setError("");
          setSuccess("");

          const response = await fetch(isEditing ? `/api/expenses/${initialValues?.id}` : "/api/expenses", {
            method: isEditing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: formData.get("date"),
              category: formData.get("category"),
              description: formData.get("description"),
              amount: isPayroll ? payrollTotal : manualAmount,
              payrollLines: isPayroll
                ? payrollLines
                    .filter((line) => (line.employeeId || line.employeeName.trim()) && Number(line.amount) > 0)
                    .map((line) => ({
                      employeeId: line.employeeId || undefined,
                      employeeName: line.employeeId
                        ? employees.find((employee) => employee.id === line.employeeId)?.name || ""
                        : line.employeeName.trim(),
                      workDays: Number(line.workDays),
                      dailySalary: Number(line.dailySalary),
                      bonuses: Number(line.bonuses),
                      deductions: Number(line.deductions),
                      amount: Number(line.amount),
                      notes: line.notes.trim(),
                    }))
                : [],
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            setError(result.error || "No se pudo guardar el gasto.");
            savingRef.current = false;
            setLoading(false);
            return;
          }

          setSuccess(isEditing ? "Gasto actualizado." : "Gasto guardado.");
          if (isEditing) {
            router.replace("/expenses");
          }
          router.refresh();
          savingRef.current = false;
          setLoading(false);
        }}
      >
        <div>
          <Label htmlFor="expense-date">Fecha</Label>
          <Input
            id="expense-date"
            name="date"
            type="date"
            defaultValue={initialValues?.date || defaultDate}
            required
          />
        </div>

        <div>
          <Label htmlFor="expense-category">Categoria</Label>
          <Select
            id="expense-category"
            name="category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {expenseCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="expense-description">Descripcion</Label>
          <Input
            id="expense-description"
            name="description"
            placeholder={isPayroll ? "Resumen de la planilla del dia o periodo" : "Nota corta del gasto"}
            defaultValue={initialValues?.description || ""}
            required
          />
        </div>

        {isPayroll ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-700" />
                <div>
                  <p className="font-semibold text-slate-900">Desglose por empleado</p>
                  <p className="text-sm text-slate-500">
                    Agrega cada pago usando el catalogo o escribe un nombre manual si hace falta.
                  </p>
                </div>
              </div>
              <Button type="button" variant="secondary" className="px-3 py-2" onClick={addPayrollLine}>
                <Plus className="mr-1 h-4 w-4" />
                Empleado
              </Button>
            </div>

            <div className="space-y-3">
              {payrollLines.map((line, index) => (
                <div key={`payroll-line-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor={`employee-name-${index}`}>Empleado</Label>
                      <Select
                        id={`employee-name-${index}`}
                        value={line.employeeId}
                        onChange={(event) => selectEmployee(index, event.target.value)}
                      >
                        <option value="">Escribir nombre manualmente</option>
                        {employees
                          .filter((employee) => employee.isActive || employee.id === line.employeeId)
                          .map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                              {employee.roleLabel ? ` - ${employee.roleLabel}` : ""}
                            </option>
                          ))}
                      </Select>
                      {!line.employeeId ? (
                        <Input
                          className="mt-2"
                          value={line.employeeName}
                          onChange={(event) =>
                            updatePayrollLine(index, "employeeName", event.target.value)
                          }
                          placeholder="Nombre del empleado"
                        />
                      ) : null}
                    </div>

                    <div>
                      <Label htmlFor={`employee-amount-${index}`}>Monto</Label>
                      <Input
                        id={`employee-amount-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.amount}
                        onChange={(event) =>
                          updatePayrollLine(index, "amount", event.target.value)
                        }
                        placeholder="0.00"
                      />
                      {line.employeeId ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Salario diario sugerido: L{" "}
                          {(
                            employees.find((employee) => employee.id === line.employeeId)?.dailySalary || 0
                          ).toFixed(2)}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`employee-days-${index}`}>Dias trabajados</Label>
                        <Input
                          id={`employee-days-${index}`}
                          type="number"
                          min="0"
                          step="0.5"
                          value={line.workDays}
                          onChange={(event) =>
                            setPayrollLines((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === index
                                  ? recalculatePayrollLine({ ...item, workDays: event.target.value })
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`employee-salary-${index}`}>Salario por dia</Label>
                        <Input
                          id={`employee-salary-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.dailySalary}
                          onChange={(event) =>
                            setPayrollLines((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === index
                                  ? recalculatePayrollLine({ ...item, dailySalary: event.target.value })
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`employee-bonus-${index}`}>Bonos</Label>
                        <Input
                          id={`employee-bonus-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.bonuses}
                          onChange={(event) =>
                            setPayrollLines((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === index
                                  ? recalculatePayrollLine({ ...item, bonuses: event.target.value })
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`employee-deduction-${index}`}>Deducciones</Label>
                        <Input
                          id={`employee-deduction-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.deductions}
                          onChange={(event) =>
                            setPayrollLines((current) =>
                              current.map((item, currentIndex) =>
                                currentIndex === index
                                  ? recalculatePayrollLine({ ...item, deductions: event.target.value })
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`employee-notes-${index}`}>Notas</Label>
                      <Input
                        id={`employee-notes-${index}`}
                        value={line.notes}
                        onChange={(event) => updatePayrollLine(index, "notes", event.target.value)}
                        placeholder="Puesto, semana, bono u observacion"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2 py-2 text-red-700"
                      onClick={() => removePayrollLine(index)}
                      disabled={payrollLines.length === 1}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <Label htmlFor="expense-amount">
            {isPayroll ? "Total de planilla (Lempiras)" : "Monto (Lempiras)"}
          </Label>
          <Input
            id="expense-amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={isPayroll ? payrollTotal.toFixed(2) : manualAmount}
            onChange={(event) => setManualAmount(event.target.value)}
            readOnly={isPayroll}
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-teal-700">{success}</p> : null}

        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar gasto"}
          </Button>
          {isEditing ? (
            <Link
              href="/expenses"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Cancelar edicion
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
