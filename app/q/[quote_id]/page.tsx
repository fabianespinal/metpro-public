"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { normalizeQuote, groupItems, type PublicQuoteData } from "@/lib/publicQuote";
import { formatMoneyES } from "@/lib/formatMoney";
import { computePublicTotals } from "@/lib/publicTotals";
import { fmtDay, fmtTimestamp, quoteNotice } from "@/lib/dates";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const fmt = formatMoneyES;


export default function QuotePublicView() {
  const params = useParams();
  const quoteId = params?.quote_id as string;
  const [quote, setQuote] = useState<PublicQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quoteId) return;
    fetch(`${API_URL}/quotes/public/${quoteId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Quote not found");
        return r.json();
      })
      .then((data) => {
        const q = normalizeQuote(data);
        if (!q) throw new Error("Invalid quote");
        setQuote(q);
      })
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

  return <QuoteView quote={quote} quoteId={quoteId} />;
}

export function QuoteView({ quote, quoteId }: { quote: PublicQuoteData; quoteId: string }) {
  const t = computePublicTotals(quote.items, quote.charges);
  const groups = groupItems(quote.items);

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
            <div className="text-2xl font-bold tracking-widest text-gray-900">COTIZACIÓN</div>
            <div className="text-sm text-gray-500 mt-1">{quote.label}</div>
            <div className="text-sm text-gray-400">{fmtTimestamp(quote.created_at)}</div>
          </div>
        </div>

        {/* X-06: rejected or expired quotes say so */}
        {quoteNotice(quote.status, quote.valid_until) && (
          <div role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 sm:px-8">
            {quoteNotice(quote.status, quote.valid_until)}
          </div>
        )}

        {/* Client Info */}
        <div className="p-5 sm:p-8 border-b border-gray-200">
          <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Información del Cliente</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm break-words">
            <div><span className="font-semibold">Cliente:</span> {quote.company_name}</div>
            <div><span className="font-semibold">Contacto:</span> {quote.contact_name}</div>
            <div><span className="font-semibold">Correo:</span> {quote.contact_email}</div>
            <div><span className="font-semibold">Teléfono:</span> {quote.contact_phone}</div>
            {quote.project_name && (
              <div className="sm:col-span-2"><span className="font-semibold">Proyecto:</span> {quote.project_name}</div>
            )}
            {quote.valid_until && (
              <div><span className="font-semibold">Válido hasta:</span> {fmtDay(quote.valid_until)}</div>
            )}
            {quote.payment_terms && (
              <div><span className="font-semibold">Términos de pago:</span> {quote.payment_terms}</div>
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
              {groups.map((group, g) => (
                <Fragment key={g}>
                  {group.heading && (
                    <tr className="bg-gray-100">
                      <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700">
                        {group.heading}
                      </td>
                    </tr>
                  )}
                  {group.items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 sm:px-4 py-3">{item.product_name}</td>
                      <td className="px-3 sm:px-4 py-3 text-right">{item.quantity.toFixed(2)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right">{fmt(item.unit_price)}</td>
                      <td className="px-3 sm:px-4 py-3 text-right">{fmt(item.quantity * item.unit_price)}</td>
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
              <span className="whitespace-nowrap">{fmt(t.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="p-5 sm:p-8 border-b border-gray-200">
            <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Notas</div>
            <p className="text-sm text-gray-600 leading-relaxed">{quote.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-5 sm:p-8 flex justify-center">
          <a
            href={`${API_URL}/quotes/public/${quoteId}/pdf`}
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
