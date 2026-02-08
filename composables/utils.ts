import { Signature } from '@noble/secp256k1'

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { onMounted, reactive } from 'vue'
import { useClipboard } from '@vueuse/core'

import type { LightningReceipt } from '~/types/index'
import type { DecodedInvoice } from 'light-bolt11-decoder'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useCopyToClipboard(title: string, value: string) {
  const { copy, isSupported } = useClipboard()
  // const { toast } = useToast()

  function copyToClipboard() {
    copy(value)

    // toast({
    //   title: `Copied ${title} to clipboard.`,
    // })
  }

  return {
    copyToClipboard,
    isSupported,
  }
}

export function useForm() {
  const form = reactive<LightningReceipt>({
    invoice: '',
    preimage: '',
  })

  onMounted(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const invoice = url.searchParams.get('invoice')
      const preimage = url.searchParams.get('preimage')

      if (invoice && preimage) {
        form.invoice = invoice.toLowerCase()
        form.preimage = preimage.toLowerCase()
      }
    }
  })

  return {
    form,
  }
}

export function strToHex(str: string) {
  return str
    .split('')
    .map((x) => x.charCodeAt(0).toString(16))
    .join('')
}

const hexToArrayBuffer = (hexString: string) => {
  const bytes = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16)
  }
  return bytes.buffer
}

export function byteArrayToHexString(byteArray: Uint8Array) {
  return Array.prototype.map
    .call(byteArray, function (byte) {
      return ('0' + (byte & 0xff).toString(16)).slice(-2)
    })
    .join('')
}

export function bech32To8BitArray(str: string) {
  const bech32CharValues = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
  const int5Array = str.split('').map((char) => bech32CharValues.indexOf(char))

  let count = 0
  let buffer = 0
  const byteArray = []

  int5Array.forEach((value) => {
    buffer = (buffer << 5) + value
    count += 5

    while (count >= 8) {
      byteArray.push((buffer >> (count - 8)) & 255)
      count -= 8
    }
  })

  if (count > 0) {
    byteArray.push((buffer << (8 - count)) & 255)
  }

  return Uint8Array.from(byteArray)
}

export async function getPubkeyFromSignature(decoded: DecodedInvoice) {
  const signature = decoded.sections.find((section) => section.name === 'signature')

  if (!signature || !signature.letters || !signature.value) {
    return null
  }

  const prefixSections = ['lightning_network', 'coin_network', 'amount']

  const prefix = decoded.sections
    .filter((section) => prefixSections.includes(section.name))
    .map((section) => {
      if ('letters' in section) return section.letters
    })
    .join('')

  if (!prefix) {
    return null
  }

  const separator = decoded.sections.find((section) => section.name === 'separator')?.letters

  if (!separator) {
    return null
  }

  const splitInvoice = decoded.paymentRequest.split(prefix + separator)

  const data = splitInvoice[1].split(signature.letters)[0]

  const signingData = strToHex(prefix) + byteArrayToHexString(bech32To8BitArray(data))

  const hash = await crypto.subtle.digest('SHA-256', hexToArrayBuffer(signingData))

  const recoveryId = parseInt(signature.value.slice(-2), 16)
  const signatureValue = signature.value.slice(0, -2)

  const sig = Signature.fromCompact(signatureValue).addRecoveryBit(recoveryId)
  const pubkey = sig.recoverPublicKey(new Uint8Array(hash))

  return byteArrayToHexString(pubkey.toRawBytes(true))
}
