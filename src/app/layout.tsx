import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini HRMS | Human Resource Management System',
  description: 'Clean, secure, and reliable Mini HRMS for small SaaS companies',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        <Toaster position="top-right" theme="dark" richColors />
        {children}
      </body>
    </html>
  );
}

