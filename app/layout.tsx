import type { Metadata } from 'next'
import { Libre_Baskerville, Work_Sans } from 'next/font/google'
import './globals.css'


const serif = Libre_Baskerville({ subsets: ['latin'], variable: '--font-serif', weight: ['400', '700'] })
const sans = Work_Sans({ subsets: ['latin'], variable: '--font-sans' })

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
      <body className={`${serif.variable} ${sans.variable}`}>
        {children}
      </body>
    </html>
  )
}
