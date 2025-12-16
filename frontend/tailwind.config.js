/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        subtle: "0 1px 6px rgba(0,0,0,0.06)",
        soft: "0 8px 30px rgba(0,0,0,0.08)",
      },
      keyframes: {
        typing: {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "typing-1": "typing 1s infinite ease-in-out",
        "typing-2": "typing 1s infinite ease-in-out 0.2s",
        "typing-3": "typing 1s infinite ease-in-out 0.4s",
      },
    },
  },
  plugins: [],
};
