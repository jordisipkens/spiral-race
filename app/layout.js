import { Suspense } from 'react'
import './globals.css'
import Sidebar from '../components/Sidebar'

export const metadata = {
  title: 'Spiral Race - OSRS Clan Event',
  description: 'Progressive spiral-based event platform voor OSRS clan competitions',
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>
        {/* Sidebar reads search params, which requires a Suspense boundary */}
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <div className="app-content">{children}</div>
      </body>
    </html>
  )
}
