import { describe, expect, it } from 'vitest'
import { secp256k1 } from '@noble/curves/secp256k1'
import { decodeInvoice } from '../../composables/invoice'
import { encodeBolt11, sha256, tag, testNodeKey, toHex } from '../fixtures/encode'

const utf8 = new TextEncoder()
const paymentHash = sha256(utf8.encode('payee'))
const signer = secp256k1.getPublicKey(testNodeKey, true)
const someoneElse = secp256k1.getPublicKey(sha256(utf8.encode('another-node-key')), true)

const invoiceNaming = (payee: Uint8Array) =>
  encodeBolt11({
    amount: '15u',
    tags: [
      [tag.paymentHash, paymentHash],
      [tag.payee, payee],
    ],
  })

describe('BOLT11 payee field', () => {
  it('accepts an invoice signed by the payee it names', async () => {
    const invoice = decodeInvoice(invoiceNaming(signer))
    await expect(invoice.getPayeePubkey()).resolves.toBe(toHex(signer))
  })

  it('rejects an invoice signed by a different key than the payee it names', async () => {
    const invoice = decodeInvoice(invoiceNaming(someoneElse))
    await expect(invoice.getPayeePubkey()).rejects.toThrow(
      'Invoice signature does not match its payee',
    )
  })
})
