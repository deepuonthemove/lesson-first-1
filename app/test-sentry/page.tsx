'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function TestSentryPage() {
  useEffect(() => {
    // Test client-side Sentry
    console.log('Testing client-side Sentry...');
    
    // Test capturing a message
    Sentry.captureMessage('Test message from client-side', 'info');
    
    // Test capturing an exception
    try {
      throw new Error('Test client-side exception');
    } catch (error) {
      Sentry.captureException(error);
    }
    
    // Test custom tags
    Sentry.setTag('client_test', 'true');
    Sentry.setContext('client_context', {
      page: 'test-sentry',
      timestamp: new Date().toISOString()
    });
    
    console.log('Client-side Sentry tests completed');
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sentry Test Page</h1>
      <p className="mb-4">This page tests client-side Sentry integration.</p>
      <p className="mb-4">Check your Sentry dashboard for:</p>
      <ul className="list-disc list-inside mb-4">
        <li>Issues tab - for the test exception</li>
        <li>Performance tab - for transaction data</li>
        <li>Releases tab - for any release information</li>
      </ul>
      <button 
        onClick={() => {
          Sentry.captureMessage('Button clicked test', 'info');
          alert('Button clicked! Check Sentry for the message.');
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Button Click
      </button>
    </div>
  );
}
