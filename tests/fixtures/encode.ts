/**
 * Minimal invoice encoders for crafting edge-case inputs in tests.
 * They produce well-formed encodings, not necessarily payable invoices.
 */
import { createHash } from 'node:crypto'
import { secp256k1 } from '@noble/curves/secp256k1'

const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
const utf8 = new TextEncoder()

/** sha256('lnreceipt-test-node-key'), the node key behind `validReceipt`. */
export const testNodeKey = sha256(utf8.encode('lnreceipt-test-node-key'))

export function sha256(data: Uint8Array) {
  return new Uint8Array(createHash('sha256').update(data).digest())
}

export function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Regroups a bit stream into `to`-bit values, zero-padding the tail. */
function regroup(values: ArrayLike<number>, from: number, to: number) {
  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const value of Array.from(values)) {
    buffer = (buffer << from) | value
    bits += from
    while (bits >= to) {
      bits -= to
      out.push((buffer >> bits) & ((1 << to) - 1))
    }
    buffer &= (1 << bits) - 1
  }
  if (bits > 0) out.push((buffer << (to - bits)) & ((1 << to) - 1))
  return out
}

function bech32Checksum(hrp: string, words: number[]) {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  const chars = Array.from(hrp, (char) => char.charCodeAt(0))
  const values = [
    ...chars.map((code) => code >> 5),
    0,
    ...chars.map((code) => code & 31),
    ...words,
    ...[0, 0, 0, 0, 0, 0],
  ]
  let checksum = 1
  for (const value of values) {
    const top = checksum >> 25
    checksum = ((checksum & 0x1ffffff) << 5) ^ value
    generators.forEach((generator, i) => {
      if ((top >> i) & 1) checksum ^= generator
    })
  }
  checksum ^= 1
  return [0, 1, 2, 3, 4, 5].map((i) => (checksum >> (5 * (5 - i))) & 31)
}

/** Tagged field codes used by the tests. */
export const tag = { paymentHash: 1, description: 13, payee: 19 }

/**
 * Builds a signed BOLT11 invoice. `amount` is the human readable amount
 * with its multiplier (for example `15u`), `tags` are `[code, bytes]` pairs.
 */
export function encodeBolt11(options: {
  amount?: string
  timestamp?: number
  tags: [number, Uint8Array][]
  privateKey?: Uint8Array
}) {
  const hrp = `lnbc${options.amount ?? ''}`
  const words: number[] = []
  const timestamp = options.timestamp ?? 1735689600
  for (let i = 6; i >= 0; i--) words.push(Math.floor(timestamp / 32 ** i) % 32)
  for (const [code, bytes] of options.tags) {
    const data = regroup(bytes, 8, 5)
    words.push(code, data.length >> 5, data.length & 31, ...data)
  }
  const hash = sha256(Uint8Array.from([...utf8.encode(hrp), ...regroup(words, 5, 8)]))
  const signature = secp256k1.sign(hash, options.privateKey ?? testNodeKey)
  words.push(...regroup([...signature.toCompactRawBytes(), signature.recovery], 8, 5))
  words.push(...bech32Checksum(hrp, words))
  return `${hrp}1${words.map((word) => alphabet[word]).join('')}`
}

/** Minimal big-endian encoding of an unsigned integer (BOLT12 `tu64`). */
export function tu64(value: bigint) {
  const bytes: number[] = []
  for (; value > 0n; value >>= 8n) bytes.unshift(Number(value & 255n))
  return Uint8Array.from(bytes)
}

/** BOLT12 invoice TLV types used by the tests. */
export const tlv = { createdAt: 164, paymentHash: 168, amount: 170, nodeId: 176, signature: 240 }

/**
 * Builds a BOLT12 invoice string from the mandatory fields. The signature is
 * a placeholder, so the result decodes but does not verify.
 */
export function encodeBolt12(fields: { amountMsat?: bigint; createdAt?: bigint } = {}) {
  const records: [number, Uint8Array][] = [
    [tlv.createdAt, tu64(fields.createdAt ?? 1735689600n)],
    [tlv.paymentHash, sha256(utf8.encode('lnreceipt-test-preimage'))],
    [tlv.amount, tu64(fields.amountMsat ?? 1500000n)],
    [tlv.nodeId, secp256k1.getPublicKey(testNodeKey, true)],
    [tlv.signature, new Uint8Array(64).fill(1)],
  ]
  // Types and lengths here are all below 253, so each BigSize is one byte.
  const stream = records.flatMap(([type, value]) => [type, value.length, ...value])
  return `lni1${regroup(stream, 8, 5)
    .map((word) => alphabet[word])
    .join('')}`
}
