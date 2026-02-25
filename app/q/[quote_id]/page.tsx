"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface QuoteItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_type?: string;
  discount_value?: number;
}

interface Quote {
  quote_id: string;
  project_name: string;
  notes: string;
  status: string;
  created_at: string;
  valid_until?: string;
  payment_terms?: string;
  total_amount: number;
  company_name: string;
  company_address?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  items: QuoteItem[];
  included_charges: any;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function calcTotals(items: QuoteItem[], charges: any) {
  const itemsTotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  let totalDiscounts = 0;
  for (const item of items) {
    const subtotal = item.quantity * item.unit_price;
    if (item.discount_type === "percentage") {
      totalDiscounts += subtotal * ((item.discount_value || 0) / 100);
    } else if (item.discount_type === "fixed") {
      totalDiscounts += item.discount_value || 0;
    }
  }
  const afterDiscount = itemsTotal - totalDiscounts;
  const supervision = charges?.supervision ? afterDiscount * ((charges.supervision_percentage || 10) / 100) : 0;
  const admin = charges?.admin ? afterDiscount * ((charges.admin_percentage || 4) / 100) : 0;
  const insurance = charges?.insurance ? afterDiscount * ((charges.insurance_percentage || 1) / 100) : 0;
  const transport = charges?.transport ? afterDiscount * ((charges.transport_percentage || 3) / 100) : 0;
  const contingency = charges?.contingency ? afterDiscount * ((charges.contingency_percentage || 3) / 100) : 0;
  const subtotalGeneral = afterDiscount + supervision + admin + insurance + transport + contingency;
  const itbis = subtotalGeneral * 0.18;
  const grandTotal = subtotalGeneral + itbis;
  return {
    itemsTotal, totalDiscounts, afterDiscount,
    supervision, supervisionPct: charges?.supervision_percentage || 10,
    admin, adminPct: charges?.admin_percentage || 4,
    insurance, insurancePct: charges?.insurance_percentage || 1,
    transport, transportPct: charges?.transport_percentage || 3,
    contingency, contingencyPct: charges?.contingency_percentage || 3,
    subtotalGeneral, itbis, grandTotal,
  };
}

export default function QuotePublicView() {
  const params = useParams();
  const quoteId = params?.quote_id as string;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quoteId) return;
    fetch(`${API_URL}/quotes/${quoteId}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("Quote not found");
        return r.json();
      })
      .then(setQuote)
      .catch(() => setError("No se pudo cargar la cotización."))
      .finally(() => setLoading(false));
  }, [quoteId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{error || "Cotización no encontrada."}</p>
      </div>
    );
  }

  const charges = typeof quote.included_charges === "string"
    ? JSON.parse(quote.included_charges)
    : quote.included_charges || {};

  const t = calcTotals(quote.items || [], charges);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-100 rounded-sm">

        {/* Header */}
        <div className="flex justify-between items-start p-8 border-b border-gray-200">
          <div>
            <div className="text-lg font-bold text-gray-900">Metpro SRL</div>
            <div className="text-sm text-gray-500 mt-1">Parque Industrial Disdo</div>
            <div className="text-sm text-gray-500 mt-1">Calle Central No. 1, Hato Nuevo Palave</div>
            <div className="text-sm text-gray-500">Tel: (829) 439-8476 | RNC: 131-71683-2</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-widest text-gray-900">COTIZACIÓN</div>
            <div className="text-sm text-gray-500 mt-1">{quote.quote_id}</div>
            <div className="text-sm text-gray-400">{quote.created_at?.slice(0, 10)}</div>
          </div>
        </div>

        {/* Client Info */}
        <div className="p-8 border-b border-gray-200">
          <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Información del Cliente</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div><span className="font-semibold">Cliente:</span> {quote.company_name}</div>
            <div><span className="font-semibold">Contacto:</span> {quote.contact_name}</div>
            <div><span className="font-semibold">Email:</span> {quote.contact_email}</div>
            <div><span className="font-semibold">Teléfono:</span> {quote.contact_phone}</div>
            {quote.project_name && (
              <div className="col-span-2"><span className="font-semibold">Proyecto:</span> {quote.project_name}</div>
            )}
            {quote.valid_until && (
              <div><span className="font-semibold">Válido hasta:</span> {quote.valid_until}</div>
            )}
            {quote.payment_terms && (
              <div><span className="font-semibold">Términos de pago:</span> {quote.payment_terms}</div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="p-8 border-b border-gray-200">
          <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Detalle de Items</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-4 py-3 font-semibold tracking-wide">Descripción</th>
                <th className="text-right px-4 py-3 font-semibold tracking-wide">Cant.</th>
                <th className="text-right px-4 py-3 font-semibold tracking-wide">Precio Unit.</th>
                <th className="text-right px-4 py-3 font-semibold tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item: QuoteItem, i: number) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3">{item.product_name}</td>
                  <td className="px-4 py-3 text-right">{item.quantity.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{fmt(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right">{fmt(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-8 border-b border-gray-200 flex justify-end">
          <div className="w-80 text-sm">
            <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Resumen Financiero</div>
            {[
              { label: "Subtotal de Items", value: t.itemsTotal, show: true },
              { label: `Supervisión (${t.supervisionPct}%)`, value: t.supervision, show: charges?.supervision },
              { label: `Administración (${t.adminPct}%)`, value: t.admin, show: charges?.admin },
              { label: `Seguro (${t.insurancePct}%)`, value: t.insurance, show: charges?.insurance },
              { label: `Transporte (${t.transportPct}%)`, value: t.transport, show: charges?.transport },
              { label: `Contingencia (${t.contingencyPct}%)`, value: t.contingency, show: charges?.contingency },
              { label: "Subtotal General", value: t.subtotalGeneral, show: true },
              { label: "ITBIS (18%)", value: t.itbis, show: true },
            ].filter(r => r.show).map((row, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">{row.label}</span>
                <span>{fmt(row.value)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 font-bold text-base border-t-2 border-gray-900 mt-1">
              <span>TOTAL GENERAL</span>
              <span>{fmt(t.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="p-8 border-b border-gray-200">
            <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Notas</div>
            <p className="text-sm text-gray-600 leading-relaxed">{quote.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-8 flex justify-center">
          <a
            href={`${API_URL}/quotes/${quoteId}/public/pdf`}
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