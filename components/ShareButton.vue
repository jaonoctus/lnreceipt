<script setup lang="ts">
import { computed } from 'vue'

import type { LightningReceipt } from '~/types/index'

import { Icon } from '@iconify/vue'
import { useShare } from '@vueuse/core'

import { Button } from '~/components/ui/button'

const props = defineProps<{
  form: LightningReceipt
}>()

const { share, isSupported } = useShare()

const link = computed(() => {
  const url = new URL(window.location.href)

  url.searchParams.set('invoice', props.form.invoice)
  url.searchParams.set('preimage', props.form.preimage)

  return url.toString()
})

const isDisabled = computed(
  () => isSupported && !(props.form.invoice === '' || props.form.preimage === ''),
)

function startShare() {
  share({
    title: 'Lightning Receipt',
    text: `Your invoice is paid. Here is the receipt:`,
    url: link.value,
  })
}
</script>

<template>
  <Button v-if="isDisabled" @click.prevent="startShare" variant="secondary">
    <Icon icon="lucide:share-2" /> Share
  </Button>
</template>
