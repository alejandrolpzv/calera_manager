import { ExpenseCategory, PaymentStatus, UserRole, type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { expenseCategoryLabels } from "@/lib/constants";

type LocalUser = Pick<User, "id" | "name" | "email" | "role"> & {
  passwordHash: string;
};

type LocalProduct = {
  id: string;
  name: string;
  unitType: string;
  createdAt: string;
  updatedAt: string;
};

type LocalEmployee = {
  id: string;
  name: string;
  roleLabel: string | null;
  dailySalary: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalClient = {
  id: string;
  name: string;
  phone: string | null;
  rtn: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalExpense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  createdById: string;
  payrollLines: LocalPayrollLine[];
  createdAt: string;
  updatedAt: string;
};

type LocalPayrollLine = {
  id: string;
  employeeId?: string | null;
  employeeName: string;
  workDays?: number | null;
  dailySalary?: number | null;
  bonuses?: number | null;
  deductions?: number | null;
  amount: number;
  notes: string | null;
};

type LocalIncome = {
  id: string;
  date: string;
  referenceCode: string | null;
  sourceApp: string | null;
  invoiceNumber?: string | null;
  clientId?: string | null;
  productId: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  amountPaid?: number;
  dueDate?: string | null;
  paymentStatus?: PaymentStatus;
  paymentNotes?: string | null;
  comprobanteUrl?: string | null;
  clientName: string;
  createdById: string;
  lines: LocalIncomeLine[];
  createdAt: string;
  updatedAt: string;
};

type LocalIncomeLine = {
  id: string;
  productId: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
};

type LocalProduction = {
  id: string;
  date: string;
  productId: string;
  quantity: number;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

type LocalInventory = {
  id: string;
  productId: string;
  quantity: number;
  lastUpdated: string;
  createdAt: string;
};

type LocalStore = {
  users: LocalUser[];
  products: LocalProduct[];
  employees: LocalEmployee[];
  clients: LocalClient[];
  expenses: LocalExpense[];
  incomes: LocalIncome[];
  productions: LocalProduction[];
  inventory: LocalInventory[];
};

const storePath = path.join(process.cwd(), "data", "local-dev-store.json");

function nowIso() {
  return new Date().toISOString();
}

function dayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return startOfDay(new Date(value)).toISOString();
  }

  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function normalizeStore(
  store:
    | LocalStore
    | (Omit<LocalStore, "employees" | "clients"> & {
        employees?: LocalEmployee[];
        clients?: LocalClient[];
      }),
) {
  const clients = [...(store.clients || [])];

  for (const income of store.incomes) {
    const clientName = income.clientName?.trim();

    if (!clientName) {
      continue;
    }

    const existingClient = clients.find(
      (item) => item.name.trim().toLowerCase() === clientName.toLowerCase(),
    );

    if (!existingClient) {
      clients.push({
        id: randomUUID(),
        name: clientName,
        phone: null,
        rtn: null,
        address: null,
        notes: null,
        isActive: true,
        createdAt: income.createdAt || nowIso(),
        updatedAt: income.updatedAt || nowIso(),
      });
    }
  }

  return {
    ...store,
    employees: (store.employees || []).map((employee) => ({
      ...employee,
      dailySalary: Number(employee.dailySalary || 0),
    })),
    clients: clients.map((client) => ({
      ...client,
      phone: client.phone || null,
      rtn: client.rtn || null,
      address: client.address || null,
      notes: client.notes || null,
      isActive: client.isActive ?? true,
    })),
    expenses: store.expenses.map((expense) => ({
      ...expense,
      payrollLines: (expense.payrollLines || []).map((line) => ({
        ...line,
        employeeId: line.employeeId || null,
        workDays: Number(line.workDays || 0),
        dailySalary: Number(line.dailySalary || 0),
        bonuses: Number(line.bonuses || 0),
        deductions: Number(line.deductions || 0),
      })),
    })),
    incomes: store.incomes.map((income) => ({
      ...income,
      referenceCode: income.referenceCode || null,
      sourceApp: income.sourceApp || null,
      invoiceNumber: income.invoiceNumber || null,
      clientId:
        income.clientId ||
        clients.find((item) => item.name.trim().toLowerCase() === income.clientName.trim().toLowerCase())
          ?.id ||
        null,
      amountPaid: Number(income.amountPaid || 0),
      dueDate: income.dueDate || null,
      paymentStatus: income.paymentStatus || PaymentStatus.PENDING,
      paymentNotes: income.paymentNotes || null,
      comprobanteUrl: income.comprobanteUrl || null,
      lines: income.lines?.length
        ? income.lines
        : [
            {
              id: randomUUID(),
              productId: income.productId,
              quantity: income.quantity,
              pricePerUnit: income.pricePerUnit,
              total: income.total,
            },
          ],
    })),
  } satisfies LocalStore;
}

async function ensureStore() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
    const operatorPasswordHash = await bcrypt.hash("Operator123!", 10);
    const createdAt = nowIso();
    const adminId = randomUUID();
    const operatorId = randomUUID();
    const productAId = randomUUID();
    const productBId = randomUUID();

    const initialStore: LocalStore = {
      users: [
        {
          id: adminId,
          name: "Administrador",
          email: "admin@factory.local",
          passwordHash: adminPasswordHash,
          role: UserRole.ADMIN,
        },
        {
          id: operatorId,
          name: "Operador",
          email: "operator@factory.local",
          passwordHash: operatorPasswordHash,
          role: UserRole.OPERATOR,
        },
      ],
      products: [
        {
          id: productAId,
          name: "Calcium Carbonate Standard",
          unitType: "Sacos de 100 lbs",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: productBId,
          name: "Calcium Carbonate Fine",
          unitType: "Sacos de 100 lbs",
          createdAt,
          updatedAt: createdAt,
        },
      ],
      employees: [
        {
          id: randomUUID(),
          name: "Juan Perez",
          roleLabel: "Molino",
          dailySalary: 450,
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: randomUUID(),
          name: "Maria Lopez",
          roleLabel: "Empaque",
          dailySalary: 420,
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      clients: [],
      expenses: [
        {
          id: randomUUID(),
          date: createdAt,
          category: ExpenseCategory.DIESEL,
          description: "Diesel purchase for plant",
          amount: 4500,
          createdById: adminId,
          payrollLines: [],
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: randomUUID(),
          date: createdAt,
          category: ExpenseCategory.MATERIA_PRIMA,
          description: "Raw material loading",
          amount: 8200,
          createdById: adminId,
          payrollLines: [],
          createdAt,
          updatedAt: createdAt,
        },
      ],
      incomes: [],
      productions: [
        {
          id: randomUUID(),
          date: createdAt,
          productId: productAId,
          quantity: 120,
          notes: "Lote inicial de produccion",
          createdById: adminId,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      inventory: [
        {
          id: randomUUID(),
          productId: productAId,
          quantity: 120,
          lastUpdated: createdAt,
          createdAt,
        },
        {
          id: randomUUID(),
          productId: productBId,
          quantity: 0,
          lastUpdated: createdAt,
          createdAt,
        },
      ],
    };

    await fs.writeFile(storePath, JSON.stringify(initialStore, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(storePath, "utf8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  const normalized = normalizeStore(parsed);

  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    await writeStore(normalized);
  }

  return normalized;
}

async function writeStore(store: LocalStore) {
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function findProductByName(store: LocalStore, name: string) {
  return store.products.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
}

function findClientByName(store: LocalStore, name: string) {
  return store.clients.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
}

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

function inRange(date: string, from: Date, to: Date) {
  const value = new Date(date);
  return value >= from && value <= to;
}

export function shouldUseLocalStore() {
  return process.env.USE_LOCAL_DEV_STORE === "true";
}

export async function authenticateLocalUser(email: string, password: string) {
  const store = await readStore();
  const user = store.users.find((item) => item.email === email.toLowerCase());

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

export async function getLocalProducts() {
  const store = await readStore();
  return store.products
    .map((product) => {
      const inventory = store.inventory.find((item) => item.productId === product.id);
      return {
        id: product.id,
        name: product.name,
        unitType: product.unitType,
        inventoryQuantity: inventory?.quantity || 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalEmployees() {
  const store = await readStore();
  return [...store.employees].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalClients() {
  const store = await readStore();
  const productMap = new Map(store.products.map((product) => [product.id, product]));

  return [...store.clients]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((client) => {
      const sales = store.incomes
        .filter((income) => income.clientId === client.id || income.clientName === client.name)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date));
      const totalPaid = sales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
      const totalPending = sales.reduce(
        (sum, sale) => sum + Math.max(0, sale.total - (sale.amountPaid || 0)),
        0,
      );

      return {
        id: client.id,
        name: client.name,
        phone: client.phone || "",
        rtn: client.rtn || "",
        address: client.address || "",
        notes: client.notes || "",
        isActive: client.isActive,
        salesCount: sales.length,
        totalSales: sales.reduce((sum, sale) => sum + sale.total, 0),
        totalPaid,
        totalPending,
        lastSaleDate: sales[0] ? new Date(sales[0].date) : null,
        recentSales: sales.slice(0, 5).map((sale) => ({
          id: sale.id,
          date: new Date(sale.date),
          total: sale.total,
          amountPaid: sale.amountPaid || 0,
          balanceDue: Math.max(0, sale.total - (sale.amountPaid || 0)),
          paymentStatus: sale.paymentStatus || PaymentStatus.PENDING,
          referenceCode: sale.referenceCode,
          invoiceNumber: sale.invoiceNumber || "",
          productName: sale.lines.map((line) => productMap.get(line.productId)?.name || "Desconocido").join(", "),
        })),
      };
    });
}

export async function getLocalClientById(id: string) {
  const store = await readStore();
  const client = store.clients.find((item) => item.id === id);

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

export async function createLocalClient(data: {
  name: string;
  phone?: string;
  rtn?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}) {
  const store = await readStore();
  const existing = findClientByName(store, data.name);

  if (existing) {
    throw new Error("Ya existe un cliente con ese nombre.");
  }

  const timestamp = nowIso();
  const client = {
    id: randomUUID(),
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    rtn: data.rtn?.trim() || null,
    address: data.address?.trim() || null,
    notes: data.notes?.trim() || null,
    isActive: data.isActive ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.clients.push(client);
  await writeStore(store);
  return client;
}

export async function updateLocalClient(
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
  const store = await readStore();
  const client = store.clients.find((item) => item.id === id);

  if (!client) {
    throw new Error("Cliente no encontrado.");
  }

  const duplicate = store.clients.find(
    (item) => item.id !== id && item.name.trim().toLowerCase() === data.name.trim().toLowerCase(),
  );

  if (duplicate) {
    throw new Error("Ya existe otro cliente con ese nombre.");
  }

  const oldName = client.name;
  client.name = data.name.trim();
  client.phone = data.phone?.trim() || null;
  client.rtn = data.rtn?.trim() || null;
  client.address = data.address?.trim() || null;
  client.notes = data.notes?.trim() || null;
  client.isActive = data.isActive ?? true;
  client.updatedAt = nowIso();

  for (const income of store.incomes) {
    if (income.clientId === id || income.clientName === oldName) {
      income.clientId = id;
      income.clientName = client.name;
    }
  }

  await writeStore(store);
  return client;
}

export async function getLocalReceivables() {
  const store = await readStore();

  return store.incomes
    .map((income) => ({
      id: income.id,
      date: new Date(income.date),
      dueDate: income.dueDate ? new Date(income.dueDate) : null,
      clientName: income.clientName,
      invoiceNumber: income.invoiceNumber || "",
      total: income.total,
      amountPaid: income.amountPaid || 0,
      balanceDue: Math.max(0, income.total - (income.amountPaid || 0)),
      paymentStatus: income.paymentStatus || PaymentStatus.PENDING,
      referenceCode: income.referenceCode || "",
    }))
    .filter((income) => income.balanceDue > 0)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return +a.dueDate - +b.dueDate;
      }

      if (a.dueDate) {
        return -1;
      }

      if (b.dueDate) {
        return 1;
      }

      return +a.date - +b.date;
    });
}

export async function getLocalInventorySnapshot() {
  const store = await readStore();
  return store.inventory
    .map((item) => {
      const product = store.products.find((productEntry) => productEntry.id === item.productId);
      return {
        id: item.id,
        productId: item.productId,
        productName: product?.name || "Producto desconocido",
        unitType: product?.unitType || "Unidades",
        quantity: item.quantity,
        lastUpdated: new Date(item.lastUpdated),
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

export async function getLocalRecentActivity() {
  const store = await readStore();
  const userMap = new Map(store.users.map((user) => [user.id, user]));
  const productMap = new Map(store.products.map((product) => [product.id, product]));

  return {
    expenses: [...store.expenses]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 5)
      .map((expense) => ({
        id: expense.id,
        date: new Date(expense.date),
        category: expenseCategoryLabels[expense.category],
        description: expense.description,
        amount: expense.amount,
        createdBy: userMap.get(expense.createdById)?.name || "Desconocido",
        payrollLines: expense.payrollLines || [],
      })),
    incomes: [...store.incomes]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 5)
      .map((income) => ({
        id: income.id,
        date: new Date(income.date),
        productName: income.lines
          .map((line) => productMap.get(line.productId)?.name || "Desconocido")
          .join(", "),
        quantity: income.lines.reduce((sum, line) => sum + line.quantity, 0),
        total: income.total,
        clientName: income.clientName,
        referenceCode: income.referenceCode,
        invoiceNumber: income.invoiceNumber || null,
        amountPaid: income.amountPaid || 0,
        balanceDue: Math.max(0, income.total - (income.amountPaid || 0)),
        paymentStatus: income.paymentStatus || PaymentStatus.PENDING,
        lines: income.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          productName: productMap.get(line.productId)?.name || "Desconocido",
          quantity: line.quantity,
          pricePerUnit: line.pricePerUnit,
          total: line.total,
        })),
        createdBy: userMap.get(income.createdById)?.name || "Desconocido",
      })),
    productions: [...store.productions]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 5)
      .map((production) => ({
        id: production.id,
        date: new Date(production.date),
        productName: productMap.get(production.productId)?.name || "Desconocido",
        quantity: production.quantity,
        notes: production.notes,
        createdBy: userMap.get(production.createdById)?.name || "Desconocido",
      })),
  };
}

function summarize(store: LocalStore, from: Date, to: Date) {
  const expenses = store.expenses.filter((item) => inRange(item.date, from, to));
  const incomes = store.incomes.filter((item) => inRange(item.date, from, to));
  const productions = store.productions.filter((item) => inRange(item.date, from, to));

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalSales = incomes.reduce((sum, item) => sum + item.total, 0);
  const totalIncome = incomes.reduce((sum, item) => sum + (item.amountPaid || 0), 0);
  const totalProduction = productions.reduce((sum, item) => sum + item.quantity, 0);

  return {
    totalExpenses,
    totalIncome,
    totalSales,
    totalProduction,
    profit: totalIncome - totalExpenses,
    costPerUnit: totalProduction > 0 ? totalExpenses / totalProduction : 0,
  };
}

export async function getLocalDashboardData() {
  const store = await readStore();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const chartStart = subDays(now, 13);

  const groupedExpenses = Object.values(ExpenseCategory).map((category) => ({
    name: expenseCategoryLabels[category],
    value: store.expenses
      .filter((item) => item.category === category && inRange(item.date, monthStart, monthEnd))
      .reduce((sum, item) => sum + item.amount, 0),
  })).filter((item) => item.value > 0);

  const incomeVsExpenses = Array.from({ length: 14 }, (_, index) => {
    const day = startOfDay(new Date(chartStart.getTime() + index * 86400000));
    const nextDay = endOfDay(day);

    return {
      date: day.toISOString(),
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      expenses: store.expenses
        .filter((item) => inRange(item.date, day, nextDay))
        .reduce((sum, item) => sum + item.amount, 0),
      income: store.incomes
        .filter((item) => inRange(item.date, day, nextDay))
        .reduce((sum, item) => sum + (item.amountPaid || 0), 0),
    };
  });

  const productionOverTime = Array.from({ length: 14 }, (_, index) => {
    const day = startOfDay(new Date(chartStart.getTime() + index * 86400000));
    const nextDay = endOfDay(day);

    return {
      date: day.toISOString(),
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      production: store.productions
        .filter((item) => inRange(item.date, day, nextDay))
        .reduce((sum, item) => sum + item.quantity, 0),
    };
  });

  const topClients = Object.values(
    store.incomes.reduce<Record<string, { name: string; total: number }>>((acc, income) => {
      const key = income.clientName.trim().toLowerCase();
      if (!acc[key]) {
        acc[key] = { name: income.clientName, total: 0 };
      }
      acc[key].total += income.total;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const topProducts = Object.values(
    store.incomes.reduce<Record<string, { name: string; quantity: number }>>((acc, income) => {
      for (const line of income.lines) {
        const productName =
          store.products.find((product) => product.id === line.productId)?.name || "Desconocido";
        const key = line.productId;
        if (!acc[key]) {
          acc[key] = { name: productName, quantity: 0 };
        }
        acc[key].quantity += line.quantity;
      }
      return acc;
    }, {}),
  )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const lowStock = store.inventory
    .map((item) => ({
      productName:
        store.products.find((product) => product.id === item.productId)?.name || "Desconocido",
      quantity: item.quantity,
      unitType:
        store.products.find((product) => product.id === item.productId)?.unitType || "Unidades",
    }))
    .filter((item) => item.quantity <= 10)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  const receivables = store.incomes
    .map((income) => ({
      clientName: income.clientName,
      balanceDue: Math.max(0, income.total - (income.amountPaid || 0)),
    }))
    .filter((income) => income.balanceDue > 0);

  return {
    weekly: summarize(store, weekStart, now),
    monthly: summarize(store, monthStart, now),
    expensesByCategory: groupedExpenses,
    incomeVsExpenses,
    productionOverTime,
    operational: {
      topClients,
      topProducts,
      lowStock,
      pendingReceivablesTotal: receivables.reduce((sum, item) => sum + item.balanceDue, 0),
      pendingReceivablesCount: receivables.length,
    },
  };
}

type LocalReportFilters = {
  expenseCategory?: string;
  productId?: string;
  paymentStatus?: string;
  q?: string;
};

export async function getLocalReportData(from: string, to: string, filters: LocalReportFilters = {}) {
  const store = await readStore();
  const fromDate = startOfDay(new Date(from));
  const toDate = endOfDay(new Date(to));
  const userMap = new Map(store.users.map((user) => [user.id, user]));
  const productMap = new Map(store.products.map((product) => [product.id, product]));
  const query = filters.q?.trim().toLowerCase() || "";
  const expenses = store.expenses
    .filter((item) => inRange(item.date, fromDate, toDate))
    .filter((item) => !filters.expenseCategory || item.category === filters.expenseCategory)
    .filter((item) =>
      query
        ? [
            item.description,
            expenseCategoryLabels[item.category],
            ...item.payrollLines.map((line) => line.employeeName),
          ].some((value) => value?.toLowerCase().includes(query))
        : true,
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const income = store.incomes
    .filter((item) => inRange(item.date, fromDate, toDate))
    .filter((item) => !filters.paymentStatus || item.paymentStatus === filters.paymentStatus)
    .filter((item) => !filters.productId || item.lines.some((line) => line.productId === filters.productId))
    .filter((item) =>
      query
        ? [
            item.clientName,
            item.referenceCode,
            item.invoiceNumber,
            ...item.lines.map((line) => productMap.get(line.productId)?.name || ""),
          ].some((value) => value?.toLowerCase().includes(query))
        : true,
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const production = store.productions
    .filter((item) => inRange(item.date, fromDate, toDate))
    .filter((item) => !filters.productId || item.productId === filters.productId)
    .filter((item) =>
      query
        ? [item.notes, productMap.get(item.productId)?.name || ""].some((value) =>
            value?.toLowerCase().includes(query),
          )
        : true,
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalSales = income.reduce((sum, item) => sum + item.total, 0);
  const totalIncome = income.reduce((sum, item) => sum + (item.amountPaid || 0), 0);
  const totalProduction = production.reduce((sum, item) => sum + item.quantity, 0);

  return {
    from,
    to,
    filters,
    summary: {
      totalExpenses,
      totalIncome,
      totalSales,
      totalProduction,
      profit: totalIncome - totalExpenses,
      costPerUnit: totalProduction > 0 ? totalExpenses / totalProduction : 0,
    },
    expenses: expenses
      .map((item) => ({
        id: item.id,
        date: new Date(item.date),
        category: expenseCategoryLabels[item.category],
        description: item.description,
        amount: item.amount,
        createdBy: userMap.get(item.createdById)?.name || "Desconocido",
        payrollLines: item.payrollLines || [],
      })),
    income: income
      .map((item) => ({
        id: item.id,
        date: new Date(item.date),
        referenceCode: item.referenceCode,
        invoiceNumber: item.invoiceNumber || null,
        productName: item.lines.map((line) => productMap.get(line.productId)?.name || "Desconocido").join(", "),
        quantity: item.lines.reduce((sum, line) => sum + line.quantity, 0),
        pricePerUnit: item.lines[0]?.pricePerUnit || 0,
        total: item.total,
        amountPaid: item.amountPaid || 0,
        balanceDue: Math.max(0, item.total - (item.amountPaid || 0)),
        paymentStatus: item.paymentStatus || PaymentStatus.PENDING,
        comprobanteUrl: item.comprobanteUrl || "",
        clientName: item.clientName,
        lines: item.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          productName: productMap.get(line.productId)?.name || "Desconocido",
          quantity: line.quantity,
          pricePerUnit: line.pricePerUnit,
          total: line.total,
        })),
        createdBy: userMap.get(item.createdById)?.name || "Desconocido",
      })),
    production: production
      .map((item) => ({
        id: item.id,
        date: new Date(item.date),
        productName: productMap.get(item.productId)?.name || "Desconocido",
        quantity: item.quantity,
        notes: item.notes,
        createdBy: userMap.get(item.createdById)?.name || "Desconocido",
      })),
    inventory: await getLocalInventorySnapshot(),
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

export async function getLocalHistoryData(filters: HistoryFilters) {
  const store = await readStore();
  const userMap = new Map(store.users.map((user) => [user.id, user]));
  const productMap = new Map(store.products.map((product) => [product.id, product]));
  const from = filters.from ? startOfDay(new Date(filters.from)) : null;
  const to = filters.to ? endOfDay(new Date(filters.to)) : null;
  const query = filters.q?.trim().toLowerCase() || "";

  function matchesDate(date: string) {
    const value = new Date(date);
    return (!from || value >= from) && (!to || value <= to);
  }

  function matchesText(values: Array<string | null | undefined>) {
    if (!query) {
      return true;
    }

    return values.some((value) => value?.toLowerCase().includes(query));
  }

  const expenses = store.expenses
    .filter(() => filters.type === "all" || !filters.type || filters.type === "expense")
    .filter((item) => matchesDate(item.date))
    .filter((item) => !filters.expenseCategory || item.category === filters.expenseCategory)
    .filter((item) =>
      matchesText([
        item.description,
        expenseCategoryLabels[item.category],
        ...item.payrollLines.map((line) => line.employeeName),
      ]),
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map((item) => ({
      id: item.id,
      date: new Date(item.date),
      category: expenseCategoryLabels[item.category],
      description: item.description,
      amount: item.amount,
      createdBy: userMap.get(item.createdById)?.name || "Desconocido",
      payrollLines: item.payrollLines || [],
    }));

  const income = store.incomes
    .filter(() => filters.type === "all" || !filters.type || filters.type === "income")
    .filter((item) => matchesDate(item.date))
    .filter((item) => !filters.productId || item.lines.some((line) => line.productId === filters.productId))
    .filter((item) =>
      matchesText([
        item.clientName,
        item.referenceCode,
        ...item.lines.map((line) => productMap.get(line.productId)?.name),
      ]),
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map((item) => ({
      id: item.id,
      date: new Date(item.date),
      productId: item.productId,
      referenceCode: item.referenceCode,
      invoiceNumber: item.invoiceNumber || null,
      productName: item.lines.map((line) => productMap.get(line.productId)?.name || "Desconocido").join(", "),
      quantity: item.lines.reduce((sum, line) => sum + line.quantity, 0),
      pricePerUnit: item.lines[0]?.pricePerUnit || 0,
      total: item.total,
      amountPaid: item.amountPaid || 0,
      balanceDue: Math.max(0, item.total - (item.amountPaid || 0)),
      paymentStatus: item.paymentStatus || PaymentStatus.PENDING,
      comprobanteUrl: item.comprobanteUrl || "",
      clientName: item.clientName,
      lines: item.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: productMap.get(line.productId)?.name || "Desconocido",
        quantity: line.quantity,
        pricePerUnit: line.pricePerUnit,
        total: line.total,
      })),
      createdBy: userMap.get(item.createdById)?.name || "Desconocido",
    }));

  const production = store.productions
    .filter(() => filters.type === "all" || !filters.type || filters.type === "production")
    .filter((item) => matchesDate(item.date))
    .filter((item) => !filters.productId || item.productId === filters.productId)
    .filter((item) =>
      matchesText([
        item.notes,
        productMap.get(item.productId)?.name,
      ]),
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map((item) => ({
      id: item.id,
      date: new Date(item.date),
      productId: item.productId,
      productName: productMap.get(item.productId)?.name || "Desconocido",
      quantity: item.quantity,
      notes: item.notes,
      createdBy: userMap.get(item.createdById)?.name || "Desconocido",
    }));

  return {
    expenses,
    income,
    production,
    summary: {
      expenseCount: expenses.length,
      incomeCount: income.length,
      productionCount: production.length,
      totalExpenses: expenses.reduce((sum, item) => sum + item.amount, 0),
      totalIncome: income.reduce((sum, item) => sum + item.total, 0),
      totalProduction: production.reduce((sum, item) => sum + item.quantity, 0),
    },
  };
}

export async function createLocalExpense(data: {
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
  const store = await readStore();
  const timestamp = nowIso();

  store.expenses.push({
    id: randomUUID(),
    date: dayIso(data.date),
    category: data.category,
    description: data.description,
    amount: data.amount,
    createdById: data.createdById,
    payrollLines: (data.payrollLines || []).map((line) => ({
      id: randomUUID(),
      employeeId: line.employeeId || null,
      employeeName: line.employeeName,
      workDays: line.workDays || 0,
      dailySalary: line.dailySalary || 0,
      bonuses: line.bonuses || 0,
      deductions: line.deductions || 0,
      amount: line.amount,
      notes: line.notes || null,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await writeStore(store);
}

export async function getLocalExpenseById(id: string) {
  const store = await readStore();
  const expense = store.expenses.find((item) => item.id === id);

  if (!expense) {
    return null;
  }

  return {
    id: expense.id,
    date: expense.date.slice(0, 10),
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    payrollLines: (expense.payrollLines || []).map((line) => ({
      id: line.id,
      employeeId: line.employeeId || "",
      employeeName: line.employeeName,
      workDays: line.workDays || 0,
      dailySalary: line.dailySalary || 0,
      bonuses: line.bonuses || 0,
      deductions: line.deductions || 0,
      amount: line.amount,
      notes: line.notes || "",
    })),
  };
}

export async function updateLocalExpense(
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
  const store = await readStore();
  const expense = store.expenses.find((item) => item.id === id);

  if (!expense) {
    throw new Error("Registro de gasto no encontrado.");
  }

  expense.date = dayIso(data.date);
  expense.category = data.category;
  expense.description = data.description;
  expense.amount = data.amount;
  expense.payrollLines = (data.payrollLines || []).map((line) => ({
    id: randomUUID(),
    employeeId: line.employeeId || null,
    employeeName: line.employeeName,
    workDays: line.workDays || 0,
    dailySalary: line.dailySalary || 0,
    bonuses: line.bonuses || 0,
    deductions: line.deductions || 0,
    amount: line.amount,
    notes: line.notes || null,
  }));
  expense.updatedAt = nowIso();

  await writeStore(store);
  return expense;
}

export async function deleteLocalExpense(id: string) {
  const store = await readStore();
  const nextExpenses = store.expenses.filter((item) => item.id !== id);

  if (nextExpenses.length === store.expenses.length) {
    throw new Error("Registro de gasto no encontrado.");
  }

  store.expenses = nextExpenses;
  await writeStore(store);
}

export async function createLocalProduct(data: { name: string; unitType: string }) {
  const store = await readStore();
  const timestamp = nowIso();
  const productId = randomUUID();

  store.products.push({
    id: productId,
    name: data.name,
    unitType: data.unitType,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  store.inventory.push({
    id: randomUUID(),
    productId,
    quantity: 0,
    lastUpdated: timestamp,
    createdAt: timestamp,
  });

  await writeStore(store);

  return {
    id: productId,
    name: data.name,
    unitType: data.unitType,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function deleteLocalProduct(id: string) {
  const store = await readStore();
  const product = store.products.find((item) => item.id === id);

  if (!product) {
    throw new Error("Producto no encontrado.");
  }

  const inventory = store.inventory.find((item) => item.productId === id);
  if (inventory && inventory.quantity > 0) {
    throw new Error("No puedes eliminar un producto con inventario disponible.");
  }

  const hasIncome = store.incomes.some((item) => item.lines.some((line) => line.productId === id));
  const hasProduction = store.productions.some((item) => item.productId === id);

  if (hasIncome || hasProduction) {
    throw new Error("Este producto ya tiene movimientos. No se puede eliminar.");
  }

  store.products = store.products.filter((item) => item.id !== id);
  store.inventory = store.inventory.filter((item) => item.productId !== id);
  await writeStore(store);
}

export async function createLocalEmployee(data: {
  name: string;
  roleLabel?: string;
  dailySalary: number;
  isActive?: boolean;
}) {
  const store = await readStore();
  const timestamp = nowIso();

  store.employees.push({
    id: randomUUID(),
    name: data.name,
    roleLabel: data.roleLabel || null,
    dailySalary: data.dailySalary,
    isActive: data.isActive ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await writeStore(store);
}

export async function getLocalEmployeeById(id: string) {
  const store = await readStore();
  const employee = store.employees.find((item) => item.id === id);

  if (!employee) {
    return null;
  }

  return {
    id: employee.id,
    name: employee.name,
    roleLabel: employee.roleLabel || "",
    dailySalary: employee.dailySalary,
    isActive: employee.isActive,
  };
}

export async function updateLocalEmployee(
  id: string,
  data: {
    name: string;
    roleLabel?: string;
    dailySalary: number;
    isActive?: boolean;
  },
) {
  const store = await readStore();
  const employee = store.employees.find((item) => item.id === id);

  if (!employee) {
    throw new Error("Empleado no encontrado.");
  }

  employee.name = data.name;
  employee.roleLabel = data.roleLabel || null;
  employee.dailySalary = data.dailySalary;
  employee.isActive = data.isActive ?? true;
  employee.updatedAt = nowIso();

  await writeStore(store);
  return employee;
}

export async function deleteLocalEmployee(id: string) {
  const store = await readStore();
  const usedInPayroll = store.expenses.some((expense) =>
    expense.payrollLines.some((line) => line.employeeId === id),
  );

  if (usedInPayroll) {
    throw new Error("Este empleado ya aparece en planilla. Puedes editarlo o desactivarlo, pero no eliminarlo.");
  }

  const nextEmployees = store.employees.filter((item) => item.id !== id);

  if (nextEmployees.length === store.employees.length) {
    throw new Error("Empleado no encontrado.");
  }

  store.employees = nextEmployees;
  await writeStore(store);
}

export async function createLocalProduction(data: {
  date: string;
  productId: string;
  quantity: number;
  notes?: string;
  createdById: string;
}) {
  const store = await readStore();
  const timestamp = nowIso();

  store.productions.push({
    id: randomUUID(),
    date: dayIso(data.date),
    productId: data.productId,
    quantity: data.quantity,
    notes: data.notes || null,
    createdById: data.createdById,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const inventory = store.inventory.find((item) => item.productId === data.productId);
  if (inventory) {
    inventory.quantity += data.quantity;
    inventory.lastUpdated = timestamp;
  }

  await writeStore(store);
}

export async function getLocalProductionById(id: string) {
  const store = await readStore();
  const production = store.productions.find((item) => item.id === id);

  if (!production) {
    return null;
  }

  return {
    id: production.id,
    date: production.date.slice(0, 10),
    productId: production.productId,
    quantity: production.quantity,
    notes: production.notes || "",
  };
}

export async function updateLocalProduction(
  id: string,
  data: {
    date: string;
    productId: string;
    quantity: number;
    notes?: string;
  },
) {
  const store = await readStore();
  const production = store.productions.find((item) => item.id === id);

  if (!production) {
    throw new Error("Registro de producción no encontrado.");
  }

  const oldInventory = store.inventory.find((item) => item.productId === production.productId);
  if (!oldInventory || oldInventory.quantity < production.quantity) {
    throw new Error("No hay suficiente inventario para modificar esta producción.");
  }

  oldInventory.quantity -= production.quantity;
  oldInventory.lastUpdated = nowIso();

  const nextInventory = store.inventory.find((item) => item.productId === data.productId);
  if (!nextInventory) {
    store.inventory.push({
      id: randomUUID(),
      productId: data.productId,
      quantity: data.quantity,
      lastUpdated: nowIso(),
      createdAt: nowIso(),
    });
  } else {
    nextInventory.quantity += data.quantity;
    nextInventory.lastUpdated = nowIso();
  }

  production.date = dayIso(data.date);
  production.productId = data.productId;
  production.quantity = data.quantity;
  production.notes = data.notes || null;
  production.updatedAt = nowIso();

  await writeStore(store);
  return production;
}

export async function deleteLocalProduction(id: string) {
  const store = await readStore();
  const production = store.productions.find((item) => item.id === id);

  if (!production) {
    throw new Error("Registro de producción no encontrado.");
  }

  const inventory = store.inventory.find((item) => item.productId === production.productId);
  if (!inventory || inventory.quantity < production.quantity) {
    throw new Error("No hay suficiente inventario para eliminar esta producción.");
  }

  inventory.quantity -= production.quantity;
  inventory.lastUpdated = nowIso();
  store.productions = store.productions.filter((item) => item.id !== id);
  await writeStore(store);
}

export async function createLocalIncome(data: {
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
  lines: Array<{
    productId?: string;
    productName?: string;
    quantity: number;
    pricePerUnit: number;
  }>;
  createdById: string;
}) {
  const store = await readStore();
  const timestamp = nowIso();
  const normalizedClientName = data.clientName.trim();
  let client = findClientByName(store, normalizedClientName);

  if (!client) {
    client = {
      id: randomUUID(),
      name: normalizedClientName,
      phone: null,
      rtn: null,
      address: null,
      notes: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.clients.push(client);
  } else {
    client.updatedAt = timestamp;
  }

  const lines = data.lines.map((line) => {
    let productId = line.productId || "";

    if (!productId && line.productName) {
      const matchedProduct = findProductByName(store, line.productName);
      if (matchedProduct) {
        productId = matchedProduct.id;
      } else if (data.allowInvoiceCreation) {
        productId = randomUUID();
        store.products.push({
          id: productId,
          name: line.productName,
          unitType: "Unidades",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        store.inventory.push({
          id: randomUUID(),
          productId,
          quantity: 0,
          lastUpdated: timestamp,
          createdAt: timestamp,
        });
      } else {
        throw new Error(`El producto "${line.productName}" no existe en el catalogo.`);
      }
    }

    const inventory = store.inventory.find((item) => item.productId === productId);
    if (!inventory) {
      throw new Error("Inventario no encontrado para uno de los productos.");
    }

    if (inventory.quantity < line.quantity) {
      if (data.allowInvoiceCreation) {
        inventory.quantity = line.quantity;
      } else {
        throw new Error("No hay suficiente inventario disponible para esta venta.");
      }
    }

    inventory.lastUpdated = timestamp;

    return {
      id: randomUUID(),
      productId,
      quantity: line.quantity,
      pricePerUnit: line.pricePerUnit,
      total: line.quantity * line.pricePerUnit,
    };
  });
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = lines.reduce((sum, line) => sum + line.total, 0);
  const firstLine = lines[0];
  const payment = normalizePayment(totalAmount, data.amountPaid || 0, data.paymentStatus);

  store.incomes.push({
    id: randomUUID(),
    date: dayIso(data.date),
    referenceCode: data.referenceCode || null,
    sourceApp: data.sourceApp || null,
    invoiceNumber: data.invoiceNumber || null,
    clientId: client.id,
    productId: firstLine.productId,
    quantity: totalQuantity,
    pricePerUnit: firstLine.pricePerUnit,
    total: totalAmount,
    amountPaid: payment.amountPaid,
    dueDate: data.dueDate ? dayIso(data.dueDate) : null,
    paymentStatus: payment.paymentStatus,
    paymentNotes: data.paymentNotes || null,
    comprobanteUrl: data.comprobanteUrl || null,
    clientName: client.name,
    createdById: data.createdById,
    lines,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  for (const line of lines) {
    const inventory = store.inventory.find((item) => item.productId === line.productId);
    if (inventory) {
      inventory.quantity -= line.quantity;
      inventory.lastUpdated = timestamp;
    }
  }

  await writeStore(store);
}

export async function getLocalIncomeById(id: string) {
  const store = await readStore();
  const income = store.incomes.find((item) => item.id === id);

  if (!income) {
    return null;
  }

  return {
    id: income.id,
    date: income.date.slice(0, 10),
    referenceCode: income.referenceCode || "",
    sourceApp: income.sourceApp || "",
    invoiceNumber: income.invoiceNumber || "",
    clientName: income.clientName,
    amountPaid: income.amountPaid || 0,
    dueDate: income.dueDate ? income.dueDate.slice(0, 10) : "",
    paymentStatus: income.paymentStatus || PaymentStatus.PENDING,
    paymentNotes: income.paymentNotes || "",
    comprobanteUrl: income.comprobanteUrl || "",
    lines: income.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      quantity: line.quantity,
      pricePerUnit: line.pricePerUnit,
    })),
  };
}

export async function updateLocalIncome(
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
    lines: Array<{
      productId?: string;
      productName?: string;
      quantity: number;
      pricePerUnit: number;
    }>;
  },
) {
  const store = await readStore();
  const income = store.incomes.find((item) => item.id === id);

  if (!income) {
    throw new Error("Registro de venta no encontrado.");
  }

  for (const line of income.lines) {
    const inventory = store.inventory.find((item) => item.productId === line.productId);
    if (inventory) {
      inventory.quantity += line.quantity;
      inventory.lastUpdated = nowIso();
    }
  }

  const timestamp = nowIso();
  const normalizedClientName = data.clientName.trim();
  let client = findClientByName(store, normalizedClientName);

  if (!client) {
    client = {
      id: randomUUID(),
      name: normalizedClientName,
      phone: null,
      rtn: null,
      address: null,
      notes: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.clients.push(client);
  } else {
    client.updatedAt = timestamp;
  }

  const lines = data.lines.map((line) => {
    let productId = line.productId || "";

    if (!productId && line.productName) {
      const matchedProduct = findProductByName(store, line.productName);
      if (matchedProduct) {
        productId = matchedProduct.id;
      } else if (data.allowInvoiceCreation) {
        productId = randomUUID();
        store.products.push({
          id: productId,
          name: line.productName,
          unitType: "Unidades",
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        store.inventory.push({
          id: randomUUID(),
          productId,
          quantity: 0,
          lastUpdated: timestamp,
          createdAt: timestamp,
        });
      } else {
        throw new Error(`El producto "${line.productName}" no existe en el catalogo.`);
      }
    }

    const inventory = store.inventory.find((item) => item.productId === productId);
    if (!inventory) {
      throw new Error("Inventario no encontrado para uno de los productos.");
    }

    if (inventory.quantity < line.quantity) {
      if (data.allowInvoiceCreation) {
        inventory.quantity = line.quantity;
      } else {
        throw new Error("No hay suficiente inventario disponible para esta venta.");
      }
    }

    inventory.lastUpdated = timestamp;

    return {
      id: randomUUID(),
      productId,
      quantity: line.quantity,
      pricePerUnit: line.pricePerUnit,
      total: line.quantity * line.pricePerUnit,
    };
  });

  for (const line of lines) {
    const inventory = store.inventory.find((item) => item.productId === line.productId);
    if (inventory) {
      inventory.quantity -= line.quantity;
      inventory.lastUpdated = timestamp;
    }
  }

  income.date = dayIso(data.date);
  income.referenceCode = data.referenceCode || null;
  income.sourceApp = data.sourceApp || null;
  income.invoiceNumber = data.invoiceNumber || null;
  income.clientId = client.id;
  income.productId = lines[0].productId;
  income.quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  income.pricePerUnit = lines[0].pricePerUnit;
  income.total = lines.reduce((sum, line) => sum + line.total, 0);
  const payment = normalizePayment(income.total, data.amountPaid || 0, data.paymentStatus);
  income.amountPaid = payment.amountPaid;
  income.dueDate = data.dueDate ? dayIso(data.dueDate) : null;
  income.paymentStatus = payment.paymentStatus;
  income.paymentNotes = data.paymentNotes || null;
  income.comprobanteUrl = data.comprobanteUrl || null;
  income.clientName = client.name;
  income.lines = lines;
  income.updatedAt = timestamp;

  await writeStore(store);
  return income;
}

export async function updateLocalIncomePayment(
  id: string,
  data: {
    amountPaid: number;
    paymentNotes?: string;
    markPaid?: boolean;
  },
) {
  const store = await readStore();
  const income = store.incomes.find((item) => item.id === id);

  if (!income) {
    throw new Error("Registro de venta no encontrado.");
  }

  const requestedPaid = data.markPaid ? income.total : data.amountPaid;
  const payment = normalizePayment(income.total, requestedPaid);

  income.amountPaid = payment.amountPaid;
  income.paymentStatus = payment.paymentStatus;
  income.paymentNotes = data.paymentNotes?.trim() || income.paymentNotes || null;
  income.updatedAt = nowIso();

  await writeStore(store);
  return income;
}

export async function deleteLocalIncome(id: string) {
  const store = await readStore();
  const income = store.incomes.find((item) => item.id === id);

  if (!income) {
    throw new Error("Registro de venta no encontrado.");
  }

  for (const line of income.lines) {
    const inventory = store.inventory.find((item) => item.productId === line.productId);
    if (inventory) {
      inventory.quantity += line.quantity;
      inventory.lastUpdated = nowIso();
    }
  }

  store.incomes = store.incomes.filter((item) => item.id !== id);
  await writeStore(store);
}
