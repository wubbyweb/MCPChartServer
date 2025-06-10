import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import RequestPanel from "@/components/request-panel";
import ResponsePanel from "@/components/response-panel";
import { chartAPI, ChartStatusResponse } from "@/lib/chart-api";
import { ChartConfig } from "@shared/schema";
import { sseClient } from "@/lib/sse-client";
import { useToast } from "@/hooks/use-toast";

export default function ApiInterface() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('generate');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<ChartStatusResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Poll for chart status when we have a request ID
  const { data: chartStatus, isLoading } = useQuery({
    queryKey: ['/api/v2/chart/status', currentRequestId],
    queryFn: async () => {
      if (!currentRequestId) return null;
      return await chartAPI.getChartStatus(currentRequestId);
    },
    enabled: !!currentRequestId,
    refetchInterval: (data) => {
      // Stop polling if completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Update current response when chart status changes
  useEffect(() => {
    if (chartStatus) {
      setCurrentResponse(chartStatus);
      
      if (chartStatus.status === 'completed') {
        setIsGenerating(false);
        toast({
          title: "Chart Generated Successfully",
          description: `Chart for ${chartStatus.symbol} is ready.`,
        });
      } else if (chartStatus.status === 'failed') {
        setIsGenerating(false);
        setError(chartStatus.error || 'Chart generation failed');
        toast({
          title: "Chart Generation Failed",
          description: chartStatus.error || 'Unknown error occurred',
          variant: "destructive",
        });
      }
    }
  }, [chartStatus, toast]);

  // Listen for SSE events
  useEffect(() => {
    const handleSSEEvent = (event: any) => {
      if (event.type === 'error') {
        setError(event.message);
        setIsGenerating(false);
      }
    };

    sseClient.on('*', handleSSEEvent);

    return () => {
      sseClient.off('*', handleSSEEvent);
    };
  }, []);

  const handleGenerateChart = async (config: ChartConfig) => {
    try {
      setIsGenerating(true);
      setError(null);
      setCurrentResponse(null);

      const clientId = sseClient.getClientId();
      const response = await chartAPI.generateChart(config, clientId);
      
      if (response.success) {
        setCurrentRequestId(response.requestId);
        toast({
          title: "Chart Generation Started",
          description: "Your chart is being generated. Check the events panel for real-time updates.",
        });
      } else {
        throw new Error('Failed to start chart generation');
      }
    } catch (error) {
      setIsGenerating(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate chart';
      setError(errorMessage);
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[--background-light]">
      <Sidebar 
        onEndpointSelect={setSelectedEndpoint}
        selectedEndpoint={selectedEndpoint}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <RequestPanel 
          selectedEndpoint={selectedEndpoint}
          onGenerateChart={handleGenerateChart}
          isGenerating={isGenerating}
        />
        
        <ResponsePanel 
          currentResponse={currentResponse}
          isLoading={isLoading && isGenerating}
          error={error}
          currentRequestId={currentRequestId}
        />
      </div>
    </div>
  );
}
