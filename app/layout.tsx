import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Smart Tour Route Optimizer', description: 'An interactive laboratory for exact TSP algorithms.', generator: 'PCCOE TY IT • DAA' }
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#0B1220', userScalable: false }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html> }
