import type { Config } from 'tailwindcss'

// Tokens do design.md (seção 9). brand-* usa variáveis CSS para o tema de cada empresa.
export default <Partial<Config>>{
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        app: '#EEF0F2',
        surface: '#FFFFFF',
        'sidebar-active': '#F0F3F4',
        border: '#E9EBED',
        divider: '#ECEEF0',
        ink: { DEFAULT: '#111111', secondary: '#565656', muted: '#84868A', subtle: '#A0A0A0' },
        avatar: '#DEE0E2',
        brand: {
          50: 'var(--brand-50, #EDF2F5)',
          '50-border': 'var(--brand-50-border, #E3EAEF)',
          100: 'var(--brand-100, #C7D8E0)',
          600: 'var(--brand-600, #266478)',
          700: 'var(--brand-700, #004E61)',
          900: 'var(--brand-900, #001B30)',
        },
        success: { 100: '#D9F0D6', 500: '#05A147', 600: '#2F8E0A', 700: '#226A11' },
        danger: { 100: '#F5C9CA', 600: '#C61714', 700: '#BA0200' },
        warning: { 50: '#FEF2E5', 200: '#F4DDC7', 500: '#FBA11A', 600: '#F0AC31' },
      },
      borderRadius: { card: '4px', badge: '2px' },
      boxShadow: { card: '0 1px 2px rgba(0,0,0,0.04)' },
      width: { sidebar: '196px' },
    },
  },
}
