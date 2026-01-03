/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 魔作智控主题色
        'magic': {
          'bg': '#0f172a',
          'card': '#1e293b',
          'border': '#334155',
          'primary': '#3b82f6',
          'success': '#22c55e',
          'warning': '#f59e0b',
          'danger': '#ef4444',
          'text': '#f8fafc',
          'text-secondary': '#94a3b8',
        },
        // 七色按钮
        'btn': {
          'red': '#ef4444',
          'orange': '#f97316',
          'yellow': '#eab308',
          'green': '#22c55e',
          'cyan': '#06b6d4',
          'blue': '#3b82f6',
          'purple': '#a855f7',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
