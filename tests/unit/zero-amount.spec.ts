import { describe, expect, it } from 'vitest'
import { decodeInvoice } from '../../composables/invoice'
import { encodeBolt11, encodeBolt12, sha256, tag } from '../fixtures/encode'

const paymentHash = sha256(new TextEncoder().encode('zero-amount'))

describe('zero amount invoices', () => {
  it('rejects a BOLT12 invoice with a zero amount', () => {
    expect(() => decodeInvoice(encodeBolt12({ amountMsat: 0n }))).toThrow('Invoice has no amount')
  })

  it('rejects a BOLT11 invoice with an explicit zero amount', () => {
    const invoice = encodeBolt11({ amount: '0u', tags: [[tag.paymentHash, paymentHash]] })
    expect(() => decodeInvoice(invoice)).toThrow('Invoice has no amount')
  })

  it('rejects a BOLT11 invoice without an amount', () => {
    const invoice = encodeBolt11({ tags: [[tag.paymentHash, paymentHash]] })
    expect(() => decodeInvoice(invoice)).toThrow('Invoice has no amount')
  })

  it('still accepts sub-satoshi amounts', () => {
    expect(decodeInvoice(encodeBolt12({ amountMsat: 1n })).amount).toBe(0)
    expect(decodeInvoice(encodeBolt12({ amountMsat: 1500000n })).amount).toBe(1500)
  })
})
