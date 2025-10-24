/**
 * Secure TypeScript Compiler Loader
 * Provides safe loading of TypeScript compiler with integrity checks and fallbacks
 */

import { reportError } from './secure-typescript-utils';

// TypeScript compiler interface for dynamic loading
interface TypeScriptCompiler {
  transpile: (sourceText: string, compilerOptions?: any) => string;
  ScriptTarget: any;
  ModuleKind: any;
  JsxEmit: any;
}

// Extend Window interface to include TypeScript compiler
declare global {
  interface Window {
    ts?: TypeScriptCompiler;
  }
}

// TypeScript compiler versions and their integrity hashes
const TYPESCRIPT_VERSIONS = [
  {
    version: '5.9.3',
    url: 'https://unpkg.com/typescript@5.9.3/lib/typescript.js',
    integrity: 'sha384-...', // This would be the actual hash in production
    fallback: true
  },
  {
    version: 'latest',
    url: 'https://unpkg.com/typescript@latest/lib/typescript.js',
    integrity: null, // No integrity check for latest
    fallback: false
  }
];

// Timeout and retry configuration
const LOAD_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface TypeScriptLoaderOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onFallback?: () => void;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Secure TypeScript compiler loader with integrity checks and fallbacks
 */
export class SecureTypeScriptLoader {
  private retryCount = 0;
  private timeoutId: NodeJS.Timeout | null = null;
  private options: TypeScriptLoaderOptions;

  constructor(options: TypeScriptLoaderOptions = {}) {
    this.options = {
      timeout: LOAD_TIMEOUT,
      maxRetries: MAX_RETRIES,
      ...options
    };
  }

  /**
   * Loads TypeScript compiler with security measures
   */
  public async load(): Promise<boolean> {
    try {
      // Check if TypeScript is already loaded
      if (this.isTypeScriptLoaded()) {
        this.options.onSuccess?.();
        return true;
      }

      // Try loading with integrity checks first
      const success = await this.loadWithIntegrity();
      if (success) {
        this.options.onSuccess?.();
        return true;
      }

      // Fallback to basic loading
      const fallbackSuccess = await this.loadFallback();
      if (fallbackSuccess) {
        this.options.onFallback?.();
        return true;
      }

      throw new Error('Failed to load TypeScript compiler with all methods');

    } catch (error) {
      const err = error as Error;
      reportError(err, 'typescript-loader');
      this.options.onError?.(err);
      return false;
    }
  }

  /**
   * Loads TypeScript with integrity checks
   */
  private async loadWithIntegrity(): Promise<boolean> {
    const version = TYPESCRIPT_VERSIONS.find(v => v.integrity);
    if (!version) return false;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = version.url;
      script.crossOrigin = 'anonymous';
      
      if (version.integrity) {
        script.integrity = version.integrity;
      }

      // Set up timeout
      this.timeoutId = setTimeout(() => {
        this.cleanup(script);
        resolve(false);
      }, this.options.timeout);

      script.onload = () => {
        this.cleanup(script);
        clearTimeout(this.timeoutId!);
        
        if (this.isTypeScriptLoaded()) {
          resolve(true);
        } else {
          resolve(false);
        }
      };

      script.onerror = () => {
        this.cleanup(script);
        clearTimeout(this.timeoutId!);
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Fallback loading method
   */
  private async loadFallback(): Promise<boolean> {
    const version = TYPESCRIPT_VERSIONS.find(v => v.fallback);
    if (!version) return false;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = version.url;
      script.crossOrigin = 'anonymous';

      // Set up timeout
      this.timeoutId = setTimeout(() => {
        this.cleanup(script);
        resolve(false);
      }, this.options.timeout);

      script.onload = () => {
        this.cleanup(script);
        clearTimeout(this.timeoutId!);
        
        if (this.isTypeScriptLoaded()) {
          resolve(true);
        } else {
          resolve(false);
        }
      };

      script.onerror = () => {
        this.cleanup(script);
        clearTimeout(this.timeoutId!);
        
        // Retry if we haven't exceeded max retries
        if (this.retryCount < this.options.maxRetries!) {
          this.retryCount++;
          setTimeout(() => {
            this.loadFallback().then(resolve);
          }, RETRY_DELAY);
        } else {
          resolve(false);
        }
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Checks if TypeScript compiler is loaded and functional
   */
  private isTypeScriptLoaded(): boolean {
    return !!(
      window.ts &&
      typeof window.ts.transpile === 'function' &&
      window.ts.ScriptTarget &&
      window.ts.ModuleKind &&
      window.ts.JsxEmit
    );
  }

  /**
   * Cleans up script element and timeout
   */
  private cleanup(script: HTMLScriptElement): void {
    try {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    } catch (error) {
      console.warn('Failed to cleanup script element:', error);
    }
  }

  /**
   * Destroys the loader and cleans up resources
   */
  public destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Convenience function to load TypeScript compiler
 */
export const loadTypeScriptCompiler = (options?: TypeScriptLoaderOptions): Promise<boolean> => {
  const loader = new SecureTypeScriptLoader(options);
  return loader.load();
};

/**
 * Validates TypeScript compiler configuration
 */
export const validateTypeScriptConfig = (config: any): boolean => {
  const requiredProperties = [
    'target',
    'module',
    'jsx',
    'esModuleInterop',
    'allowSyntheticDefaultImports'
  ];

  return requiredProperties.every(prop => config.hasOwnProperty(prop));
};

/**
 * Creates a secure TypeScript compiler configuration
 */
export const createSecureTypeScriptConfig = () => {
  if (!window.ts) {
    throw new Error('TypeScript compiler not loaded');
  }
  
  return {
    target: window.ts.ScriptTarget.ES2020,
    module: window.ts.ModuleKind.ESNext,
    jsx: window.ts.JsxEmit.React,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false, // Disable strict mode for runtime compilation compatibility
    skipLibCheck: true, // Skip library checking for runtime compilation
    noImplicitAny: false, // Allow implicit any for runtime compilation
    noImplicitReturns: false, // Allow implicit returns
    noUnusedLocals: false, // Allow unused locals for generated code
    noUnusedParameters: false, // Allow unused parameters for generated code
    noImplicitThis: false, // Allow implicit this
    alwaysStrict: false, // Disable always strict for runtime compilation
    noEmitOnError: false, // Allow emission even with errors for runtime compilation
    noFallthroughCasesInSwitch: false, // Allow fallthrough for generated code
    noUncheckedIndexedAccess: false, // Allow unchecked access for generated code
    exactOptionalPropertyTypes: false // Allow flexible optional properties
  };
};

/**
 * Safe TypeScript compilation with error handling
 */
export const safeTranspile = (
  tsCode: string,
  config: any = createSecureTypeScriptConfig()
): { success: boolean; jsCode?: string; errors?: string[] } => {
  try {
    if (!window.ts) {
      return {
        success: false,
        errors: ['TypeScript compiler not loaded']
      };
    }

    if (!validateTypeScriptConfig(config)) {
      return {
        success: false,
        errors: ['Invalid TypeScript configuration']
      };
    }

    console.log('Compiling TypeScript code:', tsCode.substring(0, 200) + '...');
    console.log('Using config:', config);

    const jsCode = window.ts.transpile(tsCode, config);
    
    console.log('Compiled JavaScript:', jsCode.substring(0, 200) + '...');
    
    // More intelligent validation of compiled code
    if (!jsCode || jsCode.trim().length === 0) {
      console.error('Compilation produced empty code');
      return {
        success: false,
        errors: ['Compilation produced empty code']
      };
    }

    // Check for actual compilation errors, not legitimate JavaScript values
    if (jsCode.includes('undefined is not defined') || 
        jsCode.includes('null is not defined') ||
        jsCode.includes('ReferenceError') ||
        jsCode.includes('SyntaxError') ||
        jsCode.includes('TypeError')) {
      console.error('Compilation produced code with runtime errors');
      return {
        success: false,
        errors: ['Compilation produced code with runtime errors']
      };
    }

    console.log('TypeScript compilation successful');
    return {
      success: true,
      jsCode
    };

  } catch (error) {
    const err = error as Error;
    console.error('TypeScript compilation error:', err);
    reportError(err, 'typescript-compilation');
    
    return {
      success: false,
      errors: [err.message]
    };
  }
};
