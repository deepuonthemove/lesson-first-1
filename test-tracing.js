// Simple test script to verify tracing functionality
const { LessonTracer } = require('./lib/tracing.ts');

async function testTracing() {
  console.log('Testing tracing system...');
  
  try {
    // Test creating a trace
    const tracer = new LessonTracer('test-lesson-id');
    const traceId = await tracer.startTrace({
      outline: 'Test lesson outline',
      difficulty: 'intermediate',
      duration: 30
    });
    
    console.log('✓ Trace created:', traceId);
    
    // Test adding LLM call
    tracer.addLLMCall({
      provider: 'openai',
      request: {
        prompt: 'Generate lesson: Test lesson outline',
        model: 'gpt-3.5-turbo',
        temperature: 0.7
      },
      response: {
        content: 'Generated lesson content...',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      },
      duration_ms: 1500,
      success: true
    });
    
    console.log('✓ LLM call added');
    
    // Test completing trace
    await tracer.completeTrace({
      title: 'Test Lesson',
      content: 'Generated lesson content...'
    }, 'openai', ['anthropic']);
    
    console.log('✓ Trace completed');
    
    // Test fetching traces
    const traces = await LessonTracer.getTraces(10, 0);
    console.log('✓ Fetched traces:', traces.length);
    
    console.log('All tests passed! 🎉');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTracing();
