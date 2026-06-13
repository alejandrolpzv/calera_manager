"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

type ReportData = {
  from: string;
  to: string;
  summary: {
    totalExpenses: number;
    totalIncome: number;
    totalSales: number;
    totalEstimatedProductionCost?: number;
    estimatedGrossMargin?: number;
    rawMaterialTrips?: number;
    rawMaterialPounds?: number;
    expectedProductionFromStone?: number;
    productionVarianceFromStone?: number;
    totalProduction: number;
    profit: number;
    costPerUnit: number;
  };
  expenses: Array<{
    id: string;
    date: Date;
    category: string;
    description: string;
    amount: number;
    createdBy: string;
    payrollLines?: Array<{
      id: string;
      employeeName: string;
      workDays?: number;
      dailySalary?: number;
      bonuses?: number;
      deductions?: number;
      amount: number;
      notes?: string | null;
    }>;
    rawMaterialLines?: Array<{
      id: string;
      materialName: string;
      trips: number;
      poundsPerTrip: number;
      totalPounds: number;
      expectedProductionUnits: number;
      notes?: string | null;
    }>;
  }>;
  income: Array<{
    id?: string;
    date: Date;
    referenceCode?: string | null;
    productName: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
    estimatedCost?: number;
    grossMargin?: number;
    amountPaid?: number;
    balanceDue?: number;
    paymentStatus?: string;
    invoiceNumber?: string | null;
    comprobanteUrl?: string | null;
    clientName: string;
    createdBy: string;
    lines?: Array<{
      id: string;
      productName: string;
      quantity: number;
      pricePerUnit: number;
      estimatedUnitCost?: number;
      estimatedCost?: number;
      total: number;
    }>;
  }>;
  production: Array<{
    date: Date;
    productName: string;
    quantity: number;
    notes?: string | null;
    createdBy: string;
  }>;
};

function escapeCell(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildTable(title: string, rows: Array<Array<string | number>>) {
  const [headers, ...body] = rows;

  return `
    <h2>${escapeCell(title)}</h2>
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${body
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

export function ReportActions({ data }: { data: ReportData }) {
  const pendingTotal = data.income.reduce((sum, item) => sum + (item.balanceDue || 0), 0);
  const totalEstimatedProductionCost = data.summary.totalEstimatedProductionCost || 0;
  const estimatedGrossMargin = data.summary.estimatedGrossMargin ?? data.summary.totalSales - totalEstimatedProductionCost;
  const payrollRows = data.expenses.flatMap((expense) =>
    (expense.payrollLines || []).map((line) => ({
      expense,
      line,
    })),
  );
  const rawMaterialRows = data.expenses.flatMap((expense) =>
    (expense.rawMaterialLines || []).map((line) => ({
      expense,
      line,
    })),
  );
  const collectionRate = data.summary.totalSales > 0
    ? (data.summary.totalIncome / data.summary.totalSales) * 100
    : 0;

  function exportExcel() {
    const sections = [
      buildTable("Resumen", [
        [
          "Desde",
          "Hasta",
          "Ventas Facturadas",
          "Cobrado",
          "Pendiente",
          "Gastos",
          "Costo Prod. Ventas",
          "Margen Bruto Est.",
          "Viajes Piedra",
          "Libras Piedra",
          "Prod. Esperada Piedra",
          "Diferencia vs Prod.",
          "Utilidad Caja",
          "Produccion",
          "Costo por Unidad",
          "% Cobranza",
        ],
        [
          data.from,
          data.to,
          data.summary.totalSales,
          data.summary.totalIncome,
          pendingTotal,
          data.summary.totalExpenses,
          totalEstimatedProductionCost,
          estimatedGrossMargin,
          data.summary.rawMaterialTrips || 0,
          data.summary.rawMaterialPounds || 0,
          data.summary.expectedProductionFromStone || 0,
          data.summary.productionVarianceFromStone || 0,
          data.summary.profit,
          data.summary.totalProduction,
          data.summary.costPerUnit,
          `${formatNumber(collectionRate)}%`,
        ],
      ]),

      buildTable("Gastos", [
        ["Fecha", "Categoria", "Descripcion", "Monto", "Creado Por", "Detalle Planilla"],
        ...data.expenses.map((item) => [
          formatDate(item.date),
          item.category,
          item.description,
          item.amount,
          item.createdBy,
          item.payrollLines?.length
            ? item.payrollLines
                .map((line) => `${line.employeeName}: ${line.workDays || 0} dias, ${line.amount}`)
                .join(" | ")
            : "",
        ]),
      ]),

      buildTable("Planilla Detallada", [
        [
          "Fecha",
          "Gasto",
          "Empleado",
          "Dias",
          "Salario Diario",
          "Bonos",
          "Deducciones",
          "Monto",
          "Notas",
        ],
        ...payrollRows.map(({ expense, line }) => [
          formatDate(expense.date),
          expense.description,
          line.employeeName,
          line.workDays || 0,
          line.dailySalary || 0,
          line.bonuses || 0,
          line.deductions || 0,
          line.amount,
          line.notes || "",
        ]),
      ]),

      buildTable("Materia Prima Detallada", [
        [
          "Fecha",
          "Gasto",
          "Subgrupo",
          "Viajes",
          "Libras/Viaje",
          "Libras Totales",
          "Produccion Esperada",
          "Notas",
        ],
        ...rawMaterialRows.map(({ expense, line }) => [
          formatDate(expense.date),
          expense.description,
          line.materialName,
          line.trips,
          line.poundsPerTrip,
          line.totalPounds,
          line.expectedProductionUnits,
          line.notes || "",
        ]),
      ]),

      buildTable("Ingresos", [
        [
          "Fecha",
          "Referencia",
          "Factura",
          "Producto",
          "Cantidad",
          "Precio/Unidad",
          "Total",
          "Costo Estimado",
          "Margen Bruto",
          "Pagado",
          "Saldo",
          "Estado de Pago",
          "Comprobante",
          "Cliente",
          "Creado Por",
        ],
        ...data.income.map((item) => [
          formatDate(item.date),
          item.referenceCode || "",
          item.invoiceNumber || "",
          item.productName,
          item.quantity,
          item.pricePerUnit,
          item.total,
          item.estimatedCost || 0,
          item.grossMargin || 0,
          item.amountPaid || 0,
          item.balanceDue || 0,
          item.paymentStatus || "",
          item.comprobanteUrl || "",
          item.clientName,
          item.createdBy,
        ]),
      ]),

      buildTable("Lineas de Ingreso", [
        [
          "Fecha",
          "Cliente",
          "Factura",
          "Producto",
          "Cantidad",
          "Precio/Unidad",
          "Costo/Unidad",
          "Costo Estimado",
          "Total",
        ],
        ...data.income.flatMap((item) =>
          (item.lines?.length ? item.lines : []).map((line) => [
            formatDate(item.date),
            item.clientName,
            item.invoiceNumber || item.referenceCode || "",
            line.productName,
            line.quantity,
            line.pricePerUnit,
            line.estimatedUnitCost || 0,
            line.estimatedCost || 0,
            line.total,
          ]),
        ),
      ]),

      buildTable("Produccion", [
        ["Fecha", "Producto", "Cantidad", "Notas", "Creado Por"],
        ...data.production.map((item) => [
          formatDate(item.date),
          item.productName,
          item.quantity,
          item.notes || "",
          item.createdBy,
        ]),
      ]),
    ];

    const documentHtml = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; }
            h2 { color: #0f766e; }
            table { border-collapse: collapse; margin-bottom: 28px; width: 100%; }
            th { background: #0f766e; color: white; text-align: left; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; }
          </style>
        </head>
        <body>${sections.join("")}</body>
      </html>
    `;
    const blob = new Blob([documentHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `reporte-fabrica-${data.from}-a-${data.to}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("Estado de la Planta", 14, 18);
    pdf.setFontSize(11);
    pdf.text(`Rango: ${data.from} a ${data.to}`, 14, 26);

    autoTable(pdf, {
      startY: 34,
      head: [["Metrica", "Valor"]],
      body: [
        ["Ventas Facturadas", formatCurrency(data.summary.totalSales)],
        ["Cobrado", formatCurrency(data.summary.totalIncome)],
        ["Pendiente", formatCurrency(pendingTotal)],
        ["Gastos", formatCurrency(data.summary.totalExpenses)],
        ["Costo Prod. Ventas", formatCurrency(totalEstimatedProductionCost)],
        ["Margen Bruto Est.", formatCurrency(estimatedGrossMargin)],
        ["Viajes Piedra", formatNumber(data.summary.rawMaterialTrips || 0)],
        ["Libras Piedra", formatNumber(data.summary.rawMaterialPounds || 0)],
        ["Prod. Esperada Piedra", formatNumber(data.summary.expectedProductionFromStone || 0)],
        ["Diferencia vs Prod.", formatNumber(data.summary.productionVarianceFromStone || 0)],
        ["Utilidad Caja", formatCurrency(data.summary.profit)],
        ["Produccion", formatNumber(data.summary.totalProduction)],
        ["Costo por Unidad", formatCurrency(data.summary.costPerUnit)],
        ["Cobranza", `${formatNumber(collectionRate)}%`],
      ],
    });

    autoTable(pdf, {
      startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 44) + 10
        : 80,
      head: [["Fecha", "Gasto", "Categoria", "Monto", "Planilla"]],
      body: data.expenses.map((item) => [
        formatDate(item.date),
        item.description,
        item.category,
        formatCurrency(item.amount),
        item.payrollLines?.length
          ? item.payrollLines.map((line) => `${line.employeeName}: ${formatCurrency(line.amount)}`).join("\n")
          : "",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        1: { cellWidth: 58 },
        4: { cellWidth: 45 },
      },
    });

    if (payrollRows.length) {
      autoTable(pdf, {
        startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
          ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120) + 10
          : 140,
        head: [["Planilla", "Empleado", "Dias", "Salario", "Bonos", "Deducciones", "Monto"]],
        body: payrollRows.map(({ expense, line }) => [
          formatDate(expense.date),
          line.employeeName,
          formatNumber(line.workDays || 0),
          formatCurrency(line.dailySalary || 0),
          formatCurrency(line.bonuses || 0),
          formatCurrency(line.deductions || 0),
          formatCurrency(line.amount),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
      });
    }

    if (rawMaterialRows.length) {
      autoTable(pdf, {
        startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
          ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120) + 10
          : 140,
        head: [["Materia Prima", "Subgrupo", "Viajes", "Lb/Viaje", "Lb Total", "Prod. Esperada"]],
        body: rawMaterialRows.map(({ expense, line }) => [
          `${formatDate(expense.date)} - ${expense.description}`,
          line.materialName,
          formatNumber(line.trips),
          formatNumber(line.poundsPerTrip),
          formatNumber(line.totalPounds),
          formatNumber(line.expectedProductionUnits),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
      });
    }

    autoTable(pdf, {
      startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120) + 10
        : 140,
      head: [["Venta", "Productos", "Total", "Margen Est."]],
      body: data.income.map((item) => [
        `${formatDate(item.date)} - ${item.clientName}${item.referenceCode ? ` (${item.referenceCode})` : ""}`,
        item.lines?.map((line) => `${line.productName} x ${formatNumber(line.quantity)}`).join(", ") || item.productName,
        formatCurrency(item.total),
        formatCurrency(item.grossMargin || 0),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 80 },
      },
    });

    autoTable(pdf, {
      startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 160) + 10
        : 180,
      head: [["Produccion", "Producto", "Cantidad", "Notas"]],
      body: data.production.map((item) => [
        formatDate(item.date),
        item.productName,
        formatNumber(item.quantity),
        item.notes || "",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
    });

    pdf.save(`reporte-fabrica-${data.from}-a-${data.to}.pdf`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button variant="secondary" onClick={exportExcel}>
        Exportar Excel
      </Button>
      <Button onClick={exportPdf}>Exportar PDF</Button>
    </div>
  );
}
