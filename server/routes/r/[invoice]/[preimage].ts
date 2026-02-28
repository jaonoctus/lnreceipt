import { createHash } from 'node:crypto'
import bolt11 from 'light-bolt11-decoder'

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

function escapeHtml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&#39;'
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
  const requestUrl = getRequestURL(event)
  const origin = requestUrl.origin

  const invoiceParam = getRouterParam(event, 'invoice') ?? ''
  const preimageParam = getRouterParam(event, 'preimage') ?? ''

  const invoice = decodeParam(invoiceParam).toLowerCase()
  const preimage = decodeParam(preimageParam).toLowerCase()

  let amountSats: number | null = null
  let description = 'Lightning payment receipt'
  let paymentHash = ''

  try {
    const decoded = bolt11.decode(invoice)
    const amountValue = decoded.sections.find((section) => section.name === 'amount')?.value
    const decodedDescription = decoded.sections.find((section) => section.name === 'description')?.value
    const decodedHash = decoded.sections.find((section) => section.name === 'payment_hash')?.value

    const amountMsat = Number(amountValue)
    amountSats = Number.isFinite(amountMsat) ? Math.floor(amountMsat / 1000) : null
    description = decodedDescription ? String(decodedDescription) : description
    paymentHash = decodedHash ? String(decodedHash) : ''
  } catch {
    description = 'Invalid invoice'
  }

  const preimageCheck = verifyPreimage(paymentHash, preimage)
  const status =
    preimageCheck === true
      ? 'Payment verified'
      : preimageCheck === false
        ? 'Invalid preimage'
        : paymentHash
          ? 'Verification pending'
          : 'Invalid invoice'

  const amountLabel =
    amountSats === null ? 'Unknown amount' : `${amountSats} ${amountSats === 1 ? 'sat' : 'sats'}`

  const title = amountSats === null ? 'Lightning Receipt' : `Lightning Receipt • ${amountLabel}`
  const metaDescription = `${status}. ${truncate(description, 96)}`

  const encodedInvoice = encodeURIComponent(invoice)
  const encodedPreimage = encodeURIComponent(preimage)

  const shareUrl = `${origin}/r/${encodedInvoice}/${encodedPreimage}`
  const appUrl = `${origin}/?invoice=${encodedInvoice}&preimage=${encodedPreimage}`
  const ogImageUrl = `${origin}/api/og/${encodedInvoice}/${encodedPreimage}.svg`

  setResponseHeaders(event, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  })

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(metaDescription)}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl)}" />

    <script>
      window.location.replace(${JSON.stringify(appUrl)});
    </script>
  </head>
  <body>
    Redirecting to receipt...
    <a href="${escapeHtml(appUrl)}">Open receipt</a>
  </body>
</html>
`
})
