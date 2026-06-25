import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-base)",
        foreground: "var(--text-primary)",
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          soft: "var(--brand-soft)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        sev: {
          safe: { DEFAULT: "var(--sev-safe)", soft: "var(--sev-safe-soft)" },
          low: { DEFAULT: "var(--sev-low)", soft: "var(--sev-low-soft)" },
          medium: { DEFAULT: "var(--sev-medium)", soft: "var(--sev-medium-soft)" },
          high: { DEFAULT: "var(--sev-high)", soft: "var(--sev-high-soft)" },
          critical: { DEFAULT: "var(--sev-critical)", soft: "var(--sev-critical-soft)" },
        },
      },
      borderColor: {
        subtle: "var(--border-subtle)",
        strong: "var(--border-strong)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};
export default config;
