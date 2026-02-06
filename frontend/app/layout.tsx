import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pyra — AI Voice Assistant | Pyramedia',
  description:
    'Talk to Pyra, your intelligent AI voice assistant powered by Pyramedia.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
