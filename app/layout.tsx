import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { TspProvider } from '@/context/tsp-context'
import { AppHeader } from '@/components/app-header'

export const metadata: Metadata = {
  title: 'RouteWise — Smart Tour Route Optimizer (Backtracking TSP)',
  description: 'An interactive educational laboratory for the Travelling Salesperson Problem using Backtracking with branch pruning (TY IT • DAA).',
  generator: 'PCCOE TY IT • DAA'
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
  userScalable: false
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900 min-h-screen">
        <TspProvider>
          <div className="app-shell flex flex-col min-h-screen bg-white">
            <AppHeader />
            <div className="flex-1 w-full">
              {children}
            </div>
          </div>
        </TspProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
