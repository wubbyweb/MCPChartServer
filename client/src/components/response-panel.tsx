import { useState, useEffect } from "react";
import { Download, Copy, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ChartStatusResponse } from "@/lib/chart-api";
import SSEEvents from "./sse-events";

interface ResponsePanelProps {
  currentResponse: ChartStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  currentRequestId: string | null;
}

export default function ResponsePanel({ currentResponse, isLoading, error, currentRequestId }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState("preview");
  const { toast } = useToast();

  const handleDownload = () => {
    if (currentResponse?.chart?.base64) {
      const link = document.createElement('a');
      link.href = currentResponse.chart.base64;
      link.download = `chart_${currentResponse.symbol}_${Date.now()}.png`;
      link.click();
      
      toast({
        title: "Download Started",
        description: "Chart image is being downloaded.",
      });
    }
  };

  const handleCopy = async () => {
    if (currentResponse?.chart?.base64) {
      try {
        // Convert base64 to blob and copy to clipboard
        const response = await fetch(currentResponse.chart.base64);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        
        toast({
          title: "Copied to Clipboard",
          description: "Chart image copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy image to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusInfo = () => {
    if (error) {
      return { status: 'Error', color: 'text-red-600', icon: AlertCircle };
    }
    if (isLoading) {
      return { status: 'Processing', color: 'text-yellow-600', icon: Clock };
    }
    if (currentResponse?.success) {
      return { status: '200 OK', color: 'text-[--success-green]', icon: CheckCircle };
    }
    return { status: 'Ready', color: 'text-gray-500', icon: Clock };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatFileSize = (base64: string) => {
    const bytes = (base64.length * 3) / 4;
    return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes.toFixed(0)} B`;
  };

  return (
    <div className="w-1/2 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* Response Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[--text-primary]">Response</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <StatusIcon size={16} className={statusInfo.color} />
              <span className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.status}
              </span>
            </div>
            {currentResponse?.processingTime && (
              <span className="text-sm text-[--secondary-slate] font-mono">
                {(currentResponse.processingTime / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Response Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 bg-white">
          <TabsList className="h-auto bg-transparent p-0">
            <TabsTrigger 
              value="preview"
              className="py-3 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              Chart Preview
            </TabsTrigger>
            <TabsTrigger 
              value="response"
              className="py-3 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              Response Body
            </TabsTrigger>
            <TabsTrigger 
              value="headers"
              className="py-3 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              Headers
            </TabsTrigger>
            <TabsTrigger 
              value="events"
              className="py-3 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              SSE Events
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="preview" className="p-6 space-y-4 mt-0 h-full overflow-y-auto">
            {isLoading && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded chart-loading"></div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-white rounded-lg border border-red-200 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <h3 className="text-sm font-semibold text-red-600">Generation Failed</h3>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {currentResponse?.chart && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[--text-primary]">Generated Chart</h3>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleDownload}
                      className="p-2 text-[--secondary-slate] hover:text-[--text-primary]"
                      title="Download PNG"
                    >
                      <Download size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCopy}
                      className="p-2 text-[--secondary-slate] hover:text-[--text-primary]"
                      title="Copy to Clipboard"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>

                {/* Chart Display */}
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={currentResponse.chart.base64}
                    alt={`Generated TradingView chart for ${currentResponse.symbol}`}
                    className="w-full h-auto"
                  />
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[--secondary-slate]">File Size:</span>
                      <span className="font-mono ml-2">
                        {currentResponse.chart.base64 && formatFileSize(currentResponse.chart.base64)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[--secondary-slate]">Dimensions:</span>
                      <span className="font-mono ml-2">
                        {currentResponse.chart.metadata.width}x{currentResponse.chart.metadata.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-[--secondary-slate]">Format:</span>
                      <span className="font-mono ml-2">PNG</span>
                    </div>
                    <div>
                      <span className="text-[--secondary-slate]">Generated:</span>
                      <span className="font-mono ml-2">
                        {new Date(currentResponse.chart.metadata.generatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="response" className="p-6 mt-0 h-full overflow-y-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4">Response Data</h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <ScrollArea className="h-96">
                  <pre className="code-editor text-green-400 text-sm overflow-x-auto whitespace-pre-wrap">
                    {currentResponse ? JSON.stringify(currentResponse, null, 2) : '// No response data'}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="headers" className="p-6 mt-0 h-full overflow-y-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4">Response Headers</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[--secondary-slate]">Content-Type:</span>
                  <span className="font-mono">application/json</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--secondary-slate]">Cache-Control:</span>
                  <span className="font-mono">no-cache</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--secondary-slate]">Access-Control-Allow-Origin:</span>
                  <span className="font-mono">*</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-0 h-full">
            <SSEEvents requestId={currentRequestId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
