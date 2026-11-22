import { describe, expect, it } from 'vitest'
import { decodeInvoice } from '../../composables/invoice'
import { encodeBolt11, sha256, tag, toHex } from '../fixtures/encode'

const utf8 = new TextEncoder()
const description: [number, Uint8Array] = [tag.description, utf8.encode('no hash')]
const paymentHash = sha256(utf8.encode('payment-hash'))

describe('BOLT11 payment hash', () => {
  it('reads a well-formed payment hash', () => {
    const invoice = encodeBolt11({ amount: '15u', tags: [[tag.paymentHash, paymentHash]] })
    expect(decodeInvoice(invoice).paymentHash).toBe(toHex(paymentHash))
  })

  it('rejects an invoice without a payment hash', () => {
    const invoice = encodeBolt11({ amount: '15u', tags: [description] })
    expect(() => decodeInvoice(invoice)).toThrow('Invoice has no valid payment hash')
  })

  it('rejects a payment hash of the wrong length', () => {
    const invoice = encodeBolt11({
      amount: '15u',
      tags: [[tag.paymentHash, paymentHash.slice(0, 20)], description],
    })
    expect(() => decodeInvoice(invoice)).toThrow('Invoice has no valid payment hash')
  })
})
