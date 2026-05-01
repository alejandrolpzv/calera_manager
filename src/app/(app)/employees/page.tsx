import { requireAdmin } from "@/lib/auth";
import { EmployeeForm } from "@/components/forms/employee-form";
import { PageHeader } from "@/components/page-header";
import { RecordRowActions } from "@/components/record-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getEmployeeById, getEmployees } from "@/server/services/factory";

type EmployeeListItem = Awaited<ReturnType<typeof getEmployees>>[number];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : undefined;
  const [employees, initialValues] = await Promise.all([
    getEmployees(),
    editId ? getEmployeeById(editId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Catalogo base"
        title="Empleados"
        description="Administra los empleados para registrar la planilla con orden, evitar nombres duplicados y mantener mejores reportes."
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <EmployeeForm initialValues={initialValues} />

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Catalogo actual</h3>
              <p className="mt-2 text-sm text-slate-500">
                Usa activos para planilla diaria e inactivos para conservar historial.
              </p>
            </div>
            <Badge>{employees.length} empleados</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {employees.length ? (
              employees.map((employee: EmployeeListItem) => (
                <div
                  key={employee.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{employee.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {employee.roleLabel || "Sin puesto asignado"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        Salario por dia: L {employee.dailySalary.toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        employee.isActive
                          ? "bg-teal-100 text-teal-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {employee.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <RecordRowActions
                    editId={employee.id}
                    editBasePath="/employees"
                    deleteEndpoint={`/api/employees/${employee.id}`}
                  />
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Todavia no hay empleados en el catalogo. Agrega el primero para usarlo en planilla.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
