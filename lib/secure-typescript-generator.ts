/**
 * Secure TypeScript Generator
 * Main class that orchestrates safe TypeScript generation with all security measures
 */

import {
  sanitizeInput,
  validateGeneratedCode,
  generateSafeComponentName,
  createSafeTypeScriptTemplate,
  manageStorage,
  reportError,
  createFallbackComponent
} from './secure-typescript-utils';

import {
  loadTypeScriptCompiler,
  createSecureTypeScriptConfig,
  safeTranspile
} from './secure-typescript-loader';

export interface SecureGenerationOptions {
  userInput?: string;
  componentPrefix?: string;
  enableStorage?: boolean;
  onSuccess?: (componentName: string, jsCode: string) => void;
  onError?: (error: Error) => void;
  onFallback?: () => void;
}

export interface GenerationResult {
  success: boolean;
  componentName?: string;
  tsCode?: string;
  jsCode?: string;
  errors?: string[];
  usedFallback?: boolean;
}

/**
 * Secure TypeScript Generator Class
 */
export class SecureTypeScriptGenerator {
  private isInitialized = false;
  private isGenerating = false;
  private options: SecureGenerationOptions;

  constructor(options: SecureGenerationOptions = {}) {
    this.options = {
      enableStorage: true,
      ...options
    };
  }

  /**
   * Initializes the TypeScript generator
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      const success = await loadTypeScriptCompiler({
        onSuccess: () => {
          console.log('TypeScript compiler loaded successfully');
        },
        onError: (error) => {
          reportError(error, 'typescript-initialization');
        },
        onFallback: () => {
          console.warn('Using fallback TypeScript compiler');
        }
      });

      this.isInitialized = success;
      return success;

    } catch (error) {
      const err = error as Error;
      reportError(err, 'generator-initialization');
      return false;
    }
  }

  /**
   * Generates TypeScript code safely
   */
  public async generate(options: SecureGenerationOptions = {}): Promise<GenerationResult> {
    if (this.isGenerating) {
      return {
        success: false,
        errors: ['Generation already in progress']
      };
    }

    this.isGenerating = true;
    const mergedOptions = { ...this.options, ...options };

    try {
      // Initialize if not already done
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            errors: ['Failed to initialize TypeScript compiler'],
            usedFallback: true
          };
        }
      }

      // Generate safe component name
      const componentName = generateSafeComponentName(mergedOptions.componentPrefix);
      
      // Sanitize user input
      const sanitizedInput = sanitizeInput(mergedOptions.userInput || '');
      
      // Create timestamp
      const timestamp = new Date().toISOString();
      
      // Generate TypeScript code using safe template
      const tsCode = createSafeTypeScriptTemplate(
        componentName,
        sanitizedInput,
        timestamp
      );

      // Validate generated code
      const validation = validateGeneratedCode(tsCode);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Compile TypeScript to JavaScript
      const config = createSecureTypeScriptConfig();
      console.log('Generated TypeScript code:', tsCode.substring(0, 300) + '...');
      console.log('Using compilation config:', config);
      
      const compilation = safeTranspile(tsCode, config);
      
      if (!compilation.success) {
        console.error('TypeScript compilation failed:', compilation.errors);
        return {
          success: false,
          errors: compilation.errors
        };
      }
      
      console.log('TypeScript compilation successful, generated JS:', compilation.jsCode?.substring(0, 200) + '...');

      // Store generated code if enabled
      if (mergedOptions.enableStorage) {
        manageStorage.setItem('generatedTypeScript', tsCode);
        manageStorage.setItem('compiledJavaScript', compilation.jsCode!);
        manageStorage.setItem('componentName', componentName);
        manageStorage.setItem('generationTimestamp', timestamp);
      }

      // Call success callback
      mergedOptions.onSuccess?.(componentName, compilation.jsCode!);

      return {
        success: true,
        componentName,
        tsCode,
        jsCode: compilation.jsCode
      };

    } catch (error) {
      const err = error as Error;
      reportError(err, 'typescript-generation');
      mergedOptions.onError?.(err);

      return {
        success: false,
        errors: [err.message]
      };

    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generates fallback component when TypeScript generation fails
   */
  public generateFallback(): GenerationResult {
    try {
      const fallbackCode = createFallbackComponent();
      
      return {
        success: true,
        componentName: 'FallbackComponent',
        tsCode: fallbackCode,
        jsCode: fallbackCode, // Fallback is already JavaScript-like
        usedFallback: true
      };

    } catch (error) {
      const err = error as Error;
      reportError(err, 'fallback-generation');
      
      return {
        success: false,
        errors: [err.message]
      };
    }
  }

  /**
   * Retrieves previously generated code
   */
  public getStoredCode(): {
    tsCode?: string;
    jsCode?: string;
    componentName?: string;
    timestamp?: string;
  } {
    return {
      tsCode: manageStorage.getItem('generatedTypeScript') || undefined,
      jsCode: manageStorage.getItem('compiledJavaScript') || undefined,
      componentName: manageStorage.getItem('componentName') || undefined,
      timestamp: manageStorage.getItem('generationTimestamp') || undefined
    };
  }

  /**
   * Clears stored generated code
   */
  public clearStoredCode(): void {
    try {
      manageStorage.clearOldItems();
    } catch (error) {
      reportError(error as Error, 'storage-cleanup');
    }
  }

  /**
   * Gets generation status
   */
  public getStatus(): {
    isInitialized: boolean;
    isGenerating: boolean;
    hasStoredCode: boolean;
  } {
    const storedCode = this.getStoredCode();
    
    return {
      isInitialized: this.isInitialized,
      isGenerating: this.isGenerating,
      hasStoredCode: !!(storedCode.tsCode && storedCode.jsCode)
    };
  }

  /**
   * Destroys the generator and cleans up resources
   */
  public destroy(): void {
    this.isInitialized = false;
    this.isGenerating = false;
    this.clearStoredCode();
  }
}

/**
 * Convenience function to create and use a secure generator
 */
export const createSecureGenerator = async (
  options: SecureGenerationOptions = {}
): Promise<SecureTypeScriptGenerator> => {
  const generator = new SecureTypeScriptGenerator(options);
  await generator.initialize();
  return generator;
};

/**
 * Quick generation function for simple use cases
 */
export const generateSecureTypeScript = async (
  userInput: string = '',
  options: Omit<SecureGenerationOptions, 'userInput'> = {}
): Promise<GenerationResult> => {
  const generator = await createSecureGenerator({
    ...options,
    userInput
  });

  return await generator.generate();
};
