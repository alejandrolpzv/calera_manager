import { UserRole } from "@prisma/client";

export const expenseCategoryOptions = [
  { value: "MATERIA_PRIMA", label: "Materia prima" },
  { value: "DIESEL", label: "Diesel" },
  { value: "PLANILLA", label: "Planilla" },
  { value: "REPUESTOS", label: "Repuestos" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "LUZ", label: "Luz" },
  { value: "COMIDA", label: "Comida" },
  { value: "VARIOS", label: "Varios" },
] as const;

export const expenseCategoryLabels = Object.fromEntries(
  expenseCategoryOptions.map((option) => [option.value, option.label]),
) as Record<string, string>;

export const roleLabels = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
} as const;

export const navigationItems = [
  { href: "/quick", label: "Rapido", roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/dashboard", label: "Panel", roles: [UserRole.ADMIN] },
  { href: "/history", label: "Historial", roles: [UserRole.ADMIN] },
  { href: "/clients", label: "Clientes", roles: [UserRole.ADMIN] },
  { href: "/receivables", label: "Cobros", roles: [UserRole.ADMIN] },
  { href: "/employees", label: "Empleados", roles: [UserRole.ADMIN] },
  { href: "/ai-payroll", label: "IA Planilla", roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/expenses", label: "Gasto", roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/income", label: "Ingreso", roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/production", label: "Produccion", roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/inventory", label: "Inventario", roles: [UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/reports", label: "Reportes", roles: [UserRole.ADMIN] },
] satisfies Array<{ href: string; label: string; roles: UserRole[] }>;

export const appName = "Sistema de Fabrica";
