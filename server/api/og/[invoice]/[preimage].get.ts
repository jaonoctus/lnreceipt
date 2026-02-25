import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { createHash } from 'node:crypto'
import bolt11 from 'light-bolt11-decoder'

const GOOGLE_FONT_URL =
  'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf'
const GOOGLE_FONT_BOLD_URL =
  'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf'

let fontRegularCache: ArrayBuffer | null = null
let fontBoldCache: ArrayBuffer | null = null

async function loadFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  return response.arrayBuffer()
}

async function getFonts() {
  if (!fontRegularCache) {
    fontRegularCache = await loadFont(GOOGLE_FONT_URL)
  }
  if (!fontBoldCache) {
    fontBoldCache = await loadFont(GOOGLE_FONT_BOLD_URL)
  }
  return [
    { name: 'Inter', data: fontRegularCache, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: fontBoldCache, weight: 700 as const, style: 'normal' as const },
  ]
}

function decodeInvoice(invoice: string) {
  const decoded = bolt11.decode(invoice)
  if (!decoded) return null

  const amount = decoded.sections.find((s) => s.name === 'amount')?.value
  const description = decoded.sections.find((s) => s.name === 'description')?.value ?? 'empty'
  const paymentHash = decoded.sections.find((s) => s.name === 'payment_hash')?.value ?? ''

  if (!amount) return null

  return {
    amount: Math.floor(Number(amount) / 1000),
    description,
    paymentHash,
  }
}

function verifyPreimage(preimage: string, paymentHash: string): boolean {
  const preimageBuffer = Buffer.from(preimage, 'hex')
  const hash = createHash('sha256').update(preimageBuffer).digest('hex')
  return hash === paymentHash
}

function formatHash(text: string): string {
  const long = text.replace(/\s+/g, '').toUpperCase().slice(Math.max(0, text.length - 16))
  return `0x${long}`
}

function truncateDescription(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function buildOgLayout(
  amount: number,
  description: string,
  paymentHash: string,
  isPaid: boolean,
) {
  const statusColor = isPaid ? '#22c55e' : '#ef4444'
  const statusText = isPaid ? 'Payment successful!' : 'Invalid preimage'
  const statusIcon = isPaid ? '\u2713' : '\u2717'
  const amountText = `${amount.toLocaleString()} ${amount === 1 ? 'sat' : 'sats'}`

  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1412',
        color: '#fafaf9',
        fontFamily: 'Inter',
        padding: '60px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              marginBottom: '10px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: { fontSize: '44px', marginRight: '16px' },
                  children: '\u26A1',
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '44px',
                    fontWeight: 700,
                    color: '#e5730a',
                  },
                  children: 'Lightning Receipt',
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '18px',
              color: '#a8a29e',
              marginBottom: '40px',
            },
            children: 'Cryptographic proof of Lightning Network payment',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              height: '1px',
              backgroundColor: '#2a2420',
              width: '100%',
              marginBottom: '40px',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              flex: '1',
            },
            children: [
              buildRow('Amount', amountText, true),
              buildRow('Description', truncateDescription(description)),
              buildRow('Payment Hash', formatHash(paymentHash)),
              buildRow('Status', `${statusIcon} ${statusText}`, false, statusColor),
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              height: '1px',
              backgroundColor: '#2a2420',
              width: '100%',
              marginTop: '30px',
              marginBottom: '20px',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '18px',
              color: '#78716c',
              textAlign: 'right',
            },
            children: 'lnreceipt',
          },
        },
      ],
    },
  }
}

function buildRow(label: string, value: string, highlight = false, valueColor?: string) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        {
          type: 'span',
          props: {
            style: { fontSize: '22px', color: '#a8a29e' },
            children: label,
          },
        },
        {
          type: 'span',
          props: {
            style: {
              fontSize: highlight ? '28px' : '22px',
              fontWeight: highlight ? 700 : 400,
              color: valueColor || (highlight ? '#fafaf9' : '#d6d3d1'),
            },
            children: value,
          },
        },
      ],
    },
  }
}

export default defineEventHandler(async (event) => {
  const invoice = decodeURIComponent(getRouterParam(event, 'invoice') || '')
  const preimage = decodeURIComponent(getRouterParam(event, 'preimage') || '')

  if (!invoice || !preimage) {
    throw createError({ statusCode: 400, statusMessage: 'Missing invoice or preimage' })
  }

  try {
    const decoded = decodeInvoice(invoice)
    if (!decoded) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid invoice' })
    }

    const isPaid = verifyPreimage(preimage, decoded.paymentHash)
    const layout = buildOgLayout(decoded.amount, decoded.description, decoded.paymentHash, isPaid)
    const fonts = await getFonts()

    const svg = await satori(layout, {
      width: 1200,
      height: 630,
      fonts,
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
    })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    setResponseHeader(event, 'Content-Type', 'image/png')
    setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

    return pngBuffer
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('OG image generation failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to generate OG image' })
  }
})
