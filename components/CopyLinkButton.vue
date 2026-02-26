<script setup lang="ts">
import { computed, ref } from 'vue'

import type { LightningReceipt } from '~/types/index'

import { Icon } from '@iconify/vue'
import { useClipboard } from '@vueuse/core'

import { Button } from '~/components/ui/button'

const props = defineProps<{
  form: LightningReceipt
}>()

const { copy, isSupported } = useClipboard()
const copied = ref(false)

const link = computed(() => {
  const url = new URL(window.location.href)

  url.searchParams.set('invoice', props.form.invoice)
  url.searchParams.set('preimage', props.form.preimage)

  return url.toString()
})

const isDisabled = computed(
  () => props.form.invoice === '' || props.form.preimage === '',
)

function copyLink() {
  copy(link.value)
  copied.value = true
  
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <Button 
    v-if="isSupported" 
    :disabled="isDisabled"
    @click.prevent="copyLink" 
    variant="outline"
  >
    <Icon :icon="copied ? 'lucide:check' : 'lucide:link'" />
    {{ copied ? 'Copied!' : 'Copy Link' }}
  </Button>
</template>
