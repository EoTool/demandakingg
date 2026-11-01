import type { Metadata, Viewport } from "next"
import "@fontsource-variable/manrope"
import "./globals.css"

export const metadata: Metadata = {
  title: "KINGG — Central de criação",
  description: "Painel de demandas de design da Addex Company, com briefings, prazos e entregas em um único fluxo.",
  applicationName: "KINGG",
}

export const viewport: Viewport = {
  themeColor: "#22202B",
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
