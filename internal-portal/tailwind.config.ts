import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clubspark: {
          navy: "#0F1B3D",
          blue: "#1832A8",
        },
      },
    },
  },
  plugins: [],
}

export default config
