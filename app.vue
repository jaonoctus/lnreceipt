<script setup lang="ts">
import { version } from './package.json'
</script>

<template>
  <div
    class="flex min-h-screen w-full flex-col items-center justify-between gap-8 bg-[radial-gradient(120%_90%_at_50%_0%,#221c15_0%,#12100b_55%,#0a0906_100%)] p-4 py-8 text-sm"
  >
    <NuxtPage class="mt-4" />
    <div class="flex-1"></div>
    <div class="text-center font-receipt text-xs leading-relaxed text-stone-400">
      <p>v{{ version }} | made by <a href="https://jaonoctus.dev" target="_blank" class="font-medium text-primary">jaonoctus</a> with <a href="https://vuejs.org" target="_blank" class="font-medium text-primary">Vue.js</a>, <a href="https://www.npmjs.com/package/light-bolt11-decoder" target="_blank" class="font-medium text-primary">bolt11</a> and <span class="font-medium text-red-400">love</span>.</p>
      <p>You can download the <a href="https://github.com/jaonoctus/lnreceipt/releases" target="_blank" class="font-medium text-primary underline">lnreceipt-standalone.html</a> offline version from the latest GitHub release</p>
    </div>
  </div>
</template>
