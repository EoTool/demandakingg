import type { Metadata, Viewport } from "next"
import "@fontsource-variable/manrope"
import "./globals.css"

export const metadata: Metadata = {
  title: "KINGG — Demandas de criação",
  description: "Central de solicitações de design da equipe criativa da Addex Company, com acompanhamento feito por Gustavo.",
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
