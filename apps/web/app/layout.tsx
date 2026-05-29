import './globals.css';
import 'katex/dist/katex.min.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { SocketProvider } from '@/providers/socket-provider';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'CodeJudge - Online Judge & Contest Platform',
  description:
    'Master competitive programming with AI-powered problem creation, automated judging, and interactive contests. Learn, practice, and compete with CodeJudge.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans bg-background scroll-smooth', geist.variable)}>
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
