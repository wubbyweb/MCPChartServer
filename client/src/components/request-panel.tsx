import { useState } from "react";
import { Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChartConfig } from "@shared/schema";

interface RequestPanelProps {
  selectedEndpoint: string;
  onGenerateChart: (config: ChartConfig) => Promise<void>;
  isGenerating: boolean;
}

export default function RequestPanel({ selectedEndpoint, onGenerateChart, isGenerating }: RequestPanelProps) {
  const [config, setConfig] = useState<ChartConfig>({
    symbol: "NASDAQ:AAPL",
    interval: "1D",
    chartType: "candlestick",
    width: 800,
    height: 600,
    indicators: [
      {
        type: "sma",
        period: 20,
        color: "#FF6B6B"
      },
      {
        type: "rsi",
        period: 14,
        overbought: 70,
        oversold: 30
      }
    ],
    drawings: [
      {
        type: "trendline",
        points: [
          { x: "2024-01-01", y: 150.00 },
          { x: "2024-12-01", y: 180.00 }
        ],
        color: "#8B5CF6",
        width: 2
      }
    ],
    theme: "light",
    showVolume: true,
    showGrid: true,
    timezone: "America/New_York"
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleConfigChange = (field: keyof ChartConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    await onGenerateChart(config);
  };

  const getEndpointInfo = () => {
    switch (selectedEndpoint) {
      case 'generate':
        return { method: 'POST', path: '/api/v2/chart/generate', color: 'bg-green-100 text-green-700' };
      case 'status':
        return { method: 'GET', path: '/api/v2/chart/status/:requestId', color: 'bg-blue-100 text-blue-700' };
      case 'events':
        return { method: 'SSE', path: '/api/v2/events', color: 'bg-purple-100 text-purple-700' };
      case 'symbols':
        return { method: 'GET', path: '/api/v2/symbols', color: 'bg-blue-100 text-blue-700' };
      default:
        return { method: 'POST', path: '/api/v2/chart/generate', color: 'bg-green-100 text-green-700' };
    }
  };

  const endpointInfo = getEndpointInfo();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Request Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <Badge className={`request-method px-3 py-1 rounded ${endpointInfo.color}`}>
              {endpointInfo.method}
            </Badge>
            <Input 
              value={endpointInfo.path}
              className="flex-1 font-mono text-sm bg-gray-50"
              readOnly
            />
          </div>
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || selectedEndpoint !== 'generate'}
            className="px-6 py-2 bg-[--primary-blue] hover:bg-blue-600 ml-4"
          >
            <Send className="mr-2" size={16} />
            {isGenerating ? 'Generating...' : 'Generate Chart'}
          </Button>
        </div>
      </div>

      {/* Request Configuration Tabs */}
      <Tabs defaultValue="parameters" className="flex-1 flex flex-col">
        <div className="border-b border-gray-200">
          <TabsList className="h-auto bg-transparent p-0">
            <TabsTrigger 
              value="parameters" 
              className="py-4 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              Parameters
            </TabsTrigger>
            <TabsTrigger 
              value="headers"
              className="py-4 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              Headers
            </TabsTrigger>
            <TabsTrigger 
              value="body"
              className="py-4 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              Body
            </TabsTrigger>
            <TabsTrigger 
              value="authorization"
              className="py-4 px-6 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[--primary-blue] data-[state=active]:text-[--primary-blue] rounded-none"
            >
              Authorization
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="parameters" className="p-6 space-y-6 mt-0">
            {/* Chart Configuration */}
            <div>
              <Label className="text-sm font-semibold text-[--text-primary] mb-3 block">Chart Configuration</Label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-xs font-medium text-[--secondary-slate] mb-2 block">Symbol</Label>
                    <Input 
                      value={config.symbol}
                      onChange={(e) => handleConfigChange('symbol', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-[--secondary-slate] mb-2 block">Interval</Label>
                    <Select value={config.interval} onValueChange={(value) => handleConfigChange('interval', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1m</SelectItem>
                        <SelectItem value="5m">5m</SelectItem>
                        <SelectItem value="15m">15m</SelectItem>
                        <SelectItem value="1h">1h</SelectItem>
                        <SelectItem value="1D">1D</SelectItem>
                        <SelectItem value="1W">1W</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-[--secondary-slate] mb-2 block">Chart Type</Label>
                    <Select value={config.chartType} onValueChange={(value) => handleConfigChange('chartType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candlestick">Candlestick</SelectItem>
                        <SelectItem value="line">Line</SelectItem>
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="heikin_ashi">Heikin Ashi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-[--secondary-slate] mb-2 block">Width</Label>
                    <Input 
                      type="number" 
                      value={config.width}
                      onChange={(e) => handleConfigChange('width', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-[--secondary-slate] mb-2 block">Height</Label>
                    <Input 
                      type="number" 
                      value={config.height}
                      onChange={(e) => handleConfigChange('height', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* JSON Request Body */}
            <div>
              <Label className="text-sm font-semibold text-[--text-primary] mb-3 block">Request Body (JSON)</Label>
              <div className="bg-gray-900 rounded-lg p-4">
                <Textarea 
                  value={JSON.stringify(config, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setConfig(parsed);
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="code-editor text-green-400 bg-transparent border-none resize-none min-h-[300px] text-sm"
                />
              </div>
            </div>

            {/* Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="text-sm font-medium text-[--secondary-slate] hover:text-[--text-primary] p-0">
                  <ChevronDown className={`mr-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} size={16} />
                  Advanced Options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-[--secondary-slate] mb-2 block">Theme</Label>
                    <Select value={config.theme} onValueChange={(value) => handleConfigChange('theme', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-[--secondary-slate] mb-2 block">Timezone</Label>
                    <Select value={config.timezone} onValueChange={(value) => handleConfigChange('timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="headers" className="p-6 mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">x-api-key</span>
                <Input placeholder="Your Chart-IMG API key" className="w-64" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Content-Type</span>
                <span className="text-sm text-gray-500">application/json</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="body" className="p-6 mt-0">
            <p className="text-sm text-gray-500">Request body is configured in the Parameters tab.</p>
          </TabsContent>

          <TabsContent value="authorization" className="p-6 mt-0">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">API Key</Label>
                <Input 
                  type="password" 
                  placeholder="Enter your Chart-IMG API key"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-gray-500">
                Get your API key from chart-img.com. The key will be sent in the x-api-key header.
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
