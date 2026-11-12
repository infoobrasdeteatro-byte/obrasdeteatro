import type { Metadata, Viewport } from "next"
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import CookieBanner from "@/components/CookieBanner"
import SiteFooter from "@/components/SiteFooter"

const newsreader = Newsreader({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
})

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
})

export const metadata: Metadata = {
  // Dominio canónico para las URL absolutas de Open Graph y Twitter (la raíz
  // sin www redirige con 308 a www).
  metadataBase: new URL("https://www.obrasdeteatro.com"),
  title: "ObrasDeTeatro® — Plataforma profesional de teatro en español",
  description: "Conectamos actores, directores, dramaturgos, compañías y teatros de toda la comunidad hispanohablante.",
  // Versión instalable (ver app/manifest.ts). En iPhone, al añadirla a la
  // pantalla de inicio se abre a pantalla completa y con este nombre.
  appleWebApp: {
    capable: true,
    title: "ObrasDeTeatro",
    statusBarStyle: "default",
  },
}

// Color de la barra del navegador y del sistema: el blanco de la cabecera,
// para que la web se vea igual que hasta ahora.
export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        {children}
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  )
}
