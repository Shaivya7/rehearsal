import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rehearsal — LLM Conversation QA',
  description: 'Test whether your AI agent correctly follows its prompt',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink font-sans">
        <header className="border-b border-border bg-surface/60 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="font-display text-xl font-semibold text-ink tracking-tight group-hover:text-gold transition-colors duration-200">
                Rehearsal
              </span>
              <span className="text-[10px] font-mono text-ink-3 border border-border px-1.5 py-0.5 rounded">
                v2
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[11px] text-ink-3 font-mono hidden sm:block">
                LLM · QA
              </span>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
