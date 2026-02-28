import bolt11 from 'light-bolt11-decoder'
import BOLT12Decoder, { type Invoice as BOLT12Invoice } from 'bolt12-decoder'
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

function isBolt12(invoice: string) {
  return (
    invoice.startsWith('lni1') || invoice.startsWith('lno1') || invoice.startsWith('lnr1')
  )
}

function toSats(msats: string | number | undefined) {
  const parsed = Number(msats)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.floor(parsed / 1000)
}

function decodeBolt11(invoice: string): DecodedInvoiceResult | null {
  const decoded = bolt11.decode(invoice)

  if (!decoded) {
    return null
  }

  const amount = toSats(decoded.sections.find((section) => section.name === 'amount')?.value)
  const description =
    decoded.sections.find((section) => section.name === 'description')?.value ?? 'empty'
  const paymentHash = decoded.sections.find((section) => section.name === 'payment_hash')?.value

  if (amount === null || !paymentHash) {
    return null
  }

  return {
    format: 'bolt11',
    amount,
    description,
    paymentHash,
    payeePubKey: null,
    bolt11Raw: decoded,
  }
}

function decodeBolt12(invoice: string): DecodedInvoiceResult | null {
  const decoded = BOLT12Decoder.decode(invoice)

  if (decoded.type === 'offer') {
    throw new Error(
      'BOLT12 offers cannot be verified with a payment preimage. Use a BOLT12 invoice (lni1...).',
    )
  }

  if (decoded.type === 'invoice_request') {
    throw new Error(
      'BOLT12 invoice requests cannot be verified with a payment preimage. Use a BOLT12 invoice (lni1...).',
    )
  }

  const invoiceMessage = decoded as BOLT12Invoice
  const amount = toSats(invoiceMessage.amount)

  if (amount === null || !invoiceMessage.paymentHash) {
    return null
  }

  return {
    format: 'bolt12',
    amount,
    description: invoiceMessage.description ?? invoiceMessage.payerNote ?? 'empty',
    paymentHash: invoiceMessage.paymentHash,
    payeePubKey: invoiceMessage.nodeId ?? null,
    bolt11Raw: null,
  }
}

export function decodeInvoice(invoice: string): DecodedInvoiceResult | null {
  const normalizedInvoice = invoice.trim().toLowerCase()

  if (!normalizedInvoice) {
    return null
  }

  if (isBolt12(normalizedInvoice)) {
    return decodeBolt12(normalizedInvoice)
  }

  return decodeBolt11(normalizedInvoice)
}
