import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Supabase Dark Theme Colors
        background: '#1c1c1c',
        foreground: '#ededed',
        brand: {
          DEFAULT: '#3ecf8e',
          emphasis: '#24b574',
        },
        border: {
          DEFAULT: '#2e2e2e',
          strong: '#3d3d3d',
        },
        surface: {
          DEFAULT: '#181818',
          75: '#1f1f1f',
          100: '#262626',
        },
        overlay: {
          DEFAULT: '#181818',
          hover: '#1f1f1f',
        },
      },
    },
  },
  plugins: [],
}
export default config
