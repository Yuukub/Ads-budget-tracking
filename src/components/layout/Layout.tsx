import { ReactNode } from 'react';
import { Header } from './Header';
import { useSettings } from '../../hooks/useSettings';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  useSettings(); // Initialize settings and favicon management
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
