"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LessonTrace } from "@/lib/tracing";

export default function TracesPage() {
  const [traces, setTraces] = useState<LessonTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<LessonTrace | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTraces();
  }, []);

  const fetchTraces = async () => {
    try {
      const response = await fetch('/api/traces');
      const data = await response.json();
      setTraces(data.traces || []);
    } catch (error) {
      console.error('Error fetching traces:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTrace = async (traceId: string) => {
    setDeleting(traceId);
    try {
      const response = await fetch(`/api/traces?id=${traceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTraces(traces.filter(trace => trace.id !== traceId));
        if (selectedTrace?.id === traceId) {
          setSelectedTrace(null);
        }
      } else {
        console.error('Failed to delete trace');
      }
    } catch (error) {
      console.error('Error deleting trace:', error);
    } finally {
      setDeleting(null);
    }
  };

  const deleteAllTraces = async () => {
    if (!confirm('Are you sure you want to delete all traces? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/traces?deleteAll=true', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTraces([]);
        setSelectedTrace(null);
      } else {
        console.error('Failed to delete all traces');
      }
    } catch (error) {
      console.error('Error deleting all traces:', error);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'started': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading traces...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lesson Generation Traces</h1>
        <div className="space-x-2">
          <Button onClick={fetchTraces} variant="outline">
            Refresh
          </Button>
          <Button 
            onClick={deleteAllTraces} 
            variant="destructive"
            disabled={traces.length === 0}
          >
            Delete All Traces
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traces List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Traces ({traces.length})</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {traces.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No traces found
                </CardContent>
              </Card>
            ) : (
              traces.map((trace) => (
                <Card 
                  key={trace.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedTrace?.id === trace.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTrace(trace)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(trace.status)}>
                          {trace.status}
                        </Badge>
                        {trace.provider_used && (
                          <Badge variant="outline">{trace.provider_used}</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTrace(trace.id);
                        }}
                        disabled={deleting === trace.id}
                      >
                        {deleting === trace.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <div>Lesson ID: {trace.lesson_id}</div>
                      <div>Created: {formatDate(trace.created_at)}</div>
                      {trace.total_duration_ms && (
                        <div>Duration: {formatDuration(trace.total_duration_ms)}</div>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      <strong>Request:</strong> {trace.request_data?.outline?.substring(0, 100)}...
                    </div>
                    
                    {trace.llm_calls && trace.llm_calls.length > 0 && (
                      <div className="text-sm text-gray-500 mt-2">
                        {trace.llm_calls.length} LLM call(s)
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Trace Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Trace Details</h2>
          {selectedTrace ? (
            <div className="space-y-4">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Trace ID:</strong> {selectedTrace.id}</div>
                  <div><strong>Lesson ID:</strong> {selectedTrace.lesson_id}</div>
                  <div><strong>Status:</strong> 
                    <Badge className={`ml-2 ${getStatusColor(selectedTrace.status)}`}>
                      {selectedTrace.status}
                    </Badge>
                  </div>
                  <div><strong>Provider Used:</strong> {selectedTrace.provider_used || 'N/A'}</div>
                  {selectedTrace.fallback_providers && selectedTrace.fallback_providers.length > 0 && (
                    <div><strong>Fallback Providers:</strong> {selectedTrace.fallback_providers.join(', ')}</div>
                  )}
                  <div><strong>Created:</strong> {formatDate(selectedTrace.created_at)}</div>
                  {selectedTrace.completed_at && (
                    <div><strong>Completed:</strong> {formatDate(selectedTrace.completed_at)}</div>
                  )}
                  {selectedTrace.total_duration_ms && (
                    <div><strong>Total Duration:</strong> {formatDuration(selectedTrace.total_duration_ms)}</div>
                  )}
                </CardContent>
              </Card>

              {/* Request Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(selectedTrace.request_data, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {/* Response Data */}
              {selectedTrace.response_data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto max-h-64">
                      {JSON.stringify(selectedTrace.response_data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* LLM Calls */}
              {selectedTrace.llm_calls && selectedTrace.llm_calls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">LLM Calls ({selectedTrace.llm_calls.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTrace.llm_calls.map((call, index) => (
                      <div key={index} className="border rounded p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{call.provider}</Badge>
                            <Badge className={call.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {call.success ? 'Success' : 'Failed'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDuration(call.duration_ms)}
                          </div>
                        </div>
                        
                        <div className="text-sm space-y-2">
                          <div><strong>Request:</strong></div>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(call.request, null, 2)}
                          </pre>
                          
                          {call.response && (
                            <>
                              <div><strong>Response:</strong></div>
                              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-32">
                                {JSON.stringify(call.response, null, 2)}
                              </pre>
                            </>
                          )}
                          
                          {call.error && (
                            <div className="text-red-600">
                              <strong>Error:</strong> {call.error}
                            </div>
                          )}
                          
                          <div className="text-gray-500 text-xs">
                            Timestamp: {formatDate(call.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {selectedTrace.error_message && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Error Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-red-50 p-4 rounded text-red-800">
                      {selectedTrace.error_message}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Select a trace to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
