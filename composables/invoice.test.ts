import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockBolt11Decode, mockBolt12Decode } = vi.hoisted(() => ({
  mockBolt11Decode: vi.fn(),
  mockBolt12Decode: vi.fn(),
}))

vi.mock('light-bolt11-decoder', () => ({
  default: { decode: mockBolt11Decode },
}))

vi.mock('bolt12-decoder', () => ({
  default: { decode: mockBolt12Decode },
}))

import { decodeInvoice } from './invoice'

describe('decodeInvoice', () => {
  beforeEach(() => {
    mockBolt11Decode.mockReset()
    mockBolt12Decode.mockReset()
  })

  it('decodes BOLT11 invoices', () => {
    mockBolt11Decode.mockReturnValue({
      sections: [
        { name: 'amount', value: '21000' },
        { name: 'description', value: 'coffee' },
        { name: 'payment_hash', value: 'deadbeef' },
      ],
    })

    const result = decodeInvoice('lnbc1test')

    expect(result).toEqual({
      format: 'bolt11',
      amount: 21,
      description: 'coffee',
      paymentHash: 'deadbeef',
      payeePubKey: null,
      bolt11Raw: {
        sections: [
          { name: 'amount', value: '21000' },
          { name: 'description', value: 'coffee' },
          { name: 'payment_hash', value: 'deadbeef' },
        ],
      },
    })
    expect(mockBolt11Decode).toHaveBeenCalledWith('lnbc1test')
    expect(mockBolt12Decode).not.toHaveBeenCalled()
  })

  it('decodes BOLT12 invoices', () => {
    mockBolt12Decode.mockReturnValue({
      type: 'invoice',
      amount: '15000',
      description: 'tip',
      paymentHash: 'cafebabe',
      nodeId: '02abc',
    })

    const result = decodeInvoice('lni1exampleinvoice')

    expect(result).toEqual({
      format: 'bolt12',
      amount: 15,
      description: 'tip',
      paymentHash: 'cafebabe',
      payeePubKey: '02abc',
      bolt11Raw: null,
    })
    expect(mockBolt12Decode).toHaveBeenCalledWith('lni1exampleinvoice')
    expect(mockBolt11Decode).not.toHaveBeenCalled()
  })

  it('rejects BOLT12 offers because they cannot be verified by preimage', () => {
    mockBolt12Decode.mockReturnValue({
      type: 'offer',
      description: 'tips',
    })

    expect(() => decodeInvoice('lno1offer')).toThrow(
      'BOLT12 offers cannot be verified with a payment preimage. Use a BOLT12 invoice (lni1...).',
    )
  })

  it('rejects BOLT12 invoice requests because they cannot be verified by preimage', () => {
    mockBolt12Decode.mockReturnValue({
      type: 'invoice_request',
      amount: '15000',
    })

    expect(() => decodeInvoice('lnr1request')).toThrow(
      'BOLT12 invoice requests cannot be verified with a payment preimage. Use a BOLT12 invoice (lni1...).',
    )
  })

  it('returns null for empty input', () => {
    expect(decodeInvoice('')).toBeNull()
    expect(mockBolt11Decode).not.toHaveBeenCalled()
    expect(mockBolt12Decode).not.toHaveBeenCalled()
  })
})
