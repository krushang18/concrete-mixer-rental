/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f3ff",
          100: "#b3d9ff",
          200: "#80bfff",
          300: "#4da6ff",
          400: "#1a8cff",
          500: "#0081C9",
          600: "#0066a3",
          700: "#004d7a",
          800: "#003352",
          900: "#001a29",
        },
        secondary: {
          50: "#fffdf0",
          100: "#fff8cc",
          200: "#fff399",
          300: "#ffee66",
          400: "#ffe933",
          500: "#FFC93C",
          600: "#e6b136",
          700: "#cc9930",
          800: "#b38029",
          900: "#996823",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
        success: {
          50: "#f0f9f0",
          500: "#4caf50",
          600: "#388e3c",
          700: "#15803d",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
          700: "#a16207",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
