<script setup lang="ts">
import { computed } from 'vue'

import { Icon } from '@iconify/vue'

import { Button } from '~/components/ui/button'

const props = defineProps<{
  title: string
  value: string
}>()

const { copyToClipboard, isSupported } = useCopyToClipboard(props.title, props.value)

const isDisabled = computed(() => props.value === '')
</script>

<template>
  <Button
    v-if="isSupported"
    :disabled="isDisabled"
    @click.prevent="copyToClipboard"
    variant="ghost"
    class="m-0 mx-3 p-0 hover:bg-transparent"
  >
    <Icon icon="lucide:copy" />
  </Button>
</template>
