import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ウォーキング日記',
  description: 'さまよう散歩を気軽に記録できるウォーキング日記アプリ'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-mist">
        {children}
      </body>
    </html>
  );
}
