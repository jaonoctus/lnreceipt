import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { decode } from 'light-bolt11-decoder'

import {
  cn,
  strToHex,
  byteArrayToHexString,
  bech32To8BitArray,
  getPubkeyFromSignature,
  useForm,
} from '~/composables/utils'
import { validReceipt } from '../fixtures/receipt'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'text-sm')).toBe('px-2 text-sm')
  })

  it('resolves conflicting tailwind classes, last one wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional values', () => {
    expect(cn('base', false && 'hidden', undefined, { block: true })).toBe('base block')
  })
})

describe('strToHex', () => {
  it('converts an ascii string to hex', () => {
    expect(strToHex('lnbc')).toBe('6c6e6263')
  })

  it('returns an empty string for an empty input', () => {
    expect(strToHex('')).toBe('')
  })
})

describe('byteArrayToHexString', () => {
  it('converts bytes to a lowercase hex string', () => {
    expect(byteArrayToHexString(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef')
  })

  it('zero-pads single-digit bytes', () => {
    expect(byteArrayToHexString(Uint8Array.from([0, 1, 15, 255]))).toBe('00010fff')
  })

  it('returns an empty string for an empty array', () => {
    expect(byteArrayToHexString(new Uint8Array())).toBe('')
  })
})

describe('bech32To8BitArray', () => {
  it('converts bech32 characters to bytes', () => {
    expect(Array.from(bech32To8BitArray('qypq'))).toEqual([1, 2, 0])
    expect(Array.from(bech32To8BitArray('lnbc'))).toEqual([252, 191, 128])
  })

  it('returns an empty array for an empty string', () => {
    expect(Array.from(bech32To8BitArray(''))).toEqual([])
  })
})

describe('getPubkeyFromSignature', () => {
  it('recovers the payee pubkey from a signed invoice', async () => {
    const decoded = decode(validReceipt.invoice)
    await expect(getPubkeyFromSignature(decoded)).resolves.toBe(validReceipt.payeePubkey)
  })

  it('returns null when the signature section is missing', async () => {
    const decoded = decode(validReceipt.invoice)
    decoded.sections = decoded.sections.filter((section) => section.name !== 'signature')
    await expect(getPubkeyFromSignature(decoded)).resolves.toBeNull()
  })
})

describe('preimage verification (fixture consistency)', () => {
  it('sha256(preimage) equals the payment hash encoded in the invoice', async () => {
    const preimageBytes = Uint8Array.from(
      validReceipt.preimage.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
    )
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', preimageBytes))

    expect(byteArrayToHexString(hash)).toBe(validReceipt.paymentHash)

    const decoded = decode(validReceipt.invoice)
    const paymentHash = decoded.sections.find((section) => section.name === 'payment_hash')?.value
    expect(paymentHash).toBe(validReceipt.paymentHash)
  })
})

describe('useForm', () => {
  function mountForm() {
    let form!: ReturnType<typeof useForm>['form']
    const Host = defineComponent({
      setup() {
        form = useForm().form
        return () => h('div')
      },
    })
    mount(Host)
    return form
  }

  it('starts empty when no query params are present', () => {
    window.history.replaceState({}, '', '/')
    const form = mountForm()
    expect(form.invoice).toBe('')
    expect(form.preimage).toBe('')
  })

  it('loads invoice and preimage from query params, lowercased', () => {
    const invoice = validReceipt.invoice.toUpperCase()
    window.history.replaceState({}, '', `/?invoice=${invoice}&preimage=${validReceipt.preimage}`)
    const form = mountForm()
    expect(form.invoice).toBe(validReceipt.invoice)
    expect(form.preimage).toBe(validReceipt.preimage)
  })

  it('ignores query params when only one of the two is present', () => {
    window.history.replaceState({}, '', `/?invoice=${validReceipt.invoice}`)
    const form = mountForm()
    expect(form.invoice).toBe('')
    expect(form.preimage).toBe('')
  })
})
