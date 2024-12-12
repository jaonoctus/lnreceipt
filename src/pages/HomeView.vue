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
import * as CryptoJS from 'crypto-js';
import * as secp256k1 from 'secp256k1';

const isPaid = ref(false)
const isVerified = ref(false)

const { form } = useForm()

const bech32CharValues = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const bech32To8BitArray = (str: string) => {
    const int5Array = str.split('').map(char => bech32CharValues.indexOf(char));
    
    let count = 0;
    let buffer = 0;
    const byteArray = [];
    
    int5Array.forEach((value) => {
        buffer = (buffer << 5) + value;
        count += 5;
        
        while (count >= 8) {
            byteArray.push(buffer >> (count - 8) & 255);
            count -= 8;
        }
    });
    
    if (count > 0) {
        byteArray.push(buffer << (8 - count) & 255);
    }

    return Uint8Array.from(byteArray);
}

const strToHex = (str: string) => {
  return str.split('').map(x => x.charCodeAt(0).toString(16)).join('');
}

const wordListToUint8Array = (wordList: CryptoJS.lib.WordArray) => {
  const dataArray = new Uint8Array(wordList.sigBytes);

  for (let i = 0x0; i < wordList.sigBytes; i++) {
    dataArray[i] = wordList.words[i >>> 0x2] >>> 0x18 - i % 0x4 * 0x8 & 0xff;
  }
  
  const data = new Uint8Array(dataArray);

  return data;
}

const byteArrayToHexString = (byteArray: Uint8Array) => {
  return Array.prototype.map.call(byteArray, function (byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

const getPubkeyFromSignature = (decoded: bolt11.DecodedInvoice) => {
  const signature = decoded.sections.find(section => section.name === 'signature');
  
  if (!signature || !signature.letters || !signature.value) {
    return null;
  }

  const prefixSections = ['lightning_network', 'coin_network', 'amount'];

  const prefix = decoded.sections
    .filter(section => prefixSections.includes(section.name))
    .map(section => {
      if ('letters' in section) return section.letters
    })
    .join('');

  if (!prefix) {
    return null;
  }

  const separator = decoded.sections.find(section => section.name === 'separator')?.letters;

  if (!separator) {
    return null;
  }

  const splitInvoice = decoded.paymentRequest.split(prefix + separator);

  const data = splitInvoice[1].split(signature.letters)[0];
  
  const signingData = 
    strToHex(prefix) + 
    byteArrayToHexString(bech32To8BitArray(data));

  const signingDataParsed = CryptoJS.enc.Hex.parse(signingData);
  const payHash = CryptoJS.SHA256(signingDataParsed);

  const signatureValue = signature.value.slice(0, -2);
  const sigParsed = CryptoJS.enc.Hex.parse(signatureValue);

  const sigPubkey = secp256k1.ecdsaRecover(
    wordListToUint8Array(sigParsed), 
    1, 
    wordListToUint8Array(payHash), 
    true
  );

  return byteArrayToHexString(sigPubkey);
}

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

    const pubkey = getPubkeyFromSignature(decoded);

    console.log(`https://amboss.space/node/${pubkey}`);

    if (!amount) {
      return null
    }

    return {
      amount: Math.floor(Number(amount) / 1000),
      description,
      paymentHash,
      pubkey
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
  const long = text.replace(/\s+/g, '').toUpperCase().slice(Math.max(0, text.length - 16))
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
              <TableRow v-if="decodedInvoice.pubkey">
                <TableCell class="font-medium"> Payee Pub Key </TableCell>
                <TableCell class="text-right">
                  <span>{{ formatLong(decodedInvoice.pubkey) }}</span>
                  
                  <a
                  :href="`https://amboss.space/node/${decodedInvoice.pubkey}`"
                  target="_blank"
                  >
                  <Button variant="ghost"
                    class="m-0 mx-3 p-0 hover:bg-transparent"
                  >
                    <Icon icon="lucide:external-link" />
                  </Button>
                </a>
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
