/**
 * A valid, signed BOLT-11 invoice generated for tests.
 *
 * Deterministic inputs:
 * - node private key = sha256('lnreceipt-test-node-key')
 * - preimage         = sha256('lnreceipt-test-preimage')
 * - payment hash     = sha256(preimage)
 * - timestamp        = 1735689600 (2025-01-01 00:00:00 UTC)
 * - amount           = 15u (1500 sats)
 */
export const validReceipt = {
  invoice:
    'lnbc15u1pnhfpvqpp5pcrzwl7t4prcv8hyfdec009amwsuwaafcmexfk7c0nznvrxa3p4sdqad3h8yetrv45hqapqv5ex2gr5v4ehgsp5h7s0s0hv8qkp9jzkmtt7zstkwl5adfysxg0zqwqewhtls672nmzs9qygyqqp9zxulysv3ag9z8guwqcnfs4ucyj5emrz60xj7rncr37af7v6jp8jfx5l0tmazpgrtx73qnnztswlddttusd95zy8nxcu634fs2tgjgqgsu93c',
  preimage: '9c5a7be4b57a98cb65f1614a79312fe11857a5385636b190ba70174f786ed92d',
  paymentHash: '0e06277fcba847861ee44b7387bcbddba1c777a9c6f264dbd87cc5360cdd886b',
  payeePubkey: '02a2d2f8b8827e7d1854072795ffdf11282ca3d668ac05e45a228c84b576b79fbd',
  amountSats: 1500,
  description: 'lnreceipt e2e test',
  timestamp: 1735689600,
  dateUTC: '2025-01-01 00:00',
  // last 16 hex chars of the payment hash, uppercased (see pages/index.vue receiptNumber)
  receiptNumber: 'D87CC5360CDD886B',
}

export const wrongPreimage = 'deadbeef'.repeat(8)
