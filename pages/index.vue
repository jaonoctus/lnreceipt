<script setup lang="ts">
import { computed, watchEffect, ref } from 'vue'

import bolt11 from 'light-bolt11-decoder'
import { DateTime } from 'luxon'

import { Icon } from '@iconify/vue'
import ShareButton from '~/components/ShareButton.vue'

const isPaid = ref(false)
const isVerified = ref(false)

const { form } = useForm()

const payeePubKey = ref('')

const decodedInvoice = computed(() => {
  try {
    const decoded = bolt11.decode(form.invoice)

    if (!decoded) {
      return null
    }

    const amount = decoded.sections.find((section) => section.name === 'amount')?.value
    const description =
      decoded.sections.find((section) => section.name === 'description')?.value ?? 'empty'
    const paymentHash =
      decoded.sections.find((section) => section.name === 'payment_hash')?.value ?? ''
    const timestamp = decoded.sections.find((section) => section.name === 'timestamp')?.value

    if (!amount) {
      return null
    }

    return {
      amount: Math.floor(Number(amount) / 1000),
      description,
      paymentHash,
      timestamp: timestamp ? Number(timestamp) : null,
      decoded,
    }
  } catch (error) {
    console.error(error)
    return null
  }
})

const hasPreimage = computed(() => form.preimage.trim() !== '')

watchEffect(async () => {
  isVerified.value = false
  if (decodedInvoice.value) {
    isPaid.value = await checkPaymentProof()
    isVerified.value = true
    payeePubKey.value = (await getPubkeyFromSignature(decodedInvoice.value.decoded)) || ''
  }
})

async function checkPaymentProof() {
  const preimage = form.preimage
  if (!preimage || preimage.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(preimage)) {
    return false
  }
  const preimageBytes = new Uint8Array(
    preimage.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  )

  // Calculate SHA-256 hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', preimageBytes)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const computedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return computedHex === decodedInvoice.value?.paymentHash
}

const receiptDate = computed(() => {
  const timestamp = decodedInvoice.value?.timestamp
  if (!timestamp) {
    return null
  }
  return DateTime.fromSeconds(timestamp).toFormat('yyyy-LL-dd HH:mm')
})

const receiptNumber = computed(
  () => decodedInvoice.value?.paymentHash.slice(-16).toUpperCase() ?? null,
)

// Torn-paper zigzag on top and bottom edges
const TEETH = 48
const TOOTH_DEPTH = 10
const receiptClipPath = (() => {
  const points: string[] = []
  for (let i = 0; i <= TEETH; i++) {
    const x = `${((i / TEETH) * 100).toFixed(2)}%`
    points.push(`${x} ${i % 2 === 0 ? '0' : `${TOOTH_DEPTH}px`}`)
  }
  for (let i = TEETH; i >= 0; i--) {
    const x = `${((i / TEETH) * 100).toFixed(2)}%`
    points.push(`${x} ${i % 2 === 0 ? '100%' : `calc(100% - ${TOOTH_DEPTH}px)`}`)
  }
  return `polygon(${points.join(', ')})`
})()

const stampClass =
  'motion-safe:animate-stamp rotate-[-8deg] rounded border-[3px] border-current px-5 py-1.5 ' +
  'text-3xl font-bold uppercase tracking-[0.3em] opacity-90 mix-blend-multiply blur-[0.3px]'

const inputClass =
  'w-full min-w-0 rounded-none border-0 border-b border-dashed border-ink/55 bg-transparent ' +
  'px-0 py-1.5 text-sm text-ink placeholder:text-ink/55 ' +
  'focus:outline-none focus:ring-0 focus-visible:border-solid focus-visible:border-ink'
</script>

<template>
  <div class="flex w-full flex-col items-center px-4">
    <main class="w-full max-w-[544px] [filter:drop-shadow(0_24px_48px_rgba(0,0,0,0.6))]">
      <div
        class="bg-paper px-6 pb-12 pt-10 font-receipt text-ink sm:px-8"
        :style="{ clipPath: receiptClipPath }"
      >
        <header class="text-center">
          <Icon icon="lucide:zap" class="mx-auto text-3xl" aria-hidden="true" />
          <h1 class="mt-2 text-lg font-bold uppercase tracking-[0.3em]">Lightning Receipt</h1>
          <p class="mt-1 text-[11px] uppercase tracking-[0.25em] text-ink/75">
            Cryptographic proof of payment
          </p>
        </header>

        <div class="my-5 border-t border-dashed border-ink/50"></div>

        <section aria-label="Payment data">
          <label for="invoice" class="block text-xs font-bold uppercase tracking-[0.15em]">
            Invoice
          </label>
          <input
            id="invoice"
            v-model="form.invoice"
            type="text"
            placeholder="lnbc… paste BOLT11 invoice"
            autocomplete="off"
            spellcheck="false"
            :class="inputClass"
          />

          <label
            for="preimage"
            class="mt-4 block text-xs font-bold uppercase tracking-[0.15em]"
          >
            Preimage
          </label>
          <input
            id="preimage"
            v-model="form.preimage"
            type="text"
            placeholder="paste proof of payment"
            autocomplete="off"
            spellcheck="false"
            :class="inputClass"
          />
        </section>

        <template v-if="decodedInvoice && isVerified">
          <section class="mt-6 space-y-1.5 text-sm" aria-label="Invoice details">
            <div v-if="receiptDate" class="flex items-end gap-2">
              <span class="shrink-0 uppercase">Date</span>
              <span class="mb-[3px] flex-1 border-b border-dotted border-ink/60"></span>
              <span class="shrink-0">{{ receiptDate }}</span>
            </div>
            <div class="flex items-end gap-2">
              <span class="shrink-0 uppercase">Receipt no.</span>
              <span class="mb-[3px] flex-1 border-b border-dotted border-ink/60"></span>
              <span class="shrink-0">{{ receiptNumber }}</span>
            </div>
            <div class="flex items-end gap-2">
              <span class="shrink-0 uppercase">Description</span>
              <span class="mb-[3px] flex-1 border-b border-dotted border-ink/60"></span>
              <span class="min-w-0 max-w-[55%] break-words text-right">
                {{ decodedInvoice.description }}
              </span>
            </div>
          </section>

          <div class="my-4 border-t-2 border-dashed border-ink/80"></div>

          <div class="flex items-end gap-2 text-lg font-bold">
            <span class="uppercase">Total</span>
            <span class="mb-1 flex-1 border-b border-dotted border-ink/60"></span>
            <span class="shrink-0">
              {{ decodedInvoice.amount.toLocaleString('en-US') }}
              {{ decodedInvoice.amount === 1 ? 'SAT' : 'SATS' }}
            </span>
          </div>

          <div class="my-4 border-t-2 border-dashed border-ink/80"></div>

          <section class="space-y-3 text-xs" aria-label="Verification codes">
            <div>
              <span class="font-bold uppercase tracking-[0.15em]">Payment hash</span>
              <p class="break-all leading-relaxed text-ink/80">{{ decodedInvoice.paymentHash }}</p>
            </div>
            <div v-if="payeePubKey">
              <div class="flex items-center justify-between">
                <span class="font-bold uppercase tracking-[0.15em]">Payee node</span>
                <a
                  :href="`https://amboss.space/node/${payeePubKey}`"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 uppercase underline underline-offset-2 hover:text-ink/70"
                >
                  view
                  <Icon icon="lucide:external-link" aria-hidden="true" />
                </a>
              </div>
              <p class="break-all leading-relaxed text-ink/80">{{ payeePubKey }}</p>
            </div>
          </section>

          <div class="my-6 flex min-h-[92px] items-center justify-center" aria-live="polite">
            <div v-if="isPaid" :class="stampClass" class="text-[#2E7D4F]">Paid</div>
            <div v-else-if="hasPreimage" class="text-center">
              <div :class="stampClass" class="text-stamp">Invalid</div>
              <p class="mt-4 text-xs uppercase tracking-[0.15em] text-stamp">
                Preimage does not match payment hash
              </p>
            </div>
            <p v-else class="text-xs uppercase tracking-[0.25em] text-ink/60">
              Paste preimage to verify
            </p>
          </div>
        </template>

        <template v-else>
          <div class="my-5 border-t border-dashed border-ink/50"></div>
          <p class="py-8 text-center text-xs uppercase tracking-[0.25em] text-ink/60">
            Awaiting invoice + preimage
          </p>
        </template>

        <div class="my-5 border-t border-dashed border-ink/50"></div>

        <footer class="text-center">
          <p class="text-[11px] leading-relaxed text-ink/75">
            The preimage cryptographically proves the invoice above has been paid.
            <a
              href="https://faq.blink.sv/blink-and-other-wallets/how-to-prove-that-a-lightning-invoice-was-paid"
              target="_blank"
              rel="noopener"
              class="underline underline-offset-2 hover:text-ink"
            >How it works</a>
          </p>
          <p class="mt-3 text-xs font-bold uppercase tracking-[0.2em]">
            *** {{ isPaid && isVerified ? 'Thank you for your payment' : 'Powered by math' }} ***
          </p>
        </footer>
      </div>
    </main>

    <div class="mt-6">
      <ShareButton :form="form" />
    </div>
  </div>
</template>
