import type { Metadata } from 'next'
import { Fraunces, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.armstrongequities.com'),
  title: {
    default: 'Armstrong Equities',
    template: '%s — Armstrong Equities',
  },
  description:
    'One-analyst equity research with pod-shop depth. Currently covering medical technology.',
  openGraph: {
    title: 'Armstrong Equities',
    description:
      'One-analyst equity research with pod-shop depth. Currently covering medical technology.',
    type: 'website',
    url: 'https://www.armstrongequities.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
