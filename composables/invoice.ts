import bolt11 from 'light-bolt11-decoder'
import { schnorr, secp256k1 } from '@noble/curves/secp256k1'
import { byteArrayToHexString, getPubkeyFromSignature } from './utils'

// BOLT12 uses the bech32 alphabet without a checksum.
const bech32Alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const encoder = new TextEncoder()

export interface ReceiptInvoice {
  amount: number
  description: string
  paymentHash: string
  timestamp: number | null
  getPayeePubkey: () => Promise<string | null>
}

export function decodeInvoice(input: string): ReceiptInvoice {
  const invoice = input.trim()
  if (/^lni1/i.test(invoice)) return decodeBolt12(invoice)
  const decoded = bolt11.decode(invoice)
  const field = (name: string) => {
    const section = decoded.sections.find((section) => section.name === name)
    return section && 'value' in section ? section.value : undefined
  }
  const amount = field('amount')
  if (!amount) throw new Error('Invoice has no amount')
  return {
    amount: Math.floor(Number(amount) / 1000),
    description: String(field('description') ?? 'empty'),
    paymentHash: String(field('payment_hash') ?? ''),
    timestamp: field('timestamp') ? Number(field('timestamp')) : null,
    getPayeePubkey: () => getPubkeyFromSignature(decoded),
  }
}

function decodeBolt12(input: string): ReceiptInvoice {
  if (input !== input.toLowerCase() && input !== input.toUpperCase()) {
    throw new Error('Mixed case BOLT12 invoice')
  }
  const data = input
    .toLowerCase()
    .replace(/([a-z0-9])\+\s*(?=[a-z0-9])/g, '$1')
    .slice(4)
  let buffer = 0
  let bits = 0
  const bytes: number[] = []
  for (const char of data) {
    const value = bech32Alphabet.indexOf(char)
    if (value < 0) throw new Error('Invalid BOLT12 character')
    buffer = (buffer << 5) | value
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >>> bits) & 255)
    }
  }
  if (bits >= 5 || (buffer & ((1 << bits) - 1)) !== 0) {
    throw new Error('Invalid BOLT12 padding')
  }
  const stream = Uint8Array.from(bytes)
  let offset = 0
  const readBigSize = () => {
    if (offset >= stream.length) throw new Error('Truncated TLV')
    const first = stream[offset++]
    const size = first < 253 ? 0 : first === 253 ? 2 : first === 254 ? 4 : 8
    let value = BigInt(size ? 0 : first)
    if (offset + size > stream.length) throw new Error('Truncated BigSize')
    for (let i = 0; i < size; i++) value = (value << 8n) | BigInt(stream[offset++])
    if (
      (size === 2 && value < 253n) ||
      (size === 4 && value < 65536n) ||
      (size === 8 && value < 4294967296n) ||
      value > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      throw new Error('Noncanonical or oversized BigSize')
    }
    return Number(value)
  }
  const records: { type: number; value: Uint8Array; raw: Uint8Array; typeBytes: Uint8Array }[] = []
  let previous = -1
  while (offset < stream.length) {
    const start = offset
    const type = readBigSize()
    const typeBytes = stream.slice(start, offset)
    if (
      (type >= 240 && type <= 1000 && type !== 240) ||
      (type > 240 && (type < 1000000000 || type > 3999999999))
    ) {
      throw new Error('Invalid invoice TLV type')
    }
    const length = readBigSize()
    if (type <= previous || length > stream.length - offset) throw new Error('Invalid TLV stream')
    previous = type
    const value = stream.slice(offset, offset + length)
    offset += length
    records.push({ type, value, raw: stream.slice(start, offset), typeBytes })
  }
  const field = (type: number, length?: number) => {
    const value = records.find((record) => record.type === type)?.value
    if (!value || (length !== undefined && value.length !== length))
      throw new Error('Missing or invalid invoice field')
    return value
  }
  const integer = (type: number) => {
    const value = field(type)
    if (value.length > 8 || (value.length > 0 && value[0] === 0)) throw new Error('Invalid tu64')
    let number = 0n
    for (const byte of value) number = (number << 8n) | BigInt(byte)
    if (number > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Invoice value exceeds precision')
    return Number(number)
  }
  const paymentHash = byteArrayToHexString(field(168, 32))
  const pubkey = field(176, 33)
  secp256k1.ProjectivePoint.fromHex(pubkey).assertValidity()
  const signature = field(240, 64)
  const amount = integer(170)
  // Expired invoices remain useful as historical payment receipts.
  const timestamp = integer(164)
  const description = records.find((record) => record.type === 10)?.value
  return {
    amount: Math.floor(amount / 1000),
    description: description
      ? new TextDecoder('utf-8', { fatal: true }).decode(description)
      : 'empty',
    paymentHash,
    timestamp,
    async getPayeePubkey() {
      const unsigned = records.filter(({ type }) => type < 240 || type > 1000)
      const nonceTag = concat(encoder.encode('LnNonce'), unsigned[0].raw)
      let nodes: Uint8Array[] = await Promise.all(
        unsigned.map(async (record) =>
          branch(
            await taggedHash(encoder.encode('LnLeaf'), record.raw),
            await taggedHash(nonceTag, record.typeBytes),
          ),
        ),
      )
      while (nodes.length > 1) {
        const next: Uint8Array[] = []
        for (let i = 0; i < nodes.length; i += 2) {
          next.push(i + 1 < nodes.length ? await branch(nodes[i], nodes[i + 1]) : nodes[i])
        }
        nodes = next
      }
      const message = await taggedHash(encoder.encode('lightninginvoicesignature'), nodes[0])
      if (!schnorr.verify(signature, message, pubkey.slice(1)))
        throw new Error('Invalid BOLT12 signature')
      return byteArrayToHexString(pubkey)
    },
  }
}

function concat(...parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

async function taggedHash(tag: Uint8Array, message: Uint8Array) {
  const tagHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(tag)))
  return new Uint8Array(await crypto.subtle.digest('SHA-256', concat(tagHash, tagHash, message)))
}

async function branch(a: Uint8Array, b: Uint8Array) {
  const ordered = byteArrayToHexString(a) < byteArrayToHexString(b) ? [a, b] : [b, a]
  return taggedHash(encoder.encode('LnBranch'), concat(...ordered))
}
