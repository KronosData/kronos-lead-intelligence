import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Kronos Lead Intelligence',
  description: 'Sales intelligence dashboard — Kronos Data',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="bg-background text-foreground antialiased">
        <div
          className="bg-dot-grid pointer-events-none fixed inset-0 z-0"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
        <Sidebar />
        <main className="relative z-10 ml-56 min-h-screen">{children}</main>
      </body>
    </html>
  )
}
