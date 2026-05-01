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
  }>;
  income: Array<{
    id?: string;
    date: Date;
    referenceCode?: string | null;
    productName: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
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
  function exportExcel() {
    const sections = [
      buildTable("Resumen", [
      ["Desde", "Hasta", "Total Gastos", "Total Ingresos", "Utilidad", "Total Produccion", "Costo por Unidad"],
      [
        data.from,
        data.to,
        data.summary.totalExpenses,
        data.summary.totalIncome,
        data.summary.profit,
        data.summary.totalProduction,
        data.summary.costPerUnit,
      ],
      ]),

      buildTable("Gastos", [
        ["Fecha", "Categoria", "Descripcion", "Monto", "Creado Por"],
        ...data.expenses.map((item) => [
          formatDate(item.date),
          item.category,
          item.description,
          item.amount,
          item.createdBy,
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
          item.amountPaid || 0,
          item.balanceDue || 0,
          item.paymentStatus || "",
          item.comprobanteUrl || "",
          item.clientName,
          item.createdBy,
        ]),
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
    pdf.text("Reporte de Fabrica", 14, 18);
    pdf.setFontSize(11);
    pdf.text(`Rango: ${data.from} a ${data.to}`, 14, 26);

    autoTable(pdf, {
      startY: 34,
      head: [["Metrica", "Valor"]],
      body: [
        ["Total Gastos", formatCurrency(data.summary.totalExpenses)],
        ["Total Ingresos", formatCurrency(data.summary.totalIncome)],
        ["Utilidad", formatCurrency(data.summary.profit)],
        ["Total Produccion", formatNumber(data.summary.totalProduction)],
        ["Costo por Unidad", formatCurrency(data.summary.costPerUnit)],
      ],
    });

    autoTable(pdf, {
      startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 44) + 10
        : 80,
      head: [["Gasto", "Categoria", "Monto"]],
      body: data.expenses.slice(0, 12).map((item) => [
        `${formatDate(item.date)} - ${item.description}`,
        item.category,
        formatCurrency(item.amount),
      ]),
    });

    autoTable(pdf, {
      startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120) + 10
        : 140,
      head: [["Venta", "Productos", "Total"]],
      body: data.income.slice(0, 10).map((item) => [
        `${formatDate(item.date)} - ${item.clientName}${item.referenceCode ? ` (${item.referenceCode})` : ""}`,
        item.lines?.map((line) => `${line.productName} x ${formatNumber(line.quantity)}`).join(", ") || item.productName,
        formatCurrency(item.total),
      ]),
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
