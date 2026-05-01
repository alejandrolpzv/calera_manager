import { ExpenseCategory, PaymentStatus, Prisma, UserRole } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

import { expenseCategoryLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  createLocalEmployee,
  createLocalExpense,
  createLocalIncome,
  createLocalClient,
  createLocalProduction,
  createLocalProduct,
  deleteLocalProduct,
  deleteLocalEmployee,
  deleteLocalExpense,
  deleteLocalIncome,
  deleteLocalProduction,
  getLocalDashboardData,
  getLocalEmployeeById,
  getLocalEmployees,
  getLocalClientById,
  getLocalReceivables,
  getLocalExpenseById,
  getLocalHistoryData,
  getLocalIncomeById,
  getLocalInventorySnapshot,
  getLocalClients,
  getLocalProducts,
  getLocalProductionById,
  getLocalRecentActivity,
  getLocalReportData,
  shouldUseLocalStore,
  updateLocalEmployee,
  updateLocalExpense,
  updateLocalClient,
  updateLocalIncome,
  updateLocalIncomePayment,
  updateLocalProduction,
} from "@/server/services/local-store";

function asDate(value: string, end = false) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    const fallback = new Date(value);
    return end ? endOfDay(fallback) : startOfDay(fallback);
  }

  return end
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

type ProductWithInventory = Prisma.ProductGetPayload<{
  include: { inventory: true };
}>;

type EmployeeRecord = Prisma.EmployeeGetPayload<Record<string, never>>;

type ClientWithSales = Prisma.ClientGetPayload<{
  include: {
    incomes: {
      include: {
        lines: { include: { product: true } };
      };
      orderBy: { date: "desc" };
    };
  };
}>;

type InventoryWithProduct = Prisma.InventoryGetPayload<{
  include: { product: true };
}>;

type ExpenseWithCreatedByAndPayroll = Prisma.ExpenseGetPayload<{
  include: { createdBy: true; payrollLines: true };
}>;

type IncomeWithDetails = Prisma.IncomeGetPayload<{
  include: { createdBy: true; product: true; lines: { include: { product: true } } };
}>;

type ProductionWithCreatedByAndProduct = Prisma.ProductionGetPayload<{
  include: { createdBy: true; product: true };
}>;

type ExpenseCategoryGroup = {
  category: ExpenseCategory;
  _sum: { amount: Prisma.Decimal | null };
};

type PayrollInputLine = {
  employeeId?: string;
  employeeName: string;
  workDays?: number;
  dailySalary?: number;
  bonuses?: number;
  deductions?: number;
  amount: number;
  notes?: string;
};

type IncomeInputLine = {
  productId?: string;
  productName?: string;
  quantity: number;
  pricePerUnit: number;
};

function normalizePayment(total: number, amountPaid = 0, requestedStatus?: PaymentStatus) {
  const safeTotal = Math.max(0, total);
  let safePaid = Math.min(Math.max(0, amountPaid), safeTotal);

  if (requestedStatus === PaymentStatus.PAID) {
    safePaid = safeTotal;
  }

  if (requestedStatus === PaymentStatus.PENDING && safePaid <= 0) {
    return {
      amountPaid: safePaid,
      paymentStatus: PaymentStatus.PENDING,
    };
  }

  return {
    amountPaid: safePaid,
    paymentStatus:
      safePaid >= safeTotal
        ? PaymentStatus.PAID
        : safePaid > 0
          ? PaymentStatus.PARTIAL
          : PaymentStatus.PENDING,
  };
}

function summarizeIncomeLines(
  lines: Array<{
    productName: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
    productId?: string;
    id?: string;
  }>,
) {
  return {
    productName: lines.map((line) => line.productName).join(", "),
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

async function resolveIncomeLineForDb(
  tx: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  line: IncomeInputLine,
  allowInvoiceCreation: boolean,
) {
  let product =
    line.productId
      ? await tx.product.findUnique({
          where: { id: line.productId },
          include: { inventory: true },
        })
      : null;

  if (!product && line.productName) {
    product = await tx.product.findFirst({
      where: { name: { equals: line.productName.trim(), mode: "insensitive" } },
      include: { inventory: true },
    });
  }

  if (!product && allowInvoiceCreation && line.productName?.trim()) {
    product = await tx.product.create({
      data: {
        name: line.productName.trim(),
        unitType: "Unidades",
        inventory: {
          create: {
            quantity: new Prisma.Decimal(0),
          },
        },
      },
      include: { inventory: true },
    });
  }

  if (!product) {
    throw new Error(
      line.productName
        ? `El producto "${line.productName}" no existe en el catalogo.`
        : "Debes seleccionar un producto valido.",
    );
  }

  let inventory = product.inventory;
  if (!inventory) {
    inventory = await tx.inventory.create({
      data: {
        productId: product.id,
        quantity: new Prisma.Decimal(0),
      },
    });
  }

  const quantity = new Prisma.Decimal(line.quantity);
  const pricePerUnit = new Prisma.Decimal(line.pricePerUnit);
  const shortfall = quantity.sub(inventory.quantity);

  if (shortfall.greaterThan(0)) {
    if (!allowInvoiceCreation) {
      throw new Error("No hay suficiente inventario disponible para esta venta.");
    }

    await tx.inventory.update({
      where: { productId: product.id },
      data: {
        quantity: { increment: shortfall },
      },
    });
  }

  return {
    productId: product.id,
    quantity,
    pricePerUnit,
    total: quantity.mul(pricePerUnit),
  };
}

async function resolveClientForDb(
  tx: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  clientData: {
    clientName: string;
    phone?: string;
    rtn?: string;
    address?: string;
    notes?: string;
  },
) {
  const normalizedName = clientData.clientName.trim();

  const existingClient = await tx.client.findFirst({
    where: { name: { equals: normalizedName, mode: "insensitive" } },
  });

  if (existingClient) {
    return tx.client.update({
      where: { id: existingClient.id },
      data: {
        phone: clientData.phone?.trim() || existingClient.phone,
        rtn: clientData.rtn?.trim() || existingClient.rtn,
        address: clientData.address?.trim() || existingClient.address,
        notes: clientData.notes?.trim() || existingClient.notes,
      },
    });
  }

  return tx.client.create({
    data: {
      name: normalizedName,
      phone: clientData.phone?.trim() || null,
      rtn: clientData.rtn?.trim() || null,
      address: clientData.address?.trim() || null,
      notes: clientData.notes?.trim() || null,
    },
  });
}

function sumByDate<T extends { date: Date }>(
  records: T[],
  getValue: (record: T) => number,
  days: Date[],
) {
  const map = new Map<string, number>();

  for (const day of days) {
    map.set(startOfDay(day).toISOString(), 0);
  }

  for (const record of records) {
    const key = startOfDay(record.date).toISOString();
    map.set(key, (map.get(key) || 0) + getValue(record));
  }

  return days.map((day) => ({
    date: startOfDay(day).toISOString(),
    label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: map.get(startOfDay(day).toISOString()) || 0,
  }));
}

async function getRangeTotals(from: Date, to: Date) {
  const [expenseAggregate, incomeAggregate, productionAggregate] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: from, lte: to } },
    }),
    prisma.income.aggregate({
      _sum: { total: true, amountPaid: true },
      where: { date: { gte: from, lte: to } },
    }),
    prisma.production.aggregate({
      _sum: { quantity: true },
      where: { date: { gte: from, lte: to } },
    }),
  ]);

  const totalExpenses = decimalToNumber(expenseAggregate._sum.amount);
  const totalSales = decimalToNumber(incomeAggregate._sum.total);
  const totalIncome = decimalToNumber(incomeAggregate._sum.amountPaid);
  const totalProduction = decimalToNumber(productionAggregate._sum.quantity);

  return {
    totalExpenses,
    totalIncome,
    totalSales,
    totalProduction,
    profit: totalIncome - totalExpenses,
    costPerUnit: totalProduction > 0 ? totalExpenses / totalProduction : 0,
  };
}

export async function getProducts() {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalProducts();
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { inventory: true },
  });

  return products.map((product: ProductWithInventory) => ({
    id: product.id,
    name: product.name,
    unitType: product.unitType,
    inventoryQuantity: decimalToNumber(product.inventory?.quantity),
  }));
}

export async function getEmployees() {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalEmployees();
  }

  const employees = await prisma.employee.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return employees.map((employee: EmployeeRecord) => ({
    ...employee,
    dailySalary: decimalToNumber(employee.dailySalary),
  }));
}

export async function getClients() {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalClients();
  }

  const clients = await prisma.client.findMany({
    include: {
      incomes: {
        include: {
          lines: { include: { product: true } },
        },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return clients.map((client: ClientWithSales) => ({
    id: client.id,
    name: client.name,
    phone: client.phone || "",
    rtn: client.rtn || "",
    address: client.address || "",
    notes: client.notes || "",
    isActive: client.isActive,
    salesCount: client.incomes.length,
    totalSales: client.incomes.reduce((sum, income) => sum + decimalToNumber(income.total), 0),
    totalPaid: client.incomes.reduce((sum, income) => sum + decimalToNumber(income.amountPaid), 0),
    totalPending: client.incomes.reduce(
      (sum, income) => sum + Math.max(0, decimalToNumber(income.total) - decimalToNumber(income.amountPaid)),
      0,
    ),
    lastSaleDate: client.incomes[0]?.date || null,
    recentSales: client.incomes.slice(0, 5).map((income) => ({
      id: income.id,
      date: income.date,
      total: decimalToNumber(income.total),
      amountPaid: decimalToNumber(income.amountPaid),
      balanceDue: Math.max(0, decimalToNumber(income.total) - decimalToNumber(income.amountPaid)),
      paymentStatus: income.paymentStatus,
      referenceCode: income.referenceCode,
      invoiceNumber: income.invoiceNumber,
      productName: income.lines.length
        ? income.lines.map((line) => line.product.name).join(", ")
        : "Sin lineas",
    })),
  }));
}

export async function getClientById(id: string) {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalClientById(id);
  }

  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    name: client.name,
    phone: client.phone || "",
    rtn: client.rtn || "",
    address: client.address || "",
    notes: client.notes || "",
    isActive: client.isActive,
  };
}

export async function createClient(data: {
  name: string;
  phone?: string;
  rtn?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}) {
  if (shouldUseLocalStore()) {
    return createLocalClient(data);
  }

  return prisma.client.create({
    data: {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      rtn: data.rtn?.trim() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateClient(
  id: string,
  data: {
    name: string;
    phone?: string;
    rtn?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
  },
) {
  if (shouldUseLocalStore()) {
    return updateLocalClient(id, data);
  }

  const existing = await prisma.client.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Cliente no encontrado.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedClient = await tx.client.update({
      where: { id },
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        rtn: data.rtn?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });

    if (updatedClient.name !== existing.name) {
      await tx.income.updateMany({
        where: { OR: [{ clientId: id }, { clientName: existing.name }] },
        data: { clientName: updatedClient.name },
      });
    }

    return updatedClient;
  });
}

export async function getReceivables() {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalReceivables();
  }

  const incomes = await prisma.income.findMany({
    where: {
      OR: [
        { paymentStatus: "PENDING" },
        { paymentStatus: "PARTIAL" },
      ],
    },
    orderBy: [{ dueDate: "asc" }, { date: "asc" }],
  });

  return incomes
    .map((income) => ({
      id: income.id,
      date: income.date,
      dueDate: income.dueDate,
      clientName: income.clientName,
      invoiceNumber: income.invoiceNumber || "",
      total: decimalToNumber(income.total),
      amountPaid: decimalToNumber(income.amountPaid),
      balanceDue: Math.max(0, decimalToNumber(income.total) - decimalToNumber(income.amountPaid)),
      paymentStatus: income.paymentStatus,
      referenceCode: income.referenceCode || "",
    }))
    .filter((income) => income.balanceDue > 0);
}

export async function getInventorySnapshot() {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalInventorySnapshot();
  }

  const inventory = await prisma.inventory.findMany({
    include: { product: true },
    orderBy: { product: { name: "asc" } },
  });

  return inventory.map((item: InventoryWithProduct) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    unitType: item.product.unitType,
    quantity: decimalToNumber(item.quantity),
    lastUpdated: item.lastUpdated,
  }));
}

export async function getRecentActivity() {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalRecentActivity();
  }

  const [expenses, incomes, productions] = await Promise.all([
    prisma.expense.findMany({
      take: 12,
      orderBy: { date: "desc" },
      include: { createdBy: true, payrollLines: true },
    }),
    prisma.income.findMany({
      take: 12,
      orderBy: { date: "desc" },
      include: { createdBy: true, product: true, lines: { include: { product: true } } },
    }),
    prisma.production.findMany({
      take: 12,
      orderBy: { date: "desc" },
      include: { createdBy: true, product: true },
    }),
  ]);

  return {
    expenses: expenses.map((expense: ExpenseWithCreatedByAndPayroll) => ({
      id: expense.id,
      date: expense.date,
      category: expenseCategoryLabels[expense.category],
      description: expense.description,
      amount: decimalToNumber(expense.amount),
      createdBy: expense.createdBy.name,
      payrollLines: expense.payrollLines.map((line: ExpenseWithCreatedByAndPayroll["payrollLines"][number]) => ({
        id: line.id,
        employeeName: line.employeeName,
        workDays: decimalToNumber(line.workDays),
        dailySalary: decimalToNumber(line.dailySalary),
        bonuses: decimalToNumber(line.bonuses),
        deductions: decimalToNumber(line.deductions),
        amount: decimalToNumber(line.amount),
        notes: line.notes,
      })),
    })),
    incomes: incomes.map((income: IncomeWithDetails) => {
      const lines = income.lines.length
        ? income.lines.map((line) => ({
            id: line.id,
            productId: line.productId,
            productName: line.product.name,
            quantity: decimalToNumber(line.quantity),
            pricePerUnit: decimalToNumber(line.pricePerUnit),
            total: decimalToNumber(line.total),
          }))
        : [
            {
              id: `${income.id}-legacy`,
              productId: income.productId,
              productName: income.product.name,
              quantity: decimalToNumber(income.quantity),
              pricePerUnit: decimalToNumber(income.pricePerUnit),
              total: decimalToNumber(income.total),
            },
          ];
      const summary = summarizeIncomeLines(lines);

      return {
        id: income.id,
        date: income.date,
        referenceCode: income.referenceCode,
        invoiceNumber: income.invoiceNumber,
        productName: summary.productName,
        quantity: summary.quantity,
        total: decimalToNumber(income.total),
        amountPaid: decimalToNumber(income.amountPaid),
        balanceDue: Math.max(0, decimalToNumber(income.total) - decimalToNumber(income.amountPaid)),
        paymentStatus: income.paymentStatus,
        clientName: income.clientName,
        lines,
        createdBy: income.createdBy.name,
      };
    }),
    productions: productions.map((production: ProductionWithCreatedByAndProduct) => ({
      id: production.id,
      date: production.date,
      productName: production.product.name,
      quantity: decimalToNumber(production.quantity),
      notes: production.notes,
      createdBy: production.createdBy.name,
    })),
  };
}

export async function getDashboardData() {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalDashboardData();
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const chartStart = subDays(now, 13);
  const chartDays = eachDayOfInterval({ start: chartStart, end: now });

  const [
    weekly,
    monthly,
    expenseCategoryGroups,
    recentExpenses,
    recentIncome,
    recentProduction,
    topClientGroups,
    topProductGroups,
    lowStockRaw,
    pendingReceivablesAggregate,
    pendingReceivablesCount,
  ] =
    await Promise.all([
      getRangeTotals(weekStart, now),
      getRangeTotals(monthStart, now),
      prisma.expense.groupBy({
        by: ["category"],
        _sum: { amount: true },
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.expense.findMany({
        where: { date: { gte: chartStart, lte: now } },
        orderBy: { date: "asc" },
      }),
      prisma.income.findMany({
        where: { date: { gte: chartStart, lte: now } },
        orderBy: { date: "asc" },
      }),
      prisma.production.findMany({
        where: { date: { gte: chartStart, lte: now } },
        orderBy: { date: "asc" },
      }),
      prisma.income.groupBy({
        by: ["clientName"],
        _sum: { total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),
      prisma.incomeLine.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.inventory.findMany({
        where: { quantity: { lte: 10 } },
        include: { product: true },
        orderBy: { quantity: "asc" },
        take: 5,
      }),
      prisma.income.aggregate({
        _sum: { total: true, amountPaid: true },
        where: { OR: [{ paymentStatus: "PENDING" }, { paymentStatus: "PARTIAL" }] },
      }),
      prisma.income.count({
        where: { OR: [{ paymentStatus: "PENDING" }, { paymentStatus: "PARTIAL" }] },
      }),
    ]);

  const expenseSeries = sumByDate<(typeof recentExpenses)[number]>(
    recentExpenses,
    (item) => decimalToNumber(item.amount),
    chartDays,
  );
  const incomeSeries = sumByDate<(typeof recentIncome)[number]>(
    recentIncome,
    (item) => decimalToNumber(item.amountPaid),
    chartDays,
  );
  const productionSeries = sumByDate<(typeof recentProduction)[number]>(
    recentProduction,
    (item) => decimalToNumber(item.quantity),
    chartDays,
  );

  return {
    weekly,
    monthly,
    expensesByCategory: expenseCategoryGroups.map((item: ExpenseCategoryGroup) => ({
      name: expenseCategoryLabels[item.category as ExpenseCategory],
      value: decimalToNumber(item._sum.amount),
    })),
    incomeVsExpenses: chartDays.map((_, index) => ({
      date: expenseSeries[index].date,
      label: expenseSeries[index].label,
      expenses: expenseSeries[index].value,
      income: incomeSeries[index].value,
    })),
    productionOverTime: productionSeries.map((item) => ({
      date: item.date,
      label: item.label,
      production: item.value,
    })),
    operational: {
      topClients: topClientGroups.map((item) => ({
        name: item.clientName,
        total: decimalToNumber(item._sum.total),
      })),
      topProducts: await Promise.all(
        topProductGroups.map(async (item) => {
          const product = await prisma.product.findUnique({ where: { id: item.productId } });
          return {
            name: product?.name || "Desconocido",
            quantity: decimalToNumber(item._sum.quantity),
          };
        }),
      ),
      lowStock: lowStockRaw.map((item) => ({
        productName: item.product.name,
        quantity: decimalToNumber(item.quantity),
        unitType: item.product.unitType,
      })),
      pendingReceivablesTotal:
        decimalToNumber(pendingReceivablesAggregate._sum.total) -
        decimalToNumber(pendingReceivablesAggregate._sum.amountPaid),
      pendingReceivablesCount,
    },
  };
}

type HistoryFilters = {
  from?: string;
  to?: string;
  type?: string;
  expenseCategory?: string;
  productId?: string;
  q?: string;
};

export async function getHistoryData(filters: HistoryFilters) {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalHistoryData(filters);
  }

  const from = filters.from ? asDate(filters.from) : undefined;
  const to = filters.to ? asDate(filters.to, true) : undefined;
  const q = filters.q?.trim() || undefined;

  const [expenses, income, production] = await Promise.all([
    filters.type === "income" || filters.type === "production"
      ? Promise.resolve([])
      : prisma.expense.findMany({
          where: {
            date: from || to ? { gte: from, lte: to } : undefined,
            category: filters.expenseCategory as ExpenseCategory | undefined,
            OR: q
              ? [
                  { description: { contains: q, mode: "insensitive" } },
                  {
                    payrollLines: {
                      some: {
                        employeeName: { contains: q, mode: "insensitive" },
                      },
                    },
                  },
                ]
              : undefined,
          },
          include: {
            createdBy: true,
            payrollLines: true,
          },
          orderBy: { date: "desc" },
        }),
    filters.type === "expense" || filters.type === "production"
      ? Promise.resolve([])
      : prisma.income.findMany({
          where: {
            date: from || to ? { gte: from, lte: to } : undefined,
            AND: filters.productId
              ? [
                  {
                    OR: [
                      { productId: filters.productId },
                      {
                        lines: {
                          some: {
                            productId: filters.productId,
                          },
                        },
                      },
                    ],
                  },
                ]
              : undefined,
            OR: q
              ? [
                  { clientName: { contains: q, mode: "insensitive" } },
                  { referenceCode: { contains: q, mode: "insensitive" } },
                  { product: { name: { contains: q, mode: "insensitive" } } },
                  { lines: { some: { product: { name: { contains: q, mode: "insensitive" } } } } },
                ]
              : undefined,
          },
          include: {
            createdBy: true,
            product: true,
            lines: { include: { product: true } },
          },
          orderBy: { date: "desc" },
        }),
    filters.type === "expense" || filters.type === "income"
      ? Promise.resolve([])
      : prisma.production.findMany({
          where: {
            date: from || to ? { gte: from, lte: to } : undefined,
            productId: filters.productId || undefined,
            OR: q
              ? [
                  { notes: { contains: q, mode: "insensitive" } },
                  { product: { name: { contains: q, mode: "insensitive" } } },
                ]
              : undefined,
          },
          include: {
            createdBy: true,
            product: true,
          },
          orderBy: { date: "desc" },
        }),
  ]);

  const mappedExpenses = expenses.map((item: ExpenseWithCreatedByAndPayroll) => ({
    id: item.id,
    date: item.date,
    category: expenseCategoryLabels[item.category],
    description: item.description,
    amount: decimalToNumber(item.amount),
    createdBy: item.createdBy.name,
    payrollLines: item.payrollLines.map((line: ExpenseWithCreatedByAndPayroll["payrollLines"][number]) => ({
      id: line.id,
      employeeName: line.employeeName,
      workDays: decimalToNumber(line.workDays),
      dailySalary: decimalToNumber(line.dailySalary),
      bonuses: decimalToNumber(line.bonuses),
      deductions: decimalToNumber(line.deductions),
      amount: decimalToNumber(line.amount),
      notes: line.notes,
    })),
  }));

  const mappedIncome = income.map((item: IncomeWithDetails) => {
    const lines = item.lines.length
      ? item.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          productName: line.product.name,
          quantity: decimalToNumber(line.quantity),
          pricePerUnit: decimalToNumber(line.pricePerUnit),
          total: decimalToNumber(line.total),
        }))
      : [
          {
            id: `${item.id}-legacy`,
            productId: item.productId,
            productName: item.product.name,
            quantity: decimalToNumber(item.quantity),
            pricePerUnit: decimalToNumber(item.pricePerUnit),
            total: decimalToNumber(item.total),
          },
        ];
    const summary = summarizeIncomeLines(lines);

    return {
      id: item.id,
      date: item.date,
      productId: item.productId,
      referenceCode: item.referenceCode,
      invoiceNumber: item.invoiceNumber,
      sourceApp: item.sourceApp,
      productName: summary.productName,
      quantity: summary.quantity,
      pricePerUnit: lines[0]?.pricePerUnit || 0,
      total: decimalToNumber(item.total),
      amountPaid: decimalToNumber(item.amountPaid),
      balanceDue: Math.max(0, decimalToNumber(item.total) - decimalToNumber(item.amountPaid)),
      paymentStatus: item.paymentStatus,
      comprobanteUrl: item.comprobanteUrl,
      clientName: item.clientName,
      lines,
      createdBy: item.createdBy.name,
    };
  });

  const mappedProduction = production.map((item: ProductionWithCreatedByAndProduct) => ({
    id: item.id,
    date: item.date,
    productId: item.productId,
    productName: item.product.name,
    quantity: decimalToNumber(item.quantity),
    notes: item.notes,
    createdBy: item.createdBy.name,
  }));

  return {
    expenses: mappedExpenses,
    income: mappedIncome,
    production: mappedProduction,
    summary: {
      expenseCount: mappedExpenses.length,
      incomeCount: mappedIncome.length,
      productionCount: mappedProduction.length,
      totalExpenses: mappedExpenses.reduce(
        (sum: number, item: (typeof mappedExpenses)[number]) => sum + item.amount,
        0,
      ),
      totalIncome: mappedIncome.reduce(
        (sum: number, item: (typeof mappedIncome)[number]) => sum + item.total,
        0,
      ),
      totalProduction: mappedProduction.reduce(
        (sum: number, item: (typeof mappedProduction)[number]) => sum + item.quantity,
        0,
      ),
    },
  };
}

export async function getReportData(from: string, to: string) {
  noStore();

  if (shouldUseLocalStore()) {
    return getLocalReportData(from, to);
  }

  const start = asDate(from);
  const end = asDate(to, true);

  const [summary, expenses, income, production, inventory] = await Promise.all([
    getRangeTotals(start, end),
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: { createdBy: true, payrollLines: true },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: { date: { gte: start, lte: end } },
      include: { createdBy: true, product: true, lines: { include: { product: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.production.findMany({
      where: { date: { gte: start, lte: end } },
      include: { createdBy: true, product: true },
      orderBy: { date: "desc" },
    }),
    getInventorySnapshot(),
  ]);

  return {
    from,
    to,
    summary,
    expenses: expenses.map((item: ExpenseWithCreatedByAndPayroll) => ({
      id: item.id,
      date: item.date,
      category: expenseCategoryLabels[item.category],
      description: item.description,
      amount: decimalToNumber(item.amount),
      createdBy: item.createdBy.name,
      payrollLines: item.payrollLines.map((line: ExpenseWithCreatedByAndPayroll["payrollLines"][number]) => ({
        id: line.id,
        employeeName: line.employeeName,
        workDays: decimalToNumber(line.workDays),
        dailySalary: decimalToNumber(line.dailySalary),
        bonuses: decimalToNumber(line.bonuses),
        deductions: decimalToNumber(line.deductions),
        amount: decimalToNumber(line.amount),
        notes: line.notes,
      })),
    })),
    income: income.map((item: IncomeWithDetails) => {
      const lines = item.lines.length
        ? item.lines.map((line) => ({
            id: line.id,
            productId: line.productId,
            productName: line.product.name,
            quantity: decimalToNumber(line.quantity),
            pricePerUnit: decimalToNumber(line.pricePerUnit),
            total: decimalToNumber(line.total),
          }))
        : [
            {
              id: `${item.id}-legacy`,
              productId: item.productId,
              productName: item.product.name,
              quantity: decimalToNumber(item.quantity),
              pricePerUnit: decimalToNumber(item.pricePerUnit),
              total: decimalToNumber(item.total),
            },
          ];
      const summary = summarizeIncomeLines(lines);

      return {
        id: item.id,
        date: item.date,
        referenceCode: item.referenceCode,
        invoiceNumber: item.invoiceNumber,
        productName: summary.productName,
        quantity: summary.quantity,
        pricePerUnit: lines[0]?.pricePerUnit || 0,
        total: decimalToNumber(item.total),
        amountPaid: decimalToNumber(item.amountPaid),
        balanceDue: Math.max(0, decimalToNumber(item.total) - decimalToNumber(item.amountPaid)),
        paymentStatus: item.paymentStatus,
        comprobanteUrl: item.comprobanteUrl,
        clientName: item.clientName,
        lines,
        createdBy: item.createdBy.name,
      };
    }),
    production: production.map((item: ProductionWithCreatedByAndProduct) => ({
      id: item.id,
      date: item.date,
      productName: item.product.name,
      quantity: decimalToNumber(item.quantity),
      notes: item.notes,
      createdBy: item.createdBy.name,
    })),
    inventory,
  };
}

export async function createExpense(data: {
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  createdById: string;
  payrollLines?: Array<{
    employeeId?: string;
    employeeName: string;
    workDays?: number;
    dailySalary?: number;
    bonuses?: number;
    deductions?: number;
    amount: number;
    notes?: string;
  }>;
}) {
  if (shouldUseLocalStore()) {
    return createLocalExpense(data);
  }

  return prisma.expense.create({
    data: {
      date: asDate(data.date),
      category: data.category,
      description: data.description,
      amount: new Prisma.Decimal(data.amount),
      createdById: data.createdById,
      payrollLines: data.payrollLines?.length
        ? {
            create: data.payrollLines.map((line: PayrollInputLine) => ({
              employeeId: line.employeeId || null,
              employeeName: line.employeeName,
              workDays: new Prisma.Decimal(line.workDays || 0),
              dailySalary: new Prisma.Decimal(line.dailySalary || 0),
              bonuses: new Prisma.Decimal(line.bonuses || 0),
              deductions: new Prisma.Decimal(line.deductions || 0),
              amount: new Prisma.Decimal(line.amount),
              notes: line.notes || null,
            })),
          }
        : undefined,
    },
    include: {
      payrollLines: true,
    },
  });
}

export async function getExpenseById(id: string) {
  if (shouldUseLocalStore()) {
    return getLocalExpenseById(id);
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { payrollLines: true },
  });

  if (!expense) {
    return null;
  }

  return {
    id: expense.id,
    date: expense.date.toISOString().slice(0, 10),
    category: expense.category,
    description: expense.description,
    amount: decimalToNumber(expense.amount),
    payrollLines: expense.payrollLines.map((line: ExpenseWithCreatedByAndPayroll["payrollLines"][number]) => ({
      id: line.id,
      employeeId: line.employeeId || "",
      employeeName: line.employeeName,
      workDays: decimalToNumber(line.workDays),
      dailySalary: decimalToNumber(line.dailySalary),
      bonuses: decimalToNumber(line.bonuses),
      deductions: decimalToNumber(line.deductions),
      amount: decimalToNumber(line.amount),
      notes: line.notes || "",
    })),
  };
}

export async function updateExpense(
  id: string,
  data: {
    date: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    payrollLines?: Array<{
      employeeId?: string;
      employeeName: string;
      workDays?: number;
      dailySalary?: number;
      bonuses?: number;
      deductions?: number;
      amount: number;
      notes?: string;
    }>;
  },
) {
  if (shouldUseLocalStore()) {
    return updateLocalExpense(id, data);
  }

  return prisma.$transaction(async (tx) => {
    await tx.expensePayrollLine.deleteMany({
      where: { expenseId: id },
    });

    return tx.expense.update({
      where: { id },
      data: {
        date: asDate(data.date),
        category: data.category,
        description: data.description,
        amount: new Prisma.Decimal(data.amount),
        payrollLines: data.payrollLines?.length
          ? {
              create: data.payrollLines.map((line: PayrollInputLine) => ({
                employeeId: line.employeeId || null,
                employeeName: line.employeeName,
                workDays: new Prisma.Decimal(line.workDays || 0),
                dailySalary: new Prisma.Decimal(line.dailySalary || 0),
                bonuses: new Prisma.Decimal(line.bonuses || 0),
                deductions: new Prisma.Decimal(line.deductions || 0),
                amount: new Prisma.Decimal(line.amount),
                notes: line.notes || null,
              })),
            }
          : undefined,
      },
    });
  });
}

export async function deleteExpense(id: string) {
  if (shouldUseLocalStore()) {
    return deleteLocalExpense(id);
  }

  return prisma.expense.delete({
    where: { id },
  });
}

export async function createProduct(data: { name: string; unitType: string }) {
  if (shouldUseLocalStore()) {
    return createLocalProduct(data);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: data.name,
        unitType: data.unitType,
      },
    });

    await tx.inventory.create({
      data: {
        productId: product.id,
        quantity: new Prisma.Decimal(0),
      },
    });

    return product;
  });
}

export async function deleteProduct(id: string) {
  if (shouldUseLocalStore()) {
    return deleteLocalProduct(id);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id },
      include: {
        inventory: true,
        incomes: { select: { id: true }, take: 1 },
        incomeLines: { select: { id: true }, take: 1 },
        productions: { select: { id: true }, take: 1 },
      },
    });

    if (!product) {
      throw new Error("Producto no encontrado.");
    }

    if (decimalToNumber(product.inventory?.quantity) > 0) {
      throw new Error("No puedes eliminar un producto con inventario disponible.");
    }

    if (product.incomes.length > 0 || product.incomeLines.length > 0 || product.productions.length > 0) {
      throw new Error("Este producto ya tiene movimientos. No se puede eliminar.");
    }

    if (product.inventory) {
      await tx.inventory.delete({
        where: { productId: id },
      });
    }

    return tx.product.delete({
      where: { id },
    });
  });
}

export async function createEmployee(data: {
  name: string;
  roleLabel?: string;
  dailySalary: number;
  isActive?: boolean;
}) {
  if (shouldUseLocalStore()) {
    return createLocalEmployee(data);
  }

  return prisma.employee.create({
    data: {
      name: data.name,
      roleLabel: data.roleLabel || null,
      dailySalary: new Prisma.Decimal(data.dailySalary),
      isActive: data.isActive ?? true,
    },
  });
}

export async function getEmployeeById(id: string) {
  if (shouldUseLocalStore()) {
    return getLocalEmployeeById(id);
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee) {
    return null;
  }

  return {
    id: employee.id,
    name: employee.name,
    roleLabel: employee.roleLabel || "",
    dailySalary: decimalToNumber(employee.dailySalary),
    isActive: employee.isActive,
  };
}

export async function updateEmployee(
  id: string,
  data: {
    name: string;
    roleLabel?: string;
    dailySalary: number;
    isActive?: boolean;
  },
) {
  if (shouldUseLocalStore()) {
    return updateLocalEmployee(id, data);
  }

  return prisma.employee.update({
    where: { id },
    data: {
      name: data.name,
      roleLabel: data.roleLabel || null,
      dailySalary: new Prisma.Decimal(data.dailySalary),
      isActive: data.isActive ?? true,
    },
  });
}

export async function deleteEmployee(id: string) {
  if (shouldUseLocalStore()) {
    return deleteLocalEmployee(id);
  }

  const payrollCount = await prisma.expensePayrollLine.count({
    where: { employeeId: id },
  });

  if (payrollCount > 0) {
    throw new Error("Este empleado ya aparece en planilla. Puedes editarlo o desactivarlo, pero no eliminarlo.");
  }

  return prisma.employee.delete({
    where: { id },
  });
}

export async function createProduction(data: {
  date: string;
  productId: string;
  quantity: number;
  notes?: string;
  createdById: string;
}) {
  if (shouldUseLocalStore()) {
    return createLocalProduction(data);
  }

  const amount = new Prisma.Decimal(data.quantity);

  return prisma.$transaction(async (tx) => {
    const production = await tx.production.create({
      data: {
        date: asDate(data.date),
        productId: data.productId,
        quantity: amount,
        notes: data.notes || null,
        createdById: data.createdById,
      },
    });

    await tx.inventory.upsert({
      where: { productId: data.productId },
      update: { quantity: { increment: amount } },
      create: { productId: data.productId, quantity: amount },
    });

    return production;
  });
}

export async function getProductionById(id: string) {
  if (shouldUseLocalStore()) {
    return getLocalProductionById(id);
  }

  const production = await prisma.production.findUnique({
    where: { id },
  });

  if (!production) {
    return null;
  }

  return {
    id: production.id,
    date: production.date.toISOString().slice(0, 10),
    productId: production.productId,
    quantity: decimalToNumber(production.quantity),
    notes: production.notes || "",
  };
}

export async function updateProduction(
  id: string,
  data: {
    date: string;
    productId: string;
    quantity: number;
    notes?: string;
  },
) {
  if (shouldUseLocalStore()) {
    return updateLocalProduction(id, data);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.production.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Registro de producción no encontrado.");
    }

    const nextQuantity = new Prisma.Decimal(data.quantity);
    const oldQuantity = existing.quantity;

    if (existing.productId === data.productId) {
      const delta = nextQuantity.sub(oldQuantity);

      if (delta.lessThan(0)) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: data.productId },
        });

        if (!inventory || inventory.quantity.lessThan(delta.abs())) {
          throw new Error("No hay suficiente inventario para reducir esta producción.");
        }
      }

      await tx.inventory.update({
        where: { productId: data.productId },
        data: {
          quantity: delta.greaterThanOrEqualTo(0)
            ? { increment: delta }
            : { decrement: delta.abs() },
        },
      });
    } else {
      const oldInventory = await tx.inventory.findUnique({
        where: { productId: existing.productId },
      });

      if (!oldInventory || oldInventory.quantity.lessThan(oldQuantity)) {
        throw new Error("No hay suficiente inventario para mover esta producción.");
      }

      await tx.inventory.update({
        where: { productId: existing.productId },
        data: {
          quantity: { decrement: oldQuantity },
        },
      });

      await tx.inventory.upsert({
        where: { productId: data.productId },
        update: { quantity: { increment: nextQuantity } },
        create: { productId: data.productId, quantity: nextQuantity },
      });
    }

    return tx.production.update({
      where: { id },
      data: {
        date: asDate(data.date),
        productId: data.productId,
        quantity: nextQuantity,
        notes: data.notes || null,
      },
    });
  });
}

export async function deleteProduction(id: string) {
  if (shouldUseLocalStore()) {
    return deleteLocalProduction(id);
  }

  return prisma.$transaction(async (tx) => {
    const production = await tx.production.findUnique({
      where: { id },
    });

    if (!production) {
      throw new Error("Registro de producción no encontrado.");
    }

    const inventory = await tx.inventory.findUnique({
      where: { productId: production.productId },
    });

    if (!inventory || inventory.quantity.lessThan(production.quantity)) {
      throw new Error("No hay suficiente inventario para eliminar esta producción.");
    }

    await tx.inventory.update({
      where: { productId: production.productId },
      data: { quantity: { decrement: production.quantity } },
    });

    return tx.production.delete({
      where: { id },
    });
  });
}

export async function createIncome(data: {
  date: string;
  referenceCode?: string;
  sourceApp?: string;
  invoiceNumber?: string;
  clientName: string;
  amountPaid?: number;
  dueDate?: string;
  paymentStatus?: PaymentStatus;
  paymentNotes?: string;
  comprobanteUrl?: string;
  allowInvoiceCreation?: boolean;
  lines: IncomeInputLine[];
  createdById: string;
}) {
  if (shouldUseLocalStore()) {
    return createLocalIncome(data);
  }

  return prisma.$transaction(async (tx) => {
    const client = await resolveClientForDb(tx, data);
    const lines = [];
    for (const line of data.lines) {
      lines.push(await resolveIncomeLineForDb(tx, line, data.allowInvoiceCreation ?? false));
    }

    const total = lines.reduce((sum, line) => sum.add(line.total), new Prisma.Decimal(0));
    const totalQuantity = lines.reduce((sum, line) => sum.add(line.quantity), new Prisma.Decimal(0));
    const firstLine = lines[0];
    const payment = normalizePayment(decimalToNumber(total), data.amountPaid || 0, data.paymentStatus);

    const income = await tx.income.create({
      data: {
        date: asDate(data.date),
        referenceCode: data.referenceCode || null,
        sourceApp: data.sourceApp || null,
        invoiceNumber: data.invoiceNumber || null,
        clientId: client.id,
        productId: firstLine.productId,
        quantity: totalQuantity,
        pricePerUnit: firstLine.pricePerUnit,
        total,
        amountPaid: new Prisma.Decimal(payment.amountPaid),
        dueDate: data.dueDate ? asDate(data.dueDate) : null,
        paymentStatus: payment.paymentStatus,
        paymentNotes: data.paymentNotes || null,
        comprobanteUrl: data.comprobanteUrl || null,
        clientName: client.name,
        createdById: data.createdById,
        lines: {
          create: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            pricePerUnit: line.pricePerUnit,
            total: line.total,
          })),
        },
      },
    });

    for (const line of lines) {
      await tx.inventory.update({
        where: { productId: line.productId },
        data: {
          quantity: { decrement: line.quantity },
        },
      });
    }

    return income;
  });
}

export async function getIncomeById(id: string) {
  if (shouldUseLocalStore()) {
    return getLocalIncomeById(id);
  }

  const income = await prisma.income.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!income) {
    return null;
  }

  return {
    id: income.id,
    date: income.date.toISOString().slice(0, 10),
    referenceCode: income.referenceCode || "",
    sourceApp: income.sourceApp || "",
    invoiceNumber: income.invoiceNumber || "",
    clientName: income.clientName,
    amountPaid: decimalToNumber(income.amountPaid),
    dueDate: income.dueDate ? income.dueDate.toISOString().slice(0, 10) : "",
    paymentStatus: income.paymentStatus,
    paymentNotes: income.paymentNotes || "",
    comprobanteUrl: income.comprobanteUrl || "",
    lines: income.lines.length
      ? income.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          quantity: decimalToNumber(line.quantity),
          pricePerUnit: decimalToNumber(line.pricePerUnit),
        }))
      : [
          {
            id: `${income.id}-legacy`,
            productId: income.productId,
            quantity: decimalToNumber(income.quantity),
            pricePerUnit: decimalToNumber(income.pricePerUnit),
          },
        ],
  };
}

export async function updateIncome(
  id: string,
  data: {
    date: string;
    referenceCode?: string;
    sourceApp?: string;
    invoiceNumber?: string;
    clientName: string;
    amountPaid?: number;
    dueDate?: string;
    paymentStatus?: PaymentStatus;
    paymentNotes?: string;
    comprobanteUrl?: string;
    allowInvoiceCreation?: boolean;
    lines: IncomeInputLine[];
  },
) {
  if (shouldUseLocalStore()) {
    return updateLocalIncome(id, data);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.income.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      throw new Error("Registro de venta no encontrado.");
    }

    const existingLines = existing.lines.length
      ? existing.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        }))
      : [{ productId: existing.productId, quantity: existing.quantity }];

    for (const line of existingLines) {
      await tx.inventory.upsert({
        where: { productId: line.productId },
        update: { quantity: { increment: line.quantity } },
        create: { productId: line.productId, quantity: line.quantity },
      });
    }

    const client = await resolveClientForDb(tx, data);

    const nextLines = [];
    for (const line of data.lines) {
      nextLines.push(await resolveIncomeLineForDb(tx, line, data.allowInvoiceCreation ?? false));
    }

    for (const line of nextLines) {
      await tx.inventory.update({
        where: { productId: line.productId },
        data: { quantity: { decrement: line.quantity } },
      });
    }

    await tx.incomeLine.deleteMany({
      where: { incomeId: id },
    });

    const totalQuantity = nextLines.reduce((sum, line) => sum.add(line.quantity), new Prisma.Decimal(0));
    const total = nextLines.reduce((sum, line) => sum.add(line.total), new Prisma.Decimal(0));
    const firstLine = nextLines[0];
    const payment = normalizePayment(decimalToNumber(total), data.amountPaid || 0, data.paymentStatus);

    return tx.income.update({
      where: { id },
      data: {
        date: asDate(data.date),
        referenceCode: data.referenceCode || null,
        sourceApp: data.sourceApp || null,
        invoiceNumber: data.invoiceNumber || null,
        clientId: client.id,
        productId: firstLine.productId,
        quantity: totalQuantity,
        pricePerUnit: firstLine.pricePerUnit,
        total,
        amountPaid: new Prisma.Decimal(payment.amountPaid),
        dueDate: data.dueDate ? asDate(data.dueDate) : null,
        paymentStatus: payment.paymentStatus,
        paymentNotes: data.paymentNotes || null,
        comprobanteUrl: data.comprobanteUrl || null,
        clientName: client.name,
        lines: {
          create: nextLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            pricePerUnit: line.pricePerUnit,
            total: line.total,
          })),
        },
      },
    });
  });
}

export async function updateIncomePayment(
  id: string,
  data: {
    amountPaid: number;
    paymentNotes?: string;
    markPaid?: boolean;
  },
) {
  if (shouldUseLocalStore()) {
    return updateLocalIncomePayment(id, data);
  }

  const income = await prisma.income.findUnique({
    where: { id },
  });

  if (!income) {
    throw new Error("Registro de venta no encontrado.");
  }

  const total = decimalToNumber(income.total);
  const requestedPaid = data.markPaid ? total : data.amountPaid;
  const payment = normalizePayment(total, requestedPaid);

  return prisma.income.update({
    where: { id },
    data: {
      amountPaid: new Prisma.Decimal(payment.amountPaid),
      paymentStatus: payment.paymentStatus,
      paymentNotes: data.paymentNotes?.trim() || income.paymentNotes,
    },
  });
}

export async function deleteIncome(id: string) {
  if (shouldUseLocalStore()) {
    return deleteLocalIncome(id);
  }

  return prisma.$transaction(async (tx) => {
    const income = await tx.income.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!income) {
      throw new Error("Registro de venta no encontrado.");
    }

    const lines = income.lines.length
      ? income.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        }))
      : [{ productId: income.productId, quantity: income.quantity }];

    for (const line of lines) {
      await tx.inventory.upsert({
        where: { productId: line.productId },
        update: { quantity: { increment: line.quantity } },
        create: { productId: line.productId, quantity: line.quantity },
      });
    }

    return tx.income.delete({
      where: { id },
    });
  });
}

export function getDefaultReportRange() {
  const now = new Date();

  return {
    from: startOfMonth(now).toISOString().slice(0, 10),
    to: addDays(now, 0).toISOString().slice(0, 10),
  };
}

export function adminOnly(role: UserRole) {
  if (role !== UserRole.ADMIN) {
    throw new Error("Admin access required.");
  }
}
