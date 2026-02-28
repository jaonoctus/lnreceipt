import { describe, expect, it } from 'vitest'
import { buildReceiptShareUrl } from './utils'

describe('buildReceiptShareUrl', () => {
  it('builds a share route with encoded invoice and preimage', () => {
    const url = buildReceiptShareUrl(
      'https://lnreceipt.example',
      'lnbc1pjabcde1...',
      '00ff11aa',
    )

    expect(url).toBe('https://lnreceipt.example/r/lnbc1pjabcde1.../00ff11aa')
  })

  it('trims trailing slashes from origin', () => {
    const url = buildReceiptShareUrl('https://lnreceipt.example///', 'abc', 'def')

    expect(url).toBe('https://lnreceipt.example/r/abc/def')
  })

  it('encodes reserved URL characters', () => {
    const url = buildReceiptShareUrl('https://lnreceipt.example', 'lnbc1+abc/def', 'aa/bb+cc')

    expect(url).toBe('https://lnreceipt.example/r/lnbc1%2Babc%2Fdef/aa%2Fbb%2Bcc')
  })
})
