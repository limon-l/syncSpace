import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'SyncSpace',
  description: 'Real-time video conferencing and collaborative workspace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-primary antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: '!bg-bg-surface !text-text-primary !border !border-border !shadow-lg',
          }}
        />
      </body>
    </html>
  );
}
