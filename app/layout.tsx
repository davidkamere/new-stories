import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'


const sans = Archivo({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '600', '700'] })
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Stories',
  description: 'Stories',
}



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  )
}
