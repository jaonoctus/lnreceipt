import bolt11 from 'light-bolt11-decoder'
import BOLT12Decoder from 'bolt12-decoder'
import type { DecodedInvoice as Bolt11DecodedInvoice } from 'light-bolt11-decoder'

export type InvoiceFormat = 'bolt11' | 'bolt12'

export interface DecodedInvoiceResult {
  format: InvoiceFormat
  amount: number
  description: string
  paymentHash: string
  payeePubKey: string | null
  bolt11Raw: Bolt11DecodedInvoice | null
}

function detectFormat(invoice: string): InvoiceFormat {
  const lower = invoice.toLowerCase().trim()
  if (lower.startsWith('lni1') || lower.startsWith('lno1') || lower.startsWith('lnr1')) {
    return 'bolt12'
  }
  return 'bolt11'
}

function decodeBolt11Invoice(invoice: string): DecodedInvoiceResult | null {
  const decoded = bolt11.decode(invoice)
  if (!decoded) return null

  const amount = decoded.sections.find((s) => s.name === 'amount')?.value
  const description =
    decoded.sections.find((s) => s.name === 'description')?.value ?? 'empty'
  const paymentHash =
    decoded.sections.find((s) => s.name === 'payment_hash')?.value ?? ''

  if (!amount) return null

  return {
    format: 'bolt11',
    amount: Math.floor(Number(amount) / 1000),
    description,
    paymentHash,
    payeePubKey: null,
    bolt11Raw: decoded,
  }
}

function decodeBolt12Invoice(invoice: string): DecodedInvoiceResult | null {
  const decoded = BOLT12Decoder.decode(invoice)

  if (decoded.type === 'offer' || decoded.type === 'invoice_request') {
    throw new Error(
      `BOLT12 ${decoded.type === 'offer' ? 'offers' : 'invoice requests'} cannot be verified. Please use a BOLT12 invoice (starts with lni1).`,
    )
  }

  if (decoded.type !== 'invoice' || !decoded.paymentHash) return null

  return {
    format: 'bolt12',
    amount: decoded.amount ? Math.floor(Number(decoded.amount) / 1000) : 0,
    description: decoded.description ?? decoded.payerNote ?? 'empty',
    paymentHash: decoded.paymentHash,
    payeePubKey: decoded.nodeId ?? null,
    bolt11Raw: null,
  }
}

export function decodeInvoice(invoice: string): DecodedInvoiceResult | null {
  if (!invoice) return null

  const format = detectFormat(invoice)
  if (format === 'bolt12') return decodeBolt12Invoice(invoice)
  return decodeBolt11Invoice(invoice)
}
