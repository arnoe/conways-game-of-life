import type { Viewport } from 'next';
import './global.css';

export const metadata = {
  title: "Conway's Game of Life",
  description:
    "Interactive Conway's Game of Life simulation — paint, run, pause, step, and adjust speed.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
