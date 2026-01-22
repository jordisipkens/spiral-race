import './globals.css'

export const metadata = {
  title: 'Spiral Race - OSRS Clan Event',
  description: 'Progressive spiral-based event platform voor OSRS clan competitions',
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
