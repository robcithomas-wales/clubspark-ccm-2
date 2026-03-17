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
          brightBlue: "#1857E0",
          lightBlue: "#A9BDD5",
          green: "#5EE082",
          softGreen: "#A9D4B2",
          gray: "#868B97",
          lightGray: "#B7BBC1",
        },
      },
      backgroundImage: {
        "clubspark-hero":
          "linear-gradient(135deg,#1832A8 0%,#1857E0 100%)",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15,27,61,0.08)",
      },
    },
  },
  plugins: [],
}

export default config