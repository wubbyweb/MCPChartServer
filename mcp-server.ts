#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { chartService } from './server/chart-service.js';
import { storage } from './server/storage.js';
import { chartConfigSchema } from './shared/schema.js';
import { z } from 'zod';

class ChartMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'chart-img-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
                      overbought: { type: 'number', description: 'Overbought level for oscillators' },
                      oversold: { type: 'number', description: 'Oversold level for oscillators' },
                    },
                    required: ['type'],
                  },
                  description: 'Technical indicators to add to the chart',
                },
                drawings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', description: 'Drawing type (e.g., trendline, rectangle)' },
                      points: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            x: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                            y: { type: 'number', description: 'Price level' },
                          },
                        },
                      },
                      color: { type: 'string', description: 'Drawing color' },
                      width: { type: 'number', description: 'Line width' },
                    },
                    required: ['type', 'points'],
                  },
                  description: 'Chart drawings and annotations',
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
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_chart':
            return await this.handleGenerateChart(args);
          case 'get_chart_status':
            return await this.handleGetChartStatus(args);
          case 'get_available_symbols':
            return await this.handleGetAvailableSymbols();
          case 'get_recent_requests':
            return await this.handleGetRecentRequests(args);
          case 'health_check':
            return await this.handleHealthCheck();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleGenerateChart(args: any) {
    // Validate the chart configuration
    const config = chartConfigSchema.parse(args);

    // Create a chart request
    const chartRequest = await storage.createChartRequest(config);

    // Generate the chart asynchronously
    const result = await chartService.generateChart(config, chartRequest.requestId);

    // Update the chart request with the result
    if (result.success) {
      await storage.updateChartRequest(chartRequest.requestId, {
        status: 'completed',
        chartUrl: result.url,
        base64Data: result.base64,
        processingTime: result.processingTime,
        completedAt: new Date(),
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
          text: `Chart Service Health Check\n\nService Status: ${isConfigured ? 'HEALTHY' : 'CONFIGURATION_ERROR'}\nChart-IMG API: ${isConfigured ? 'CONFIGURED' : 'API_KEY_MISSING'}\nTimestamp: ${new Date().toISOString()}\n\n${!isConfigured ? 'Please set the CHART_IMG_API_KEY environment variable to use the chart generation service.' : 'All systems operational. Ready to generate charts.'}`,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Chart-IMG MCP Server running on stdio');
  }
}

// Run the server
const server = new ChartMCPServer();
server.run().catch((error) => {
  console.error('Failed to run server:', error);
  process.exit(1);
});