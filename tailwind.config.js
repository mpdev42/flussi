import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Palettes de la charte — source : DESIGN.md
        // §2.1 Bleu clair de marque (ancre : blue-500)
        blue: {
          50: '#EEF6FC',
          100: '#D5E9F7',
          200: '#AAD2EE',
          300: '#75B5E0',
          400: '#3A95CF',
          500: '#0077BD',
          600: '#00649F',
          700: '#005182',
          800: '#003F65',
          900: '#002D49',
        },
        // §2.2 Bleu marine de marque (ancre : navy-700)
        navy: {
          50: '#EEF1F8',
          100: '#D9E0EF',
          200: '#B3C0DD',
          300: '#8698C4',
          400: '#5A71A9',
          500: '#38528D',
          600: '#233D77',
          700: '#13295B',
          800: '#0E1F46',
          900: '#091431',
        },
        // §2.3 Neutres
        neutral: {
          50: '#F7F8FA',
          100: '#EEF0F3',
          200: '#E0E4E9',
          300: '#C9CFD7',
          400: '#858E9A',
          500: '#6A7380',
          600: '#525A66',
          700: '#3D444F',
          800: '#29303A',
          900: '#181D24',
        },
        // §2.4 Couleurs sémantiques
        success: {
          bg: '#EBF6EF',
          border: '#93CFA8',
          text: '#18663A',
          solid: '#1C7A44',
          'on-solid': '#FFFFFF',
        },
        warning: {
          bg: '#FFF5DD',
          border: '#EDC26A',
          text: '#7F4E00',
          solid: '#E8A317',
          'on-solid': '#181D24',
        },
        error: {
          bg: '#FDEDEC',
          border: '#EDA39E',
          text: '#B0241A',
          solid: '#B8261B',
          'solid-hover': '#96201A',
          'on-solid': '#FFFFFF',
        },
        info: {
          bg: '#EEF1F8',
          border: '#B3C0DD',
          text: '#233D77',
          solid: '#38528D',
          'on-solid': '#FFFFFF',
        },
        // §2.5 Environnement de test (Recette) — réservé au bandeau et au badge Recette
        testenv: {
          solid: '#6B1F9C',
          stripe: '#7A2DAC',
          'on-solid': '#FFFFFF',
          bg: '#F5EEFA',
          border: '#C7A6DF',
          text: '#5E1C8A',
        },
      },
      // §2.6 Jetons de rôle (clés étroites : ni border-header ni bg-on-brand)
      backgroundColor: {
        header: '#13295B',
      },
      textColor: {
        'on-brand': '#FFFFFF',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // §3 Typographie
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Consolas', '"Courier New"', 'monospace'],
      },
      fontSize: {
        'body-sm': ['0.8125rem', '1.125rem'],
        data: ['0.8125rem', '1.25rem'],
      },
      // §3.2 Interlettrage : ls-tight des titres h1, légendes. Noms distincts de `tight` (shadcn).
      letterSpacing: {
        heading: '-0.01em',
        caption: '0.01em',
      },
      // §6 Ombres et anneaux de focus
      boxShadow: {
        xs: '0 1px 2px #13295B0F',
        sm: '0 1px 2px #13295B0F, 0 1px 3px #13295B14',
        md: '0 2px 4px #13295B0F, 0 6px 16px #13295B1F',
        lg: '0 4px 8px #13295B14, 0 16px 40px #13295B33',
        focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #0077BD',
        'focus-error': '0 0 0 2px #FFFFFF, 0 0 0 4px #B8261B',
        'focus-dark': '0 0 0 2px #13295B, 0 0 0 4px #75B5E0',
      },
      // §8 Tailles, superposition
      height: {
        'control-sm': '28px',
        'control-md': '32px',
        'control-lg': '40px',
      },
      // §4 Mise en page : colonne du journal de la session, colonne de navigation (largeur selon la
      // fenêtre, variable --panel-nav-width de index.css), contenu centré
      width: {
        'panel-log': '288px',
        'panel-nav': 'var(--panel-nav-width)',
      },
      gridTemplateColumns: {
        ac056: 'var(--panel-nav-width) minmax(0, 1fr)',
      },
      maxWidth: {
        content: '1600px',
        'dialog-sm': '440px',
        'dialog-md': '560px',
        tooltip: '280px',
      },
      zIndex: {
        sticky: '10',
        header: '100',
        banner: '110',
        overlay: '1000',
        dialog: '1010',
        tooltip: '1100',
      },
      // §7 Mouvement
      transitionDuration: {
        fast: '100ms',
        base: '150ms',
        slow: '200ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },
    },
  },
  plugins: [animate],
};
