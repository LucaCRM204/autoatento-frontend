/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Color primario del tenant (branding.color_primario), lo setea TenantProvider
        primario: "var(--color-primario)",
      },
    },
  },
  plugins: [],
};
