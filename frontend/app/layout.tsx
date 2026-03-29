import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Social Media App',
  description: 'Real-time social media web application',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
