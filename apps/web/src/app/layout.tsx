import './global.css';

export const metadata = {
  title: "Conway's Game of Life",
  description:
    "Interactive Conway's Game of Life simulation — paint, run, pause, step, and adjust speed.",
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
