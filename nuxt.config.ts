export default defineNuxtConfig({
  ssr: process.env.NUXT_SSR !== 'false', // SSR enabled by default, can be disabled with env var

  modules: ['@nuxtjs/tailwindcss', ...(process.env.NUXT_SSR === 'false' ? ['nuxt-single-html'] : [])],

  css: ['~/assets/index.css'],

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },

  router: {
    options: {
      hashMode: true, // Use hash-based routing for file:// protocol support
    },
  },

  app: {
    baseURL: './', // Relative base URL for standalone HTML
    head: {
      htmlAttrs: {
        lang: '',
        class: 'dark', // Dark mode by default
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
    typeCheck: false, // Disable for now due to component import issues
  },

  vite: {
    resolve: {
      alias: {
        '@': '/src', // Maintain compatibility
      },
    },
  },

  compatibilityDate: '2026-02-07',
})
