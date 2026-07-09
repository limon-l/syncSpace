'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading } = useAuthStore();

  useAuth();

  useEffect(() => {
    if (!isLoading) {
      const user = useAuthStore.getState().user;
      if (!user) {
        router.push('/login');
      }
    }
  }, [isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={24} className="text-primary" />
        </motion.div>
        <motion.p
          className="text-sm text-text-secondary"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading your workspace...
        </motion.p>
      </div>
    );
  }

  return <>{children}</>;
}
