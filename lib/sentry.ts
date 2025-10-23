import * as Sentry from "@sentry/nextjs";

/**
 * Utility functions for Sentry logging and error tracking
 */

// Client-side logging functions
export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('Sentry Error:', error, context);
  Sentry.captureException(error, {
    tags: {
      section: 'client',
    },
    extra: context,
  });
};

export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](`Sentry ${level}:`, message, context);
  Sentry.addBreadcrumb({
    message,
    level,
    category: 'custom',
    data: context,
  });
};

export const logUserAction = (action: string, context?: Record<string, any>) => {
  console.log('User action:', action, context);
  Sentry.addBreadcrumb({
    message: `User action: ${action}`,
    level: 'info',
    category: 'user',
    data: context,
  });
};

export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser(user);
};

export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Server-side logging functions
export const logServerError = (error: Error, context?: Record<string, any>) => {
  console.error('Sentry Server Error:', error, context);
  Sentry.captureException(error, {
    tags: {
      section: 'server',
    },
    extra: context,
  });
};

export const logServerMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](`Sentry Server ${level}:`, message, context);
  Sentry.addBreadcrumb({
    message,
    level,
    category: 'server',
    data: context,
  });
};

// API route error handler
export const withSentryErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('API Route Error:', error, { function: fn.name, args: args.length });
      logServerError(error as Error, {
        function: fn.name,
        args: args.length,
      });
      throw error;
    }
  };
};

// Performance monitoring
export const startTransaction = async <T>(name: string, op: string, callback: (span: any) => Promise<T>): Promise<T> => {
  return Sentry.startSpan({ name, op }, callback);
};

export const startSpan = async <T>(name: string, op: string, callback: (span: any) => Promise<T>): Promise<T> => {
  return Sentry.startSpan({ name, op }, callback);
};

// Helper to create custom spans for API routes
export const withSpan = async <T>(name: string, op: string, callback: () => Promise<T>): Promise<T> => {
  return Sentry.startSpan({ name, op }, callback);
};
