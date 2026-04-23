import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rehearsal — LLM Conversation QA',
  description: 'Test whether your AI agent follows its prompt correctly',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-white border-b px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <a href="/" className="text-lg font-bold text-slate-900 tracking-tight">
            Rehearsal
          </a>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">v2.0</span>
          <span className="text-slate-300 ml-auto text-xs hidden sm:block">
            LLM Conversation QA
          </span>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
