const isSpa = process.env.NUXT_SSR === 'false'

export default defineNuxtConfig({
  ssr: !isSpa,

  modules: ['@nuxtjs/tailwindcss', ...(isSpa ? ['nuxt-single-html'] : [])],

  css: ['~/assets/index.css'],

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },

  router: {
    options: {
      hashMode: isSpa,
    },
  },

  app: {
    baseURL: isSpa ? './' : '/',
    head: {
      htmlAttrs: {
        lang: '',
        class: 'dark',
      },
      title: 'Lightning Receipt',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [{ rel: 'icon', href: '/favicon.ico' }],
    },
  },

  components: {
    dirs: [
      {
        path: '~/components',
        pathPrefix: false,
        extensions: ['.vue'],
        ignore: ['**/ui/**/index.ts'],
      },
      {
        path: '~/components/ui',
        pathPrefix: false,
        extensions: ['.vue'],
        ignore: ['**/index.ts'],
      },
    ],
  },

  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  nitro: {
    rollupConfig: {
      external: ['@resvg/resvg-js'],
    },
  },

  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },

  compatibilityDate: '2026-02-07',
})
