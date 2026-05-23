import type { Metadata } from 'next'
import { Fraunces, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import SiteHeader from '@/components/site-header'
import SiteFooter from '@/components/site-footer'
import { createServerSupabase } from '@/lib/supabase-server'
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
    template: '%s · Armstrong Equities',
  },
  description:
    'One-analyst equity research with pod-shop depth. Currently covering sports betting and iGaming.',
  openGraph: {
    title: 'Armstrong Equities',
    description:
      'One-analyst equity research with pod-shop depth. Currently covering sports betting and iGaming.',
    type: 'website',
    url: 'https://www.armstrongequities.com',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hide the site header and footer on the login screen. Middleware redirects
  // unauthed users to /login, so any other page reaching here has a session
  // and gets the full chrome.
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthed = !!user

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        {isAuthed && <SiteHeader />}
        <main className="flex-1">{children}</main>
        {isAuthed && <SiteFooter />}
      </body>
    </html>
  )
}
