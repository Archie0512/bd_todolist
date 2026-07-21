/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // 主题色变量映射：--color-accent / --color-foreground / --color-background-N
        accent: "var(--color-accent)",
        foreground: "var(--color-foreground)",
        bg: {
          1: "var(--color-background-1)",
          2: "var(--color-background-2)",
          3: "var(--color-background-3)",
          4: "var(--color-background-4)",
        },
        // alt-1..7 是主题色板（标签颜色），语义映射保留旧名便于迁移
        "alt-1": "var(--color-alt-1)",
        "alt-2": "var(--color-alt-2)",
        "alt-3": "var(--color-alt-3)",
        "alt-4": "var(--color-alt-4)",
        "alt-5": "var(--color-alt-5)",
        "alt-6": "var(--color-alt-6)",
        "alt-7": "var(--color-alt-7)",
        // 语义别名（便于语义化使用）
        danger: "var(--color-alt-1)",
        warning: "var(--color-alt-3)",
        success: "var(--color-alt-5)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "'SF Mono'",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
