import { createHash } from 'node:crypto'
import bolt11 from 'light-bolt11-decoder'

type InvoiceSummary = {
  amountSats: number | null
  description: string
  paymentHash: string
}

function decodeParam(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isHexString(value: string) {
  return value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value)
}

function verifyPreimage(paymentHash: string, preimage: string) {
  if (!paymentHash || !preimage || !isHexString(preimage)) {
    return null
  }

  const computedHash = createHash('sha256')
    .update(Buffer.from(preimage, 'hex'))
    .digest('hex')

  return computedHash === paymentHash
}

function summarizeInvoice(invoice: string): InvoiceSummary {
  try {
    const decoded = bolt11.decode(invoice.toLowerCase())
    const amountValue = decoded.sections.find((section) => section.name === 'amount')?.value
    const description =
      decoded.sections.find((section) => section.name === 'description')?.value ?? 'No description'
    const paymentHash =
      decoded.sections.find((section) => section.name === 'payment_hash')?.value ?? ''

    const amountMsat = Number(amountValue)
    const amountSats = Number.isFinite(amountMsat) ? Math.floor(amountMsat / 1000) : null

    return {
      amountSats,
      description: String(description),
      paymentHash: String(paymentHash),
    }
  } catch {
    return {
      amountSats: null,
      description: 'Invalid invoice',
      paymentHash: '',
    }
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return char
    }
  })
}

function truncate(value: string, max: number) {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max - 3)}...`
}

export default defineEventHandler((event) => {
  const invoiceParam = getRouterParam(event, 'invoice') ?? ''
  const preimageParam = getRouterParam(event, 'preimage') ?? ''

  const invoice = decodeParam(invoiceParam).toLowerCase()
  const preimage = decodeParam(preimageParam).toLowerCase()
  const summary = summarizeInvoice(invoice)
  const preimageCheck = verifyPreimage(summary.paymentHash, preimage)

  let statusLabel = 'Status unavailable'
  let statusColor = '#f59e0b'
  if (preimageCheck === true) {
    statusLabel = 'Payment verified'
    statusColor = '#22c55e'
  } else if (preimageCheck === false) {
    statusLabel = 'Invalid preimage'
    statusColor = '#ef4444'
  } else if (!summary.paymentHash) {
    statusLabel = 'Invalid invoice'
    statusColor = '#ef4444'
  }

  const amountLabel =
    summary.amountSats === null
      ? 'Unknown amount'
      : `${summary.amountSats} ${summary.amountSats === 1 ? 'sat' : 'sats'}`

  const paymentHashLabel = summary.paymentHash
    ? `0x${summary.paymentHash.toUpperCase().slice(-16)}`
    : 'N/A'

  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #09090b; }
      .card { fill: #18181b; stroke: #27272a; stroke-width: 1; }
      .title { fill: #ffffff; font-size: 56px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-weight: 700; }
      .label { fill: #a1a1aa; font-size: 24px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .value { fill: #ffffff; font-size: 32px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-weight: 600; }
      .amount { fill: #ffffff; font-size: 40px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-weight: 700; }
      .mono { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; }
    </style>
  </defs>

  <rect width="1200" height="630" class="bg"/>
  <rect x="100" y="80" width="1000" height="470" rx="24" class="card"/>

  <text x="148" y="160" class="title">Lightning Receipt</text>

  <text x="148" y="230" class="label">Payment Hash</text>
  <text x="148" y="270" class="value mono">${escapeXml(paymentHashLabel)}</text>

  <text x="148" y="330" class="label">Amount</text>
  <text x="148" y="375" class="amount">${escapeXml(amountLabel)}</text>

  <text x="600" y="230" class="label">Description</text>
  <text x="600" y="270" class="value">${escapeXml(truncate(summary.description, 48))}</text>

  <text x="600" y="330" class="label">Status</text>
  <text x="600" y="370" class="value" fill="${statusColor}">${escapeXml(statusLabel)}</text>
</svg>
`

  setResponseHeaders(event, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  })

  return svg
})
