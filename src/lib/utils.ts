import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { onBeforeMount, reactive } from 'vue'
import { useClipboard } from '@vueuse/core'

import type { LightningReceipt } from '@/types/index'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useCopyToClipboard(title: string, value: string) {
  const { copy, isSupported } = useClipboard()
  // const { toast } = useToast()

  function copyToClipboard() {
    copy(value)

    // toast({
    //   title: `Copied ${title} to clipboard.`,
    // })
  }

  return {
    copyToClipboard,
    isSupported,
  }
}

export function useForm() {
  const form = reactive<LightningReceipt>({
    invoice: '',
    preimage: '',
  })

  onBeforeMount(() => {
    const url = new URL(window.location.href)
    const invoice = url.searchParams.get('invoice')
    const preimage = url.searchParams.get('preimage')

    if (invoice && preimage) {
      form.invoice = invoice.toLowerCase()
      form.preimage = preimage.toLowerCase()
    }
  })

  return {
    form,
  }
}
