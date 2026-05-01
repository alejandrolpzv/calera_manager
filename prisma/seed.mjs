import { Prisma, PrismaClient, ExpenseCategory, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || "Admin123!", 10);
  const operatorPasswordHash = await bcrypt.hash(
    process.env.DEFAULT_OPERATOR_PASSWORD || "Operator123!",
    10,
  );

  await prisma.user.upsert({
    where: { email: process.env.DEFAULT_ADMIN_EMAIL || "admin@factory.local" },
    update: {
      name: process.env.DEFAULT_ADMIN_NAME || "Factory Admin",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      name: process.env.DEFAULT_ADMIN_NAME || "Factory Admin",
      email: process.env.DEFAULT_ADMIN_EMAIL || "admin@factory.local",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: process.env.DEFAULT_OPERATOR_EMAIL || "operator@factory.local" },
    update: {
      name: process.env.DEFAULT_OPERATOR_NAME || "Factory Operator",
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERATOR,
    },
    create: {
      name: process.env.DEFAULT_OPERATOR_NAME || "Factory Operator",
      email: process.env.DEFAULT_OPERATOR_EMAIL || "operator@factory.local",
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERATOR,
    },
  });

  const seededProducts = [];
  const products = [
    { name: "Calcium Carbonate Standard", unitType: "Sacks of 100 lbs" },
    { name: "Calcium Carbonate Fine", unitType: "Sacks of 100 lbs" },
  ];

  for (const product of products) {
    let created = await prisma.product.findFirst({
      where: {
        name: product.name,
        unitType: product.unitType,
      },
    });

    if (!created) {
      created = await prisma.product.create({
        data: product,
      });
    }

    await prisma.inventory.upsert({
      where: { productId: created.id },
      update: {},
      create: {
        productId: created.id,
        quantity: new Prisma.Decimal(0),
      },
    });
    seededProducts.push(created);
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: process.env.DEFAULT_ADMIN_EMAIL || "admin@factory.local" },
  });

  const standard = seededProducts.find((product) => product.name === "Calcium Carbonate Standard");

  if (!standard) {
    throw new Error("Seed product not found.");
  }

  const sampleExpense = await prisma.expense.findFirst();

  if (!sampleExpense) {
    await prisma.expense.createMany({
      data: [
        {
          date: new Date(),
          category: ExpenseCategory.DIESEL,
          description: "Diesel purchase for plant",
          amount: new Prisma.Decimal(4500),
          createdById: admin.id,
        },
        {
          date: new Date(),
          category: ExpenseCategory.MATERIA_PRIMA,
          description: "Raw material loading",
          amount: new Prisma.Decimal(8200),
          createdById: admin.id,
        },
      ],
    });

    await prisma.production.create({
      data: {
        date: new Date(),
        productId: standard.id,
        quantity: new Prisma.Decimal(120),
        notes: "Initial seeded production batch",
        createdById: admin.id,
      },
    });

    await prisma.inventory.update({
      where: { productId: standard.id },
      data: {
        quantity: { increment: new Prisma.Decimal(120) },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
