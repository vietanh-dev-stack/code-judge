import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register — Code Judge',
  description: 'Create a new Code Judge account',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
