import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'CMSMasters Command Center',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${mono.variable} bg-zinc-950 text-zinc-100`}>
        {children}
      </body>
    </html>
  );
}
