<script setup lang="ts">
import { computed } from 'vue'

import type { LightningReceipt } from '~/types/index'

import { Icon } from '@iconify/vue'
import { useClipboard, useShare } from '@vueuse/core'

import { Button } from '~/components/ui/button'

const props = defineProps<{
  form: LightningReceipt
}>()

const { share, isSupported: isShareSupported } = useShare()
const { copy, isSupported: isClipboardSupported } = useClipboard()

const link = computed(() => {
  if (typeof window === 'undefined') {
    return ''
  }

  const url = new URL(window.location.href)

  url.searchParams.set('invoice', props.form.invoice)
  url.searchParams.set('preimage', props.form.preimage)

  return url.toString()
})

const hasRequiredFields = computed(() => props.form.invoice !== '' && props.form.preimage !== '')
const canShare = computed(() => isShareSupported.value && hasRequiredFields.value)
const canCopy = computed(() => isClipboardSupported.value && hasRequiredFields.value)

function startShare() {
  if (!canShare.value) {
    return
  }

  share({
    title: 'Lightning Receipt',
    text: `Your invoice is paid. Here is the receipt:`,
    url: link.value,
  })
}

function copyLink() {
  if (!canCopy.value) {
    return
  }

  copy(link.value)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button v-if="canShare" @click.prevent="startShare" variant="secondary">
      <Icon icon="lucide:share-2" /> Share
    </Button>

    <Button v-if="canCopy" @click.prevent="copyLink" variant="secondary">
      <Icon icon="lucide:copy" /> Copy link
    </Button>
  </div>
</template>
