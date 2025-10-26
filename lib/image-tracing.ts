import { createServiceClient } from '@/lib/supabase/server';

export interface ImageGenerationAttempt {
  model: string;
  prompt: string;
  request: {
    prompt: string;
    model: string;
    options?: Record<string, any>;
  };
  response?: {
    success: boolean;
    dataSize?: number;
    error?: string;
  };
  duration_ms: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ImageTrace {
  id: string;
  lesson_id: string;
  request_data: any;
  response_data?: any;
  models_tried?: string[];
  model_used?: string;
  total_duration_ms?: number;
  image_generation_attempts: ImageGenerationAttempt[];
  error_message?: string;
  status: 'started' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export class ImageTracer {
  private traceId: string;
  private lessonId: string;
  private startTime: number;
  private imageGenerationAttempts: ImageGenerationAttempt[] = [];
  private modelsTried: Set<string> = new Set();

  constructor(lessonId: string) {
    this.lessonId = lessonId;
    this.traceId = crypto.randomUUID();
    this.startTime = Date.now();
  }

  async startTrace(requestData: any): Promise<string> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('image_traces')
      .insert({
        id: this.traceId,
        lesson_id: this.lessonId,
        request_data: requestData,
        status: 'started'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create image trace:', error);
    }

    return this.traceId;
  }

  addImageGenerationAttempt(attempt: Omit<ImageGenerationAttempt, 'timestamp'>) {
    this.imageGenerationAttempts.push({
      ...attempt,
      timestamp: new Date().toISOString()
    });
    this.modelsTried.add(attempt.model);
  }

  async updateTrace(updates: Partial<Pick<ImageTrace, 'model_used' | 'models_tried' | 'error_message' | 'status' | 'response_data'>>) {
    const supabase = createServiceClient();
    
    const updateData: any = {
      ...updates,
      image_generation_attempts: this.imageGenerationAttempts,
      models_tried: Array.from(this.modelsTried)
    };

    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
      updateData.total_duration_ms = Date.now() - this.startTime;
    }

    const { error } = await supabase
      .from('image_traces')
      .update(updateData)
      .eq('id', this.traceId);

    if (error) {
      console.error('Failed to update image trace:', error);
    }
  }

  async completeTrace(responseData: any, modelUsed: string) {
    await this.updateTrace({
      status: 'completed',
      model_used: modelUsed,
      models_tried: Array.from(this.modelsTried),
      response_data: responseData
    });
  }

  async failTrace(errorMessage: string) {
    await this.updateTrace({
      status: 'failed',
      error_message: errorMessage
    });
  }

  static async getTraces(limit: number = 50, offset: number = 0): Promise<ImageTrace[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('image_traces')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch image traces:', error);
      return [];
    }

    return data || [];
  }

  static async getTraceById(traceId: string): Promise<ImageTrace | null> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('image_traces')
      .select('*')
      .eq('id', traceId)
      .single();

    if (error) {
      console.error('Failed to fetch image trace:', error);
      return null;
    }

    return data;
  }

  static async getTracesByLessonId(lessonId: string): Promise<ImageTrace[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('image_traces')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch image traces by lesson ID:', error);
      return [];
    }

    return data || [];
  }

  static async deleteTrace(traceId: string): Promise<boolean> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('image_traces')
      .delete()
      .eq('id', traceId);

    if (error) {
      console.error('Failed to delete image trace:', error);
      return false;
    }

    return true;
  }

  static async deleteAllTraces(): Promise<boolean> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('image_traces')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Failed to delete all image traces:', error);
      return false;
    }

    return true;
  }
}

