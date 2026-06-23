import type { Metadata } from "next"
import { DM_Serif_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import CookieBanner from "@/components/CookieBanner"

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
})

const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ObrasDeTeatro® — Plataforma profesional de teatro en español",
  description: "Conectamos actores, directores, dramaturgos, compañías y teatros de toda la comunidad hispanohablante.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${dmSerif.variable} ${dmSans.variable}`}
    >
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
