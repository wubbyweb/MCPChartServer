import { useState, useEffect } from "react";
import { ChartLine, Activity, Database, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { sseClient } from "@/lib/sse-client";

interface SidebarProps {
  onEndpointSelect: (endpoint: string) => void;
  selectedEndpoint: string;
}

const endpoints = [
  {
    method: 'POST',
    path: '/api/v2/chart/generate',
    description: 'Generate TradingView charts',
    id: 'generate',
    color: 'bg-green-100 text-green-700'
  },
  {
    method: 'GET',
    path: '/api/v2/chart/status',
    description: 'Check chart generation status',
    id: 'status',
    color: 'bg-blue-100 text-blue-700'
  },
  {
    method: 'SSE',
    path: '/api/v2/events',
    description: 'Real-time chart updates',
    id: 'events',
    color: 'bg-purple-100 text-purple-700'
  },
  {
    method: 'GET',
    path: '/api/v2/symbols',
    description: 'Get available trading symbols',
    id: 'symbols',
    color: 'bg-blue-100 text-blue-700'
  }
];

export default function Sidebar({ onEndpointSelect, selectedEndpoint }: SidebarProps) {
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [environment, setEnvironment] = useState<string>('development');

  useEffect(() => {
    // Set up SSE connection status listener
    sseClient.onStatusChange(setConnectionStatus);
    
    // Connect to SSE
    sseClient.connect();

    return () => {
      sseClient.disconnect();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'status-connected';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'status-disconnected';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[--primary-blue] rounded-lg flex items-center justify-center">
            <ChartLine className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[--text-primary]">MCP Chart Server</h1>
            <p className="text-sm text-[--secondary-slate]">API Interface v2.1</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[--text-primary]">SSE Connection</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-[--success-green] sse-indicator' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-500 sse-indicator'
                : 'bg-red-500'
            }`}></div>
            <span className={`text-sm font-mono ${getStatusColor(connectionStatus)}`}>
              {getStatusText(connectionStatus)}
            </span>
          </div>
        </div>
        <div className="mt-2 text-xs text-[--secondary-slate] font-mono">
          ws://localhost:5000/api/v2/events
        </div>
      </div>

      {/* API Endpoints */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-3">Endpoints</h3>
          
          <div className="space-y-2">
            {endpoints.map((endpoint) => (
              <div 
                key={endpoint.id}
                className={`border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition-shadow cursor-pointer ${
                  selectedEndpoint === endpoint.id ? 'ring-2 ring-[--primary-blue] ring-opacity-50' : ''
                }`}
                onClick={() => onEndpointSelect(endpoint.id)}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={`request-method px-2 py-1 rounded text-xs ${endpoint.color}`}>
                        {endpoint.method}
                      </Badge>
                      <span className="text-sm font-medium">{endpoint.path}</span>
                    </div>
                    <Activity size={12} className="text-gray-400" />
                  </div>
                  <p className="text-xs text-[--secondary-slate] mt-1">{endpoint.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environment */}
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-3">Environment</h3>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="w-full font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="development">Development (localhost:5000)</SelectItem>
              <SelectItem value="staging">Staging (staging.mcp-chart.com)</SelectItem>
              <SelectItem value="production">Production (api.mcp-chart.com)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
