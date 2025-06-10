import { ChartConfig } from "@shared/schema";
import { apiRequest } from "./queryClient";

export interface ChartGenerationResponse {
  success: boolean;
  requestId: string;
  status: string;
  message: string;
}

export interface ChartStatusResponse {
  success: boolean;
  requestId: string;
  status: string;
  symbol: string;
  interval: string;
  chartType: string;
  createdAt: string;
  chart?: {
    url?: string;
    base64?: string;
    metadata: {
      symbol: string;
      interval: string;
      chartType: string;
      width: number;
      height: number;
      generatedAt: string;
      indicators?: any[];
      drawings?: any[];
    };
  };
  processingTime?: number;
  error?: string;
}

export interface SymbolsResponse {
  success: boolean;
  symbols: string[];
}

export interface RecentRequestsResponse {
  success: boolean;
  requests: Array<{
    requestId: string;
    symbol: string;
    interval: string;
    chartType: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    processingTime?: number;
  }>;
}

export interface HealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  chartServiceConfigured: boolean;
  sseClients: number;
}

export class ChartAPI {
  async generateChart(config: ChartConfig, clientId?: string): Promise<ChartGenerationResponse> {
    const headers: Record<string, string> = {};
    if (clientId) {
      headers['x-client-id'] = clientId;
    }

    const response = await apiRequest('POST', '/api/v2/chart/generate', config);
    return await response.json();
  }

  async getChartStatus(requestId: string): Promise<ChartStatusResponse> {
    const response = await apiRequest('GET', `/api/v2/chart/status/${requestId}`);
    return await response.json();
  }

  async getAvailableSymbols(): Promise<SymbolsResponse> {
    const response = await apiRequest('GET', '/api/v2/symbols');
    return await response.json();
  }

  async getRecentRequests(limit: number = 10): Promise<RecentRequestsResponse> {
    const response = await apiRequest('GET', `/api/v2/chart/recent?limit=${limit}`);
    return await response.json();
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await apiRequest('GET', '/api/health');
    return await response.json();
  }

  async getEventsForRequest(requestId: string): Promise<any> {
    const response = await apiRequest('GET', `/api/v2/events/${requestId}`);
    return await response.json();
  }
}

export const chartAPI = new ChartAPI();
