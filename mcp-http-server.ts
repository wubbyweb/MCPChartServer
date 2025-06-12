#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import { chartService } from './server/chart-service.js';
import { storage } from './server/storage.js';
import { chartConfigSchema } from './shared/schema.js';
import { z } from 'zod';

interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPClient {
  id: string;
  response: express.Response;
  capabilities?: any;
}

class ChartMCPHttpServer {
  private app: express.Application;
  private server: any;
  private clients: Map<string, MCPClient> = new Map();
  private port: number = 3001;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.server = createServer(this.app);
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes(): void {
    // MCP Protocol endpoints
    this.app.post('/mcp/initialize', this.handleInitialize.bind(this));
    this.app.post('/mcp/tools/list', this.handleListTools.bind(this));
    this.app.post('/mcp/tools/call', this.handleCallTool.bind(this));
    
    // SSE endpoint for MCP clients
    this.app.get('/mcp/events/:clientId', this.handleSSEConnection.bind(this));
    
    // Health check
    this.app.get('/mcp/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        clientCount: this.clients.size,
        chartServiceConfigured: chartService.isConfigured(),
      });
    });

    // Root endpoint with server info
    this.app.get('/', (req, res) => {
      res.json({
        name: 'chart-img-mcp-server',
        version: '1.0.0',
        protocol: 'Model Context Protocol over HTTP',
        endpoints: {
          initialize: 'POST /mcp/initialize',
          listTools: 'POST /mcp/tools/list',
          callTool: 'POST /mcp/tools/call',
          events: 'GET /mcp/events/:clientId',
          health: 'GET /mcp/health'
        },
        documentation: 'See README.md for client configuration'
      });
    });
  }

  private async handleInitialize(req: express.Request, res: express.Response): Promise<void> {
    try {
      const request: MCPRequest = req.body;
      
      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            sse: {
              enabled: true,
              endpoint: `/mcp/events/${this.generateClientId()}`
            }
          },
          serverInfo: {
            name: 'chart-img-mcp-server',
            version: '1.0.0'
          }
        }
      };

      res.json(response);
    } catch (error) {
      this.sendError(res, req.body?.id || 'unknown', -32603, 'Internal error', error);
    }
  }

  private async handleListTools(req: express.Request, res: express.Response): Promise<void> {
    try {
      const request: MCPRequest = req.body;
      
      const tools = [
        {
          name: 'generate_chart',
          description: 'Generate TradingView charts using Chart-IMG API with real-time progress updates',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Trading symbol in format EXCHANGE:SYMBOL (e.g., NASDAQ:AAPL)',
              },
              interval: {
                type: 'string',
                enum: ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1D', '1W', '1M'],
                description: 'Chart time interval',
              },
              chartType: {
                type: 'string',
                enum: ['candlestick', 'line', 'area', 'bar', 'heikin_ashi', 'hollow_candle', 'baseline', 'hi_lo', 'column'],
                description: 'Type of chart to generate',
              },
              width: {
                type: 'number',
                minimum: 400,
                maximum: 2000,
                default: 800,
                description: 'Chart width in pixels',
              },
              height: {
                type: 'number',
                minimum: 300,
                maximum: 1500,
                default: 600,
                description: 'Chart height in pixels',
              },
              theme: {
                type: 'string',
                enum: ['light', 'dark'],
                default: 'light',
                description: 'Chart theme',
              },
              indicators: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', description: 'Indicator type (e.g., sma, rsi, macd)' },
                    period: { type: 'number', description: 'Period for the indicator' },
                    color: { type: 'string', description: 'Color for the indicator' },
                  },
                  required: ['type'],
                },
                description: 'Technical indicators to add to the chart',
              },
              showVolume: {
                type: 'boolean',
                default: true,
                description: 'Show volume indicator',
              },
              showGrid: {
                type: 'boolean',
                default: true,
                description: 'Show chart grid',
              },
              timezone: {
                type: 'string',
                default: 'America/New_York',
                description: 'Chart timezone',
              },
            },
            required: ['symbol', 'interval', 'chartType'],
          },
        },
        {
          name: 'get_chart_status',
          description: 'Check the status of a chart generation request',
          inputSchema: {
            type: 'object',
            properties: {
              requestId: {
                type: 'string',
                description: 'The request ID returned from generate_chart',
              },
            },
            required: ['requestId'],
          },
        },
        {
          name: 'get_available_symbols',
          description: 'Get list of available trading symbols from Chart-IMG API',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_recent_requests',
          description: 'Get recent chart generation requests with their status',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                default: 10,
                minimum: 1,
                maximum: 50,
                description: 'Maximum number of requests to return',
              },
            },
          },
        },
        {
          name: 'health_check',
          description: 'Check the health and configuration status of the chart service',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result: { tools }
      };

      res.json(response);
    } catch (error) {
      this.sendError(res, req.body?.id || 'unknown', -32603, 'Internal error', error);
    }
  }

  private async handleCallTool(req: express.Request, res: express.Response): Promise<void> {
    try {
      const request: MCPRequest = req.body;
      const { name, arguments: args } = request.params;

      let result;
      switch (name) {
        case 'generate_chart':
          result = await this.handleGenerateChart(args);
          break;
        case 'get_chart_status':
          result = await this.handleGetChartStatus(args);
          break;
        case 'get_available_symbols':
          result = await this.handleGetAvailableSymbols();
          break;
        case 'get_recent_requests':
          result = await this.handleGetRecentRequests(args);
          break;
        case 'health_check':
          result = await this.handleHealthCheck();
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result
      };

      res.json(response);
    } catch (error) {
      this.sendError(res, req.body?.id || 'unknown', -32603, `Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  }

  private handleSSEConnection(req: express.Request, res: express.Response): void {
    const clientId = req.params.clientId || this.generateClientId();
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Add client to active connections
    this.clients.set(clientId, {
      id: clientId,
      response: res
    });

    // Send initial connection event
    this.sendSSEEvent(clientId, 'connection', {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    });

    // Handle client disconnect
    res.on('close', () => {
      this.clients.delete(clientId);
      console.log(`MCP client ${clientId} disconnected`);
    });

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (this.clients.has(clientId)) {
        res.write(': heartbeat\n\n');
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    console.log(`MCP client ${clientId} connected via SSE`);
  }

  private sendSSEEvent(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.response.write(`event: ${event}\n`);
      client.response.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE event:', error);
      this.clients.delete(clientId);
    }
  }

  private broadcastSSEEvent(event: string, data: any): void {
    for (const clientId of this.clients.keys()) {
      this.sendSSEEvent(clientId, event, data);
    }
  }

  private generateClientId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendError(res: express.Response, id: string | number, code: number, message: string, data?: any): void {
    const response: MCPResponse = {
      jsonrpc: '2.0',
      id,
      error: { code, message, data }
    };
    res.status(400).json(response);
  }

  // Tool handlers (same as STDIO version)
  private async handleGenerateChart(args: any) {
    const config = chartConfigSchema.parse(args);
    const chartRequest = await storage.createChartRequest(config);

    // Broadcast progress to all connected clients
    this.broadcastSSEEvent('chart_progress', {
      type: 'started',
      requestId: chartRequest.requestId,
      symbol: config.symbol,
      timestamp: new Date().toISOString()
    });

    const result = await chartService.generateChart(config, chartRequest.requestId);

    if (result.success) {
      await storage.updateChartRequest(chartRequest.requestId, {
        status: 'completed',
        chartUrl: result.url,
        base64Data: result.base64,
        processingTime: result.processingTime,
        completedAt: new Date(),
      });

      this.broadcastSSEEvent('chart_progress', {
        type: 'completed',
        requestId: chartRequest.requestId,
        processingTime: result.processingTime,
        timestamp: new Date().toISOString()
      });

      return {
        content: [
          {
            type: 'text',
            text: `Chart generated successfully!\n\nRequest ID: ${chartRequest.requestId}\nSymbol: ${config.symbol}\nInterval: ${config.interval}\nChart Type: ${config.chartType}\nProcessing Time: ${(result.processingTime! / 1000).toFixed(1)}s\n\nThe chart has been generated and is available as a PNG image.`,
          },
          ...(result.base64 ? [{
            type: 'image' as const,
            data: result.base64,
            mimeType: 'image/png' as const,
          }] : []),
        ],
      };
    } else {
      await storage.updateChartRequest(chartRequest.requestId, {
        status: 'failed',
        errorMessage: result.error,
        processingTime: result.processingTime,
        completedAt: new Date(),
      });

      this.broadcastSSEEvent('chart_progress', {
        type: 'failed',
        requestId: chartRequest.requestId,
        error: result.error,
        timestamp: new Date().toISOString()
      });

      throw new Error(`Chart generation failed: ${result.error}`);
    }
  }

  private async handleGetChartStatus(args: any) {
    const { requestId } = args;
    
    if (!requestId) {
      throw new Error('requestId is required');
    }

    const chartRequest = await storage.getChartRequest(requestId);
    
    if (!chartRequest) {
      throw new Error('Chart request not found');
    }

    const statusText = `Chart Status Report\n\nRequest ID: ${chartRequest.requestId}\nSymbol: ${chartRequest.symbol}\nInterval: ${chartRequest.interval}\nChart Type: ${chartRequest.chartType}\nStatus: ${chartRequest.status.toUpperCase()}\nCreated: ${chartRequest.createdAt.toISOString()}\n${chartRequest.completedAt ? `Completed: ${chartRequest.completedAt.toISOString()}\n` : ''}${chartRequest.processingTime ? `Processing Time: ${(chartRequest.processingTime / 1000).toFixed(1)}s\n` : ''}${chartRequest.errorMessage ? `Error: ${chartRequest.errorMessage}\n` : ''}`;

    return {
      content: [
        {
          type: 'text',
          text: statusText,
        },
        ...(chartRequest.status === 'completed' && chartRequest.base64Data ? [{
          type: 'image' as const,
          data: chartRequest.base64Data,
          mimeType: 'image/png' as const,
        }] : []),
      ],
    };
  }

  private async handleGetAvailableSymbols() {
    const symbols = await chartService.getAvailableSymbols();
    
    return {
      content: [
        {
          type: 'text',
          text: `Available Trading Symbols\n\nTotal symbols available: ${symbols.length}\n\nNote: Use symbols in EXCHANGE:SYMBOL format (e.g., NASDAQ:AAPL, NYSE:TSLA, BINANCE:BTCUSDT)\n\nCommon exchanges:\n- NASDAQ: US tech stocks\n- NYSE: US stocks\n- BINANCE: Crypto pairs\n- FOREX: Currency pairs\n- CRYPTO: Cryptocurrency symbols`,
        },
      ],
    };
  }

  private async handleGetRecentRequests(args: any) {
    const limit = args?.limit || 10;
    const requests = await storage.getRecentChartRequests(limit);

    const requestsText = requests
      .map(req => `${req.requestId} | ${req.symbol} | ${req.interval} | ${req.chartType} | ${req.status.toUpperCase()} | ${req.createdAt.toISOString()}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Recent Chart Requests (${requests.length} of ${limit})\n\nFormat: Request ID | Symbol | Interval | Type | Status | Created\n\n${requestsText || 'No recent requests found.'}`,
        },
      ],
    };
  }

  private async handleHealthCheck() {
    const isConfigured = chartService.isConfigured();
    
    return {
      content: [
        {
          type: 'text',
          text: `Chart Service Health Check\n\nService Status: ${isConfigured ? 'HEALTHY' : 'CONFIGURATION_ERROR'}\nChart-IMG API: ${isConfigured ? 'CONFIGURED' : 'API_KEY_MISSING'}\nConnected Clients: ${this.clients.size}\nTimestamp: ${new Date().toISOString()}\n\n${!isConfigured ? 'Please set the CHART_IMG_API_KEY environment variable to use the chart generation service.' : 'All systems operational. Ready to generate charts.'}`,
        },
      ],
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', (error?: Error) => {
        if (error) {
          console.error('Failed to start server:', error);
          reject(error);
          return;
        }
        
        console.log(`Chart-IMG MCP HTTP Server running on http://localhost:${this.port}`);
        console.log(`MCP Endpoints:`);
        console.log(`  Initialize: POST http://localhost:${this.port}/mcp/initialize`);
        console.log(`  List Tools: POST http://localhost:${this.port}/mcp/tools/list`);
        console.log(`  Call Tool:  POST http://localhost:${this.port}/mcp/tools/call`);
        console.log(`  SSE Events: GET  http://localhost:${this.port}/mcp/events/:clientId`);
        console.log(`  Health:     GET  http://localhost:${this.port}/mcp/health`);
        resolve();
      });

      this.server.on('error', (error: Error) => {
        console.error('Server error:', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('MCP HTTP Server stopped');
        resolve();
      });
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down MCP HTTP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down MCP HTTP Server...');
  process.exit(0);
});

// Run the server
const server = new ChartMCPHttpServer();
server.start().catch((error) => {
  console.error('Failed to start MCP HTTP server:', error);
  process.exit(1);
});

export default ChartMCPHttpServer;