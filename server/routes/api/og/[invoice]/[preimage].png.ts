import bolt11 from 'light-bolt11-decoder'

export default defineEventHandler(async (event) => {
  // Get route params - the preimage param includes .png in the key name
  const invoice = getRouterParam(event, 'invoice') || ''
  let preimage = getRouterParam(event, 'preimage.png') || ''

  // Remove .png extension from the preimage value
  if (preimage.endsWith('.png')) {
    preimage = preimage.slice(0, -4)
  }

  let paymentHash = ''
  let amount = '0'
  let description = 'No description'
  let status = 'Invalid Invoice'
  let statusColor = '#ef4444'

  try {
    if (invoice && preimage) {
      // Decode invoice
      const decoded = bolt11.decode(invoice)

      if (decoded) {
        paymentHash =
          decoded.sections.find((section) => section.name === 'payment_hash')?.value || ''
        const amountValue = decoded.sections.find((section) => section.name === 'amount')?.value
        description =
          decoded.sections.find((section) => section.name === 'description')?.value ||
          'No description'

        if (amountValue) {
          amount = Math.floor(Number(amountValue) / 1000).toString()
        }

        // Verify preimage
        const preimageBytes = new Uint8Array(
          preimage.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
        )

        const hashBuffer = await crypto.subtle.digest('SHA-256', preimageBytes)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const computedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

        if (computedHex === paymentHash) {
          status = 'Payment Verified ✓'
          statusColor = '#22c55e'
        } else {
          status = 'Invalid Preimage'
          statusColor = '#ef4444'
        }
      }
    }
  } catch (error) {
    console.error('Error generating OG image:', error)
  }

  // Format payment hash for display (last 16 chars)
  const displayHash = paymentHash
    ? `0x${paymentHash.toUpperCase().slice(Math.max(0, paymentHash.length - 16))}`
    : 'N/A'

  // Escape XML special characters
  const escapeXml = (str: string) =>
    str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
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
          return c
      }
    })

  const safeDescription =
    description.length > 60 ? description.substring(0, 60) + '...' : description

  // Generate SVG image
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap');
          .title { font-family: 'Inter', system-ui, sans-serif; font-size: 56px; font-weight: 700; fill: #ffffff; }
          .label { font-family: 'Inter', system-ui, sans-serif; font-size: 24px; font-weight: 400; fill: #a1a1aa; }
          .value { font-family: 'Inter', system-ui, sans-serif; font-size: 32px; font-weight: 600; fill: #ffffff; }
          .amount { font-family: 'Inter', system-ui, sans-serif; font-size: 40px; font-weight: 700; fill: #ffffff; }
          .mono { font-family: 'Courier New', monospace; }
        </style>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="#09090b"/>

      <!-- Card -->
      <rect x="100" y="80" width="1000" height="470" rx="24" fill="#18181b" stroke="#27272a" stroke-width="1"/>

      <!-- Title -->
      <text x="148" y="160" class="title">⚡ Lightning Invoice</text>

      <!-- Payment Hash -->
      <text x="148" y="230" class="label">Payment Hash</text>
      <text x="148" y="270" class="value mono">${escapeXml(displayHash)}</text>

      <!-- Amount -->
      <text x="148" y="330" class="label">Amount</text>
      <text x="148" y="375" class="amount">${escapeXml(amount)} ${amount === '1' ? 'sat' : 'sats'}</text>

      <!-- Description -->
      <text x="600" y="230" class="label">Description</text>
      <text x="600" y="270" class="value">${escapeXml(safeDescription)}</text>

      <!-- Status -->
      <text x="600" y="330" class="label">Status</text>
      <text x="600" y="370" class="value" fill="${statusColor}">${escapeXml(status)}</text>
    </svg>
  `

  // Set response headers for SVG
  setResponseHeaders(event, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600',
  })

  return svg
})
