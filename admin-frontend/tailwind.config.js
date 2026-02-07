/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0081C9',
          50: '#E6F6FF',
          100: '#CCEDFF',
          200: '#99DBFF',
          300: '#66C9FF',
          400: '#33B7FF',
          500: '#0081C9',
          600: '#0067A1',
          700: '#004D78',
          800: '#003450',
          900: '#001A28',
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
