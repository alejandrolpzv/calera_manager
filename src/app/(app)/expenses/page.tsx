import { requireSession } from "@/lib/auth";
import { ActivityCard } from "@/components/activity-card";
import { ExpenseForm } from "@/components/forms/expense-form";
import { PageHeader } from "@/components/page-header";
import { canManageRecords } from "@/lib/permissions";
import { toInputDate } from "@/lib/utils";
import { getEmployees, getExpenseById, getRecentActivity } from "@/server/services/factory";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : undefined;
  const canManage = canManageRecords(session.role);
  const [activity, initialValues, employees] = await Promise.all([
    getRecentActivity(),
    canManage && editId ? getExpenseById(editId) : Promise.resolve(null),
    getEmployees(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Costos diarios"
        title="Registrar gastos"
        description="Flujo rapido para operadores al registrar diesel, planilla, transporte, materia prima y otros costos diarios."
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <ExpenseForm
          defaultDate={toInputDate(new Date())}
          initialValues={initialValues}
          employees={employees}
        />
        <ActivityCard
          title="Ultimos gastos registrados"
          rows={activity.expenses}
          type="expense"
          canManage={canManage}
        />
      </div>
    </>
  );
}
