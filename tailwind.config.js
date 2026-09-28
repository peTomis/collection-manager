/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}", "./containers/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        geist: ["var(--font-geist)", "sans-serif"],
        "geist-mono": ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        // Collection Manager design palette, light/dark values in styles/tailwind.css
        paper: "rgb(var(--cm-paper) / <alpha-value>)",
        canvas: "rgb(var(--cm-canvas) / <alpha-value>)",
        ink: { DEFAULT: "rgb(var(--cm-ink) / <alpha-value>)", muted: "rgb(var(--cm-ink-muted) / <alpha-value>)" },
        line: "rgb(var(--cm-line) / <alpha-value>)",
        chip: "rgb(var(--cm-chip) / <alpha-value>)",
        binder: { DEFAULT: "rgb(var(--cm-binder) / <alpha-value>)", page: "rgb(var(--cm-binder-page) / <alpha-value>)" },
        gold: "oklch(0.6 0.13 75)",
        iris: "oklch(0.55 0.13 295)",
        gain: "var(--cm-gain)",
        loss: "var(--cm-loss)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
