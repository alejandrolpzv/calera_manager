import { ExpenseCategory, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const requiredNumber = z.coerce.number().positive("Must be greater than zero.");
const optionalTrimmedString = z.string().trim().optional().or(z.literal(""));

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const payrollLineSchema = z.object({
  employeeId: optionalTrimmedString.default(""),
  employeeName: optionalTrimmedString.default(""),
  workDays: z.coerce.number().min(0).optional().default(0),
  dailySalary: z.coerce.number().min(0).optional().default(0),
  bonuses: z.coerce.number().min(0).optional().default(0),
  deductions: z.coerce.number().min(0).optional().default(0),
  amount: z.coerce.number().min(0, "Must be zero or greater."),
  notes: optionalTrimmedString,
}).superRefine((data, ctx) => {
  if (!data.employeeId && !data.employeeName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["employeeName"],
      message: "Selecciona un empleado o escribe su nombre.",
    });
  }
});

export const rawMaterialLineSchema = z.object({
  materialName: z.string().trim().min(2).max(80).default("Piedra"),
  trips: z.coerce.number().min(0.01, "Debe ser mayor que cero."),
  poundsPerTrip: z.coerce.number().min(1, "Debe ser mayor que cero.").default(11000),
  notes: optionalTrimmedString,
});

export const expenseSchema = z.object({
  date: z.string().min(1),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().min(3).max(180),
  amount: requiredNumber,
  payrollLines: z.array(payrollLineSchema).optional().default([]),
  rawMaterialLines: z.array(rawMaterialLineSchema).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.category === ExpenseCategory.PLANILLA) {
    if (data.payrollLines.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payrollLines"],
        message: "Agrega al menos un empleado en la planilla.",
      });
      return;
    }

    const payrollTotal = data.payrollLines.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(payrollTotal - data.amount) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "El total debe coincidir con la suma de la planilla.",
      });
    }
  }

  if (data.category !== ExpenseCategory.MATERIA_PRIMA && data.rawMaterialLines.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rawMaterialLines"],
      message: "El desglose de piedra solo aplica a gastos de materia prima.",
    });
  }
});

export const productSchema = z.object({
  name: z.string().min(2).max(100),
  unitType: z.string().min(2).max(60),
  standardUnitCost: z.coerce.number().min(0).optional().default(0),
});

export const employeeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  roleLabel: optionalTrimmedString,
  dailySalary: requiredNumber,
  isActive: z.boolean().optional().default(true),
});

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: optionalTrimmedString,
  rtn: optionalTrimmedString,
  address: optionalTrimmedString,
  notes: optionalTrimmedString,
  isActive: z.boolean().optional().default(true),
});

export const incomeLineSchema = z.object({
  productId: optionalTrimmedString.default(""),
  productName: optionalTrimmedString.default(""),
  quantity: requiredNumber,
  pricePerUnit: requiredNumber,
  estimatedUnitCost: z.coerce.number().min(0).optional().default(0),
}).superRefine((data, ctx) => {
  if (!data.productId && !data.productName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["productName"],
      message: "Selecciona un producto o escribe uno nuevo.",
    });
  }
});

export const incomeSchema = z.object({
  date: z.string().min(1),
  referenceCode: optionalTrimmedString,
  sourceApp: optionalTrimmedString,
  invoiceNumber: optionalTrimmedString,
  clientName: z.string().min(2).max(120),
  amountPaid: z.coerce.number().min(0).optional().default(0),
  dueDate: optionalTrimmedString,
  paymentStatus: z.nativeEnum(PaymentStatus).optional().default(PaymentStatus.PENDING),
  paymentNotes: optionalTrimmedString,
  comprobanteUrl: optionalTrimmedString,
  allowInvoiceCreation: z.boolean().optional().default(false),
  lines: z.array(incomeLineSchema).min(1, "Agrega al menos un producto."),
}).superRefine((data, ctx) => {
  const total = data.lines.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);

  if (data.amountPaid > total + 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["amountPaid"],
      message: "El monto pagado no puede ser mayor al total de la venta.",
    });
  }
});

export const incomePaymentSchema = z.object({
  amountPaid: z.coerce.number().min(0),
  paymentNotes: optionalTrimmedString,
  markPaid: z.boolean().optional().default(false),
});

export const productionSchema = z.object({
  date: z.string().min(1),
  productId: z.string().min(1),
  quantity: requiredNumber,
  notes: z.string().max(240).optional().or(z.literal("")),
});

export const reportRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});
