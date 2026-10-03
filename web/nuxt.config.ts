// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  supabase: {
    redirect: false,
    types: '~~/shared/types/database.ts',
    cookieOptions: {
      // Domínio compartilhado entre raiz e subdomínios; definido em runtime por
      // NUXT_PUBLIC_SUPABASE_COOKIE_OPTIONS_DOMAIN (ex.: .manutgo.otimetech.com.br). Vazio = host atual.
      domain: '',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },

  runtimeConfig: {
    public: {
      baseDomain: 'localhost',
      appName: 'ManutGO',
    },
  },
})
