import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  manifest: '/manifest.webmanifest?v=maydonlar-1',
  icons: {
    icon: '/favicon.svg?v=maydonlar-1',
    apple: '/icon-192.png?v=maydonlar-1',
  },
  title: 'Maydonlar — shahardagi katta ekranlarda sizning lahzangiz',
  description:
    'Surat, tabrik, tadbir e’loni yoki reklamangizni Toshkent ekranlarida joylashtiring.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
