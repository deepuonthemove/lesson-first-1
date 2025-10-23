import { createServiceClient } from '@/lib/supabase/server';
import { LLMProvider } from '@/lib/llm';

export interface LLMCall {
  provider: LLMProvider;
  request: {
    prompt: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  response?: {
    content: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  duration_ms: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface LessonTrace {
  id: string;
  lesson_id: string;
  request_data: any;
  response_data?: any;
  provider_used?: string;
  fallback_providers?: string[];
  total_duration_ms?: number;
  llm_calls: LLMCall[];
  error_message?: string;
  status: 'started' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export class LessonTracer {
  private traceId: string;
  private lessonId: string;
  private startTime: number;
  private llmCalls: LLMCall[] = [];

  constructor(lessonId: string) {
    this.lessonId = lessonId;
    this.traceId = crypto.randomUUID();
    this.startTime = Date.now();
  }

  async startTrace(requestData: any): Promise<string> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('lesson_traces')
      .insert({
        id: this.traceId,
        lesson_id: this.lessonId,
        request_data: requestData,
        status: 'started'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create lesson trace:', error);
    }

    return this.traceId;
  }

  addLLMCall(call: Omit<LLMCall, 'timestamp'>) {
    this.llmCalls.push({
      ...call,
      timestamp: new Date().toISOString()
    });
  }

  async updateTrace(updates: Partial<Pick<LessonTrace, 'provider_used' | 'fallback_providers' | 'error_message' | 'status' | 'response_data'>>) {
    const supabase = createServiceClient();
    
    const updateData: any = {
      ...updates,
      llm_calls: this.llmCalls
    };

    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
      updateData.total_duration_ms = Date.now() - this.startTime;
    }

    const { error } = await supabase
      .from('lesson_traces')
      .update(updateData)
      .eq('id', this.traceId);

    if (error) {
      console.error('Failed to update lesson trace:', error);
    }
  }

  async completeTrace(responseData: any, providerUsed: string, fallbackProviders: string[] = []) {
    await this.updateTrace({
      status: 'completed',
      provider_used: providerUsed,
      fallback_providers: fallbackProviders,
      response_data: responseData
    });
  }

  async failTrace(errorMessage: string) {
    await this.updateTrace({
      status: 'failed',
      error_message: errorMessage
    });
  }

  static async getTraces(limit: number = 50, offset: number = 0): Promise<LessonTrace[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('lesson_traces')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch lesson traces:', error);
      return [];
    }

    return data || [];
  }

  static async getTraceById(traceId: string): Promise<LessonTrace | null> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('lesson_traces')
      .select('*')
      .eq('id', traceId)
      .single();

    if (error) {
      console.error('Failed to fetch lesson trace:', error);
      return null;
    }

    return data;
  }

  static async deleteTrace(traceId: string): Promise<boolean> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('lesson_traces')
      .delete()
      .eq('id', traceId);

    if (error) {
      console.error('Failed to delete lesson trace:', error);
      return false;
    }

    return true;
  }

  static async deleteAllTraces(): Promise<boolean> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('lesson_traces')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Failed to delete all lesson traces:', error);
      return false;
    }

    return true;
  }
}
