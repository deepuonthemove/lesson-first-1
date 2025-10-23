import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Enable distributed tracing
  tracesSampleRate: 1.0,
  
  // Enable profiling
  profilesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: true,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Integrations for better tracing
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Add browser tracing integration
    Sentry.browserTracingIntegration(),
  ],

  // Enable tracing for all routes
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/.*\.vercel\.app\/api/,
    /^https:\/\/.*\.yourdomain\.com\/api/,
  ],
});
