import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { Sidebar } from '@/components/Sidebar';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CMSMasters Command Center',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@100;400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} bg-surface-app text-text-primary`}
      >
        <div className="flex h-screen">
          <KeyboardShortcuts />
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-8 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
