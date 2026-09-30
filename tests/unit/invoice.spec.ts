import { describe, expect, it } from 'vitest'
import { decodeInvoice } from '../../composables/invoice'
import { bolt12Receipt, validReceipt } from '../fixtures/receipt'

describe('receipt invoice decoding', () => {
  it('preserves BOLT11 decoding and payee recovery', async () => {
    const invoice = decodeInvoice(validReceipt.invoice)
    expect(invoice.amount).toBe(validReceipt.amountSats)
    expect(invoice.paymentHash).toBe(validReceipt.paymentHash)
    await expect(invoice.getPayeePubkey()).resolves.toBe(validReceipt.payeePubkey)
  })

  it('decodes the supplied BOLT12 invoice and verifies its signature', async () => {
    const invoice = decodeInvoice(bolt12Receipt.invoice)
    expect(invoice.paymentHash).toBe(bolt12Receipt.paymentHash)
    expect(invoice.amount).toBeGreaterThan(0)
    await expect(invoice.getPayeePubkey()).resolves.toMatch(/^0[23][0-9a-f]{64}$/)
    const preimage = Uint8Array.from(bolt12Receipt.preimage.match(/.{2}/g)!, (byte) =>
      parseInt(byte, 16),
    )
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', preimage))
    expect(Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('')).toBe(
      invoice.paymentHash,
    )
  })

  it('supports uppercase and continuation separators', () => {
    const continued = bolt12Receipt.invoice.slice(0, 80) + '+\n  ' + bolt12Receipt.invoice.slice(80)
    expect(decodeInvoice(continued.toUpperCase()).paymentHash).toBe(bolt12Receipt.paymentHash)
  })

  it.each(['lni1!', 'lni1q', 'lno1qq', 'lnr1qq'])(
    'rejects malformed or non-invoice input %s',
    (input) => {
      expect(() => decodeInvoice(input)).toThrow()
    },
  )

  it('rejects mixed case', () => {
    expect(() => decodeInvoice('LNI' + bolt12Receipt.invoice.slice(3))).toThrow()
  })

  it('rejects a changed signature', async () => {
    const changed = bolt12Receipt.invoice.slice(0, -2) + 'qq'
    await expect(decodeInvoice(changed).getPayeePubkey()).rejects.toThrow(
      'Invalid BOLT12 signature',
    )
  })
})
