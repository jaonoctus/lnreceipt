<script setup lang="ts">
import { computed, watchEffect, ref } from 'vue'

import bolt11 from 'light-bolt11-decoder'
// import { Duration } from 'luxon'

import { Icon } from '@iconify/vue'
import { useForm } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import CopyButton from '@/components/CopyButton.vue'
import ShareButton from '@/components/ShareButton.vue'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Separator from '@/components/ui/separator/Separator.vue'

const isPaid = ref(false)
const isVerified = ref(false)

const { form } = useForm()

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

    if (!amount) {
      return null
    }

    return {
      amount: Math.floor(Number(amount) / 1000),
      description,
      paymentHash,
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return null
  }
})

watchEffect(async () => {
  isVerified.value = false
  if (decodedInvoice.value) {
    isPaid.value = await checkPaymentProof()
    isVerified.value = true
  }
})

async function checkPaymentProof() {
  const preimage = form.preimage
  if (preimage === null) {
    return false
  }
  const preimageBytes = new Uint8Array(
    preimage!.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  )

  // Calculate SHA-256 hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', preimageBytes)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const computedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return computedHex === decodedInvoice.value?.paymentHash
}

function formatLong(text: string) {
  const long = text.replace(/\s+/g, '').toUpperCase().slice(0, 16)
  return `0x${long}`
}
</script>

<template>
  <div class="w-full flex items-center justify-center p-4">
    <Card class="w-full max-w-2xl">
      <CardHeader>
        <CardTitle> Lightning Receipt </CardTitle>
        <CardDescription class="text-xs">
          <p>The provided preimage cryptographically proves that the specified invoice has been
            successfully paid.
          </p>
          <p>
            Learn more
            <a
              href="https://faq.blink.sv/blink-and-other-wallets/how-to-prove-that-a-lightning-invoice-was-paid"
              target="_blank"
              class="font-medium text-primary"
            >here</a
            >.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Separator />
        <div class="font-medium mb-2 mt-5">Invoice:</div>
        <div class="flex w-full items-center">
          <Input id="invoice" type="text" placeholder="bolt11" v-model="form.invoice" />
          <CopyButton title="invoice" :value="form.invoice" />
        </div>
        <div class="font-medium mb-2 mt-5">Payment Proof:</div>
        <div class="flex w-full items-center">
          <Input id="preimage" type="text" placeholder="preimage" v-model="form.preimage" />
          <CopyButton title="preimage" :value="form.preimage" />
        </div>

        <Separator v-if="decodedInvoice && isVerified" class="my-6" label="Invoice Details" />
        <div v-if="decodedInvoice && isVerified" class="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-[200px]"> Field </TableHead>
                <TableHead class="text-right"> Value </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell class="font-medium"> Amount </TableCell>
                <TableCell class="text-right">
                  {{ decodedInvoice.amount }} {{ decodedInvoice.amount === 1 ? 'sat' : 'sats' }}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="font-medium"> Description </TableCell>
                <TableCell class="text-right"> {{ decodedInvoice.description }} </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="font-medium"> Payment Hash </TableCell>
                <TableCell class="text-right">
                  <span>{{ formatLong(decodedInvoice.paymentHash) }}</span>
                  <CopyButton title="payment hash" :value="decodedInvoice.paymentHash" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell class="font-medium"> Status </TableCell>
                <TableCell class="text-right font-medium">
                  <div v-if="isPaid" class="text-green-500 flex items-center justify-end">
                    <Icon icon="lucide:badge-check" class="mx-2 text-xl" />
                    <span>Payment successfull!</span>
                  </div>
                  <span v-else class="text-red-500 flex items-center justify-end">
                    <Icon icon="lucide:badge-alert" class="mx-2 text-xl" />
                    <span>Invalid preimage</span>
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter class="flex justify-center px-6 pb-6">
        <ShareButton :form="form" />
      </CardFooter>
    </Card>
  </div>
</template>
