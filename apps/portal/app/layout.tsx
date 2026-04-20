import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: { default: 'CMSMasters Portal', template: '%s | CMSMasters' },
  metadataBase: new URL('https://portal.cmsmasters.studio'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        {children}
        <Script src="/assets/animate-utils.js" strategy="afterInteractive" />
        <Script src="/assets/portal-shell.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
