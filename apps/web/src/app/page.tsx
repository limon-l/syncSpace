import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <h1 className="text-4xl font-bold text-text-primary">SyncSpace</h1>
      <p className="mt-2 text-lg text-text-secondary">
        Real-time video conferencing and collaborative workspace
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/register"
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
