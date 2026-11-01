import type { Metadata, Viewport } from "next"
import "@fontsource-variable/manrope"
import "./globals.css"

export const metadata: Metadata = {
  title: "KINGG — Fluxo criativo",
  description: "Central de demandas criativas da Addex Company, com briefings, prazos, entregas e acompanhamento de presença.",
  applicationName: "KINGG",
}

export const viewport: Viewport = {
  themeColor: "#201e28",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
