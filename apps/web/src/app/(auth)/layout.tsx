import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-primary/8 blur-[120px] sm:h-80 sm:w-80" />
        <div className="absolute -right-32 bottom-1/4 h-64 w-64 rounded-full bg-secondary/8 blur-[120px] sm:h-80 sm:w-80" />
      </div>

      <Link
        href="/"
        className="absolute left-4 sm:left-8 top-4 sm:top-8 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        ← Back
      </Link>

      <div className="w-full max-w-sm sm:max-w-md rounded-2xl border border-border bg-bg-surface/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/20">
        <div className="mb-6 sm:mb-8 text-center">
          <Link href="/" className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SyncSpace
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
