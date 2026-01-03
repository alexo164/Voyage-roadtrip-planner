import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Voyage - Road Trip Planner',
  description: 'Plan your perfect road trip across Europe with AI-powered recommendations for accommodations, flights, and optimal travel timing.',
  keywords: ['road trip', 'travel planner', 'Europe', 'vacation', 'hotels', 'car rental'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(30, 41, 59, 0.95)',
              color: '#f8fafc',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: {
                primary: '#14b8a6',
                secondary: '#f8fafc',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f8fafc',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}

