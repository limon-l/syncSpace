import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px] sm:h-96 sm:w-96 lg:h-[500px] lg:w-[500px]" />
        <div className="absolute right-1/4 top-3/4 h-48 w-48 -translate-y-1/2 rounded-full bg-secondary/10 blur-[100px] sm:h-64 sm:w-64 lg:h-80 lg:w-80" />
      </div>

      <div className="text-center max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-surface/80 px-3 py-1 sm:px-4 sm:py-1.5 mb-6 sm:mb-8 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs sm:text-sm text-text-secondary">Real-time collaboration platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-[1.1]">
          Where teams{' '}
          <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_linear_infinite]">
            connect
          </span>
          {' '}in Sync
        </h1>

        <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-text-secondary leading-relaxed max-w-lg sm:max-w-xl mx-auto">
          Video conferencing, real-time collaboration, and shared workspaces — all in one seamless experience.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/register"
            className="group relative inline-flex items-center gap-2 rounded-xl bg-primary px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary-glow w-full sm:w-auto justify-center"
          >
            Get started free
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-surface/50 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-text-secondary transition-all hover:border-text-secondary/30 hover:text-text-primary backdrop-blur-sm w-full sm:w-auto justify-center"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="mt-12 sm:mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl lg:max-w-3xl mx-auto w-full px-4 sm:px-0">
        {[
          { label: 'HD Video', desc: 'Crystal clear calls' },
          { label: 'Real-time Sync', desc: 'Live collaboration' },
          { label: 'File Sharing', desc: 'Secure transfers' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-bg-surface/50 px-4 py-3 sm:py-4 text-center backdrop-blur-sm"
          >
            <p className="text-sm font-medium text-text-primary">{item.label}</p>
            <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
