import { describe, expect, it } from 'vitest'
import { decodeInvoice } from '../../composables/invoice'
import { encodeBolt11, sha256, tag } from '../fixtures/encode'
import { validReceipt } from '../fixtures/receipt'

const paymentHash = sha256(new TextEncoder().encode('amount-precision'))

describe('BOLT11 amount conversion', () => {
  it('decodes invoices built by the test encoder like real ones', async () => {
    const invoice = decodeInvoice(
      encodeBolt11({ amount: '15u', tags: [[tag.paymentHash, paymentHash]] }),
    )
    expect(invoice.amount).toBe(1500)
    await expect(invoice.getPayeePubkey()).resolves.toBe(validReceipt.payeePubkey)
  })

  it('keeps full precision for amounts above Number.MAX_SAFE_INTEGER millisatoshis', () => {
    // 1,999,999,999,999,999,999 msat: not representable as a double.
    const invoice = decodeInvoice(
      encodeBolt11({ amount: '19999999999999999990p', tags: [[tag.paymentHash, paymentHash]] }),
    )
    expect(invoice.amount).toBe(1999999999999999)
  })

  it('floors sub-satoshi amounts', () => {
    const invoice = decodeInvoice(
      encodeBolt11({ amount: '15990p', tags: [[tag.paymentHash, paymentHash]] }),
    )
    expect(invoice.amount).toBe(1)
  })
})
