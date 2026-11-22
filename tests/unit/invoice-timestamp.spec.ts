import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import { decodeInvoice } from '../../composables/invoice'
import { encodeBolt12 } from '../fixtures/encode'

// Largest instant a JavaScript Date can represent, in seconds.
const maxTimestamp = 8_640_000_000_000n

describe('BOLT12 creation timestamp', () => {
  it('accepts the latest representable date', () => {
    const invoice = decodeInvoice(encodeBolt12({ createdAt: maxTimestamp }))
    expect(invoice.timestamp).toBe(Number(maxTimestamp))
    expect(DateTime.fromSeconds(invoice.timestamp!).isValid).toBe(true)
  })

  it.each([maxTimestamp + 1n, BigInt(Number.MAX_SAFE_INTEGER)])(
    'rejects a timestamp that cannot be shown as a date (%s)',
    (createdAt) => {
      expect(() => decodeInvoice(encodeBolt12({ createdAt }))).toThrow(
        'Invoice timestamp out of range',
      )
    },
  )
})
