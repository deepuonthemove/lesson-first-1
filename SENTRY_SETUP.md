# Sentry Integration Setup

This project has been configured with Sentry for comprehensive error tracking and monitoring.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Sentry Configuration
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_SENTRY_DSN=your_public_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

## Getting Your Sentry Credentials

1. **Create a Sentry Account**: Go to [sentry.io](https://sentry.io) and create an account
2. **Create a New Project**: Choose "Next.js" as the platform
3. **Get Your DSN**: Copy the DSN from your project settings
4. **Get Org and Project Names**: These are visible in your Sentry dashboard URL

## Features Included

### 1. Error Tracking
- Automatic error capture for both client and server-side errors
- Error boundaries to catch React component errors
- API route error handling with detailed context

### 2. Performance Monitoring
- Transaction tracking for API routes
- Performance monitoring for page loads
- Custom performance metrics

### 3. User Context
- User identification and context tracking
- Custom breadcrumbs for user actions
- Session replay (configurable)

### 4. Logging Utilities
The following utility functions are available in `lib/sentry.ts`:

#### Client-side functions:
- `logError(error, context)` - Log client-side errors
- `logMessage(message, level, context)` - Log informational messages
- `logUserAction(action, context)` - Log user interactions
- `setUserContext(user)` - Set user context for error tracking
- `clearUserContext()` - Clear user context

#### Server-side functions:
- `logServerError(error, context)` - Log server-side errors
- `logServerMessage(message, level, context)` - Log server messages
- `withSentryErrorHandling(fn)` - Wrap API route handlers with error handling

### 5. Error Boundary
A React error boundary component (`components/error-boundary.tsx`) that:
- Catches JavaScript errors in component trees
- Logs errors to Sentry automatically
- Displays a user-friendly error fallback UI

## Configuration Details

### Client Configuration (`sentry.client.config.ts`)
- Includes session replay
- Configurable sampling rates
- Automatic breadcrumb collection

### Server Configuration (`sentry.server.config.ts`)
- Optimized for server-side error tracking
- Transaction sampling
- Custom context enrichment

### Middleware Integration
The middleware has been updated to include Sentry instrumentation for all requests.

## Usage Examples

### Logging Errors in Components
```typescript
import { logError } from '@/lib/sentry';

try {
  // Some operation that might fail
} catch (error) {
  logError(error as Error, { component: 'MyComponent' });
}
```

### Logging User Actions
```typescript
import { logUserAction } from '@/lib/sentry';

const handleButtonClick = () => {
  logUserAction('button_clicked', { buttonId: 'submit-form' });
  // Handle the action
};
```

### API Route Error Handling
```typescript
import { withSentryErrorHandling } from '@/lib/sentry';

export const GET = withSentryErrorHandling(async () => {
  // Your API logic here
});
```

## Production Considerations

1. **Source Maps**: Sentry will automatically upload source maps during build
2. **Sampling**: Adjust sampling rates in production to manage costs
3. **Privacy**: Review and configure data scrubbing for sensitive information
4. **Alerts**: Set up alerts for critical errors in your Sentry dashboard

## Monitoring

Once configured, you can monitor:
- Error rates and trends
- Performance metrics
- User sessions and interactions
- API route performance
- Custom events and breadcrumbs

Visit your Sentry dashboard to view all collected data and set up alerts.
