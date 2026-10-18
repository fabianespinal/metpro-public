"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { unwrapEnvelope } from "@/lib/publicQuote";
import { formatMoneyES } from "@/lib/formatMoney";
import { computePublicTotals } from "@/lib/publicTotals";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_type?: string;
  discount_value?: number;
  category?: string | null;
}

interface Invoice {
  invoice_number: string;
  notes: string;
  created_at: string;
  company_name: string;
  company_address?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  items: InvoiceItem[];
  included_charges: unknown;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  amount_due?: number | string | null;
  status?: string;
  project_name?: string | null;
  payment_terms?: string | null;
  valid_until?: string | null;
}

const fmt = formatMoneyES;

/** Group lines by category in first-seen order (same rule as the quote page and the PDF). */
function groupByCategory(items: InvoiceItem[]): { heading: string | null; items: InvoiceItem[] }[] {
  if (!items.some((i) => (i.category ?? "").trim())) return [{ heading: null, items }];
  const groups: { heading: string | null; items: InvoiceItem[] }[] = [];
  for (const item of items) {
    const heading = (item.category ?? "").trim() || "Otros";
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.items.push(item);
    else groups.push({ heading, items: [item] });
  }
  return groups;
}


export default function InvoicePublicView() {
  const params = useParams();
  const invoiceId = params?.invoice_id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceId) return;

    fetch(`${API_URL}/invoices/public/${invoiceId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invoice not found");
        return r.json();
      })
      .then((data) => {
        const inv = unwrapEnvelope(data) as Invoice | null;
        if (!inv || typeof inv !== "object") throw new Error("Invalid invoice");
        setInvoice({ ...inv, items: Array.isArray(inv.items) ? inv.items : [] });
      })
      .catch(() => setError("No se pudo cargar la factura."))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{error || "Factura no encontrada."}</p>
      </div>
    );
  }

  const t = computePublicTotals(invoice.items || [], invoice.included_charges);
  // The billed amount is authoritative (same rule as the invoice PDF).
  const billed = invoice.total_amount === null || invoice.total_amount === undefined ? NaN : Number(invoice.total_amount);
  const grandTotal = Number.isFinite(billed) ? billed : t.grandTotal;
  const paidRaw = Number(invoice.amount_paid);
  const paid = Number.isFinite(paidRaw) ? paidRaw : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-10 sm:px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-100 rounded-sm">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start p-5 sm:p-8 border-b border-gray-200">
          <div>
            <div className="text-lg font-bold text-gray-900">Metpro SRL</div>
            <div className="text-sm text-gray-500 mt-1">Parque Industrial Disdo</div>
            <div className="text-sm text-gray-500 mt-1">Calle Central No. 1, Hato Nuevo Palave</div>
            <div className="text-sm text-gray-500">Tel: (829) 439-8476 | RNC: 131-71683-2</div>
          </div>
          <div className="sm:text-right">
            <div className="text-2xl font-bold tracking-widest text-gray-900">FACTURA</div>
            <div className="text-sm text-gray-500 mt-1">{invoice.invoice_number}</div>
            <div className="text-sm text-gray-400">{invoice.created_at?.slice(0, 10)}</div>
          </div>
        </div>

        {/* Client Info */}
        <div className="p-5 sm:p-8 border-b border-gray-200">
          <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Información del Cliente</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm break-words">
            <div><span className="font-semibold">Cliente:</span> {invoice.company_name}</div>
            <div><span className="font-semibold">Contacto:</span> {invoice.contact_name}</div>
            <div><span className="font-semibold">Correo:</span> {invoice.contact_email}</div>
            <div><span className="font-semibold">Teléfono:</span> {invoice.contact_phone}</div>
            {invoice.project_name && (
              <div className="sm:col-span-2"><span className="font-semibold">Proyecto:</span> {invoice.project_name}</div>
            )}
            {invoice.payment_terms && (
              <div><span className="font-semibold">Términos de pago:</span> {invoice.payment_terms}</div>
            )}
            {invoice.valid_until && (
              <div><span className="font-semibold">Válida hasta:</span> {String(invoice.valid_until).slice(0, 10)}</div>
            )}
            {invoice.notes && (
              <div className="sm:col-span-2"><span className="font-semibold">Notas:</span> {invoice.notes}</div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="p-5 sm:p-8 border-b border-gray-200">
          <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Detalle de Items</div>
          <div className="-mx-5 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-3 sm:px-4 py-3 font-semibold tracking-wide">Descripción</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold tracking-wide">Cant.</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold tracking-wide">Precio Unit.</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {groupByCategory(invoice.items).map((group, g) => (
                <Fragment key={g}>
                  {group.heading && (
                    <tr className="bg-gray-100">
                      <td colSpan={4} className="px-3 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700">
                        {group.heading}
                      </td>
                    </tr>
                  )}
                  {group.items.map((item: InvoiceItem, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 sm:px-4 py-3">{item.product_name}</td>
                      <td className="px-3 sm:px-4 py-3 text-right">{Number(item.quantity).toFixed(2)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right">{fmt(Number(item.unit_price))}</td>
                      <td className="px-3 sm:px-4 py-3 text-right">{fmt(Number(item.quantity) * Number(item.unit_price))}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Totals */}
        <div className="p-5 sm:p-8 border-b border-gray-200 flex sm:justify-end">
          <div className="w-full sm:w-80 text-sm">
            <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Resumen Financiero</div>

            {[
              { label: "Subtotal de Items", value: t.itemsTotal, show: true },
              { label: "Total Descuentos", value: -t.totalDiscounts, show: t.totalDiscounts > 0 },
              { label: "Después de Descuentos", value: t.afterDiscount, show: t.totalDiscounts > 0 },
              ...t.charges.map((c) => ({ label: c.label, value: c.value, show: true })),
              { label: "Subtotal General", value: t.subtotalGeneral, show: true },
              { label: "ITBIS (18%)", value: t.itbis, show: true },
            ]
              .filter((r) => r.show)
              .map((row, i) => (
                <div key={i} className="flex justify-between gap-4 py-2 border-b border-gray-100">
                  <span className="text-gray-600">{row.label}</span>
                  <span className="whitespace-nowrap">{fmt(row.value)}</span>
                </div>
              ))}

            <div className="flex justify-between py-3 font-bold text-base border-t-2 border-gray-900 mt-1">
              <span>TOTAL GENERAL</span>
              <span className="whitespace-nowrap">{fmt(grandTotal)}</span>
            </div>
            {paid > 0 && (
              <>
                <div className="flex justify-between gap-4 py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total pagado</span>
                  <span className="whitespace-nowrap">{fmt(paid)}</span>
                </div>
                <div className="flex justify-between gap-4 py-2 font-semibold">
                  <span>Pendiente</span>
                  <span className="whitespace-nowrap">{fmt(Math.max(grandTotal - paid, 0))}</span>
                </div>
              </>
            )}
            {invoice.status === "Paid" && (
              <div className="mt-3 rounded-sm bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">Pagada</div>
            )}
          </div>
        </div>

        {/* PDF */}
        <div className="p-5 sm:p-8 flex justify-center">
          <a
            href={`${API_URL}/invoices/public/${invoiceId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-gray-900 text-white text-sm font-semibold tracking-widest uppercase hover:bg-gray-700 transition-colors"
          >
            Descargar PDF
          </a>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 text-center text-xs text-gray-300">
          Generado por METPRO · metprord.com
        </div>
      </div>
    </div>
  );
}