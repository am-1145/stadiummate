import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StadiumMate - FIFA World Cup 2026 AI Stadium Companion',
  description: 'Navigate stadiums safely, efficiently, and accessibly with StadiumMate. Featuring real-time crowd heatmaps, step-free elevator routing, SOS emergency evacuation controls, and multilingual GenAI translation engines.',
  keywords: 'FIFA World Cup 2026, Stadium navigation, Accessibility helper, Crowd intelligence, SOS emergency evacuation, Dijkstra routing, Gemini API',
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#080a0f] text-gray-100">
        {children}
      </body>
    </html>
  );
}
