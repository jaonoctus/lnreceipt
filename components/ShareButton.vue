<script setup lang="ts">
import { computed, ref } from 'vue'

import type { LightningReceipt } from '~/types/index'

import { Icon } from '@iconify/vue'
import { useShare, useClipboard } from '@vueuse/core'

import { Button } from '~/components/ui/button'

const props = defineProps<{
  form: LightningReceipt
}>()

const { share, isSupported: isShareSupported } = useShare()
const { copy, isSupported: isCopySupported } = useClipboard()

const copied = ref(false)
let copiedTimeout: ReturnType<typeof setTimeout> | null = null

const link = computed(() => {
  const baseUrl = window.location.origin
  const hashMode = window.location.hash.startsWith('#')
  const prefix = hashMode ? '#/' : '/'
  const invoice = encodeURIComponent(props.form.invoice)
  const preimage = encodeURIComponent(props.form.preimage)
  return `${baseUrl}${prefix}${invoice}/${preimage}`
})

const hasFormData = computed(
  () => props.form.invoice !== '' && props.form.preimage !== '',
)

function startShare() {
  share({
    title: 'Lightning Receipt',
    text: `Your invoice is paid. Here is the receipt:`,
    url: link.value,
  })
}

function copyLink() {
  copy(link.value)
  copied.value = true
  if (copiedTimeout) clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div v-if="hasFormData" class="flex items-center gap-2">
    <Button v-if="isCopySupported" @click.prevent="copyLink" variant="secondary">
      <Icon :icon="copied ? 'lucide:check' : 'lucide:link'" />
      {{ copied ? 'Copied!' : 'Copy Link' }}
    </Button>
    <Button v-if="isShareSupported" @click.prevent="startShare" variant="secondary">
      <Icon icon="lucide:share-2" /> Share
    </Button>
  </div>
</template>
