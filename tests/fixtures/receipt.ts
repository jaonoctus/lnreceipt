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

// BOLT12 invoice and payment proof supplied by the user.
export const bolt12Receipt = {
  invoice:
    'lni1qqsq6ynqgj0ckcc2jrw4s8csv59e6frc2w2ufjkvrl7e8lfes4mkscskyyp84t7wtunrhgypt5l6gwzpfzdpmlwgfv0aj8a2mnvnkjh56xaflezsyph79rq2kmcmxukp563ydtnr7a8ex85rvhs45zyudrtpjqqqqqqqq5syqx6pr5z5qvpqqqzcyyph0xv3pg7azx2x7c6fz6qrarln9nan4v2nkxh8wk5m563rscjshndqnqp84t7wtunrhgypt5l6gwzpfzdpmlwgfv0aj8a2mnvnkjh56xafleqz0y6mmf3j4gmu9d0cyjz5cew52qy9ld5qhl4wsvy5u4kvulumnu3qzq34scjxcxewswk344yu3kgzzh0u775kcm75h842t4tgljnhhdjvlsqryd72flakpmmdhgn002apt0duh5r88cagtx94ypcxeduhsxev62sjw34nzzc9yznvvjngpkfywqd0z0cgdgsuqqqqqqqqqqqqqqqjqqqqqqqqqqqqq8fykt06c5sqqqqqpfqyd27jtxagyr4lk9t0ykdcmsdzeaapfvvj9hswxmz3s0scfwvapvgdc8dvlg7ep2syqx6pr59wqvpqqq9syyp84t7wtunrhgypt5l6gwzpfzdpmlwgfv0aj8a2mnvnkjh56xafle8sgz6gnlgazzz7cxcpvxjvne7k0wpnqmx5a2va3nzswern4vjwt62d3cchdylfrrtjn24uhek7wz56uf9y0edzxlxjkzjhr7qfx2zj2cew',
  paymentHash: 'ebfb156f259b8dc1a2cf7a14b1922de0e36c5183e184b99d0b10dc1dacfa3d90',
  preimage: 'aa925e325748d64e9008d1889495759dfd72a7a445a706da69c26fa155d9ea87',
}
