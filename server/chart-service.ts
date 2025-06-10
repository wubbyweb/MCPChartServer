import { ChartConfig } from "@shared/schema";
import { sseManager } from "./sse";

interface ChartImgResponse {
  success: boolean;
  url?: string;
  base64?: string;
  error?: string;
  processingTime?: number;
}

class ChartService {
  private apiKey: string;
  private baseUrl: string = 'https://api.chart-img.com';

  constructor() {
    this.apiKey = process.env.CHART_IMG_API_KEY || process.env.API_KEY || '';
    if (!this.apiKey) {
      console.warn('CHART_IMG_API_KEY not found in environment variables');
    }
  }

  async generateChart(config: ChartConfig, requestId: string, clientId?: string): Promise<ChartImgResponse> {
    const startTime = Date.now();

    try {
      // Send progress event
      if (clientId) {
        sseManager.sendEvent(clientId, 'progress', 'Preparing chart request...', requestId);
      }

      // Build the chart-img API payload
      const payload = this.buildChartPayload(config);

      // Send progress event
      if (clientId) {
        sseManager.sendEvent(clientId, 'progress', 'Sending request to Chart-IMG API...', requestId);
      }

      // Make API request to chart-img.com
      const response = await fetch(`${this.baseUrl}/v2/tradingview/advanced-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chart-IMG API error: ${response.status} ${errorText}`);
      }

      // Send progress event
      if (clientId) {
        sseManager.sendEvent(clientId, 'progress', 'Processing chart data...', requestId);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let result: ChartImgResponse;

      if (contentType?.includes('application/json')) {
        const jsonData = await response.json();
        result = {
          success: true,
          url: jsonData.url,
          base64: jsonData.base64,
          processingTime: Date.now() - startTime,
        };
      } else if (contentType?.includes('image/png')) {
        // Direct PNG response
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        result = {
          success: true,
          base64: `data:image/png;base64,${base64}`,
          processingTime: Date.now() - startTime,
        };
      } else {
        throw new Error('Unexpected response format from Chart-IMG API');
      }

      // Send success event
      if (clientId) {
        sseManager.sendEvent(clientId, 'success', `Chart generated successfully (${((Date.now() - startTime) / 1000).toFixed(1)}s)`, requestId, {
          chartGenerated: true,
          processingTime: result.processingTime,
        });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Send error event
      if (clientId) {
        sseManager.sendEvent(clientId, 'error', `Chart generation failed: ${errorMessage}`, requestId);
      }

      return {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private buildChartPayload(config: ChartConfig): any {
    const payload: any = {
      symbol: config.symbol,
      interval: config.interval,
      width: config.width,
      height: config.height,
      theme: config.theme,
      studies: [],
      drawings: [],
    };

    // Convert chart type
    switch (config.chartType) {
      case 'candlestick':
        payload.type = 1;
        break;
      case 'line':
        payload.type = 2;
        break;
      case 'area':
        payload.type = 3;
        break;
      case 'bar':
        payload.type = 0;
        break;
      case 'heikin_ashi':
        payload.type = 9;
        break;
      case 'hollow_candle':
        payload.type = 8;
        break;
      case 'baseline':
        payload.type = 7;
        break;
      case 'hi_lo':
        payload.type = 12;
        break;
      case 'column':
        payload.type = 11;
        break;
      default:
        payload.type = 1; // Default to candlestick
    }

    // Add indicators with correct Chart-IMG format
    if (config.indicators && config.indicators.length > 0) {
      payload.studies = config.indicators.map(indicator => {
        const study: any = {
          name: this.mapIndicatorName(indicator.type),
          inputs: [],
        };

        // Add period input for indicators that support it
        if (indicator.period) {
          study.inputs.push(indicator.period);
        }

        // Add style overrides if color is specified
        if (indicator.color) {
          study.styles = {
            plot_0: { color: indicator.color }
          };
        }

        return study;
      });
    }

    // Add drawings with correct Chart-IMG format
    if (config.drawings && config.drawings.length > 0) {
      payload.drawings = config.drawings.map(drawing => ({
        name: this.mapDrawingName(drawing.type),
        input: {
          points: drawing.points.map(point => ({
            time: point.x,
            price: point.y
          }))
        },
        options: {
          color: drawing.color || '#8B5CF6',
          linewidth: drawing.width || 2,
        },
      }));
    }

    // Additional options
    payload.options = {
      timezone: config.timezone,
      volume: config.showVolume,
      grid: config.showGrid,
    };

    return payload;
  }

  private mapIndicatorName(type: string): string {
    const indicatorMap: { [key: string]: string } = {
      'sma': 'Moving Average',
      'ema': 'Moving Average Exponential',
      'rsi': 'Relative Strength Index',
      'macd': 'MACD',
      'bb': 'Bollinger Bands',
      'stoch': 'Stochastic',
      'atr': 'Average True Range',
      'volume': 'Volume',
    };
    
    return indicatorMap[type.toLowerCase()] || 'Moving Average';
  }

  private mapDrawingName(type: string): string {
    const drawingMap: { [key: string]: string } = {
      'trendline': 'Trend Line',
      'horizontal': 'Horizontal Line',
      'vertical': 'Vertical Line',
      'rectangle': 'Rectangle',
    };
    
    return drawingMap[type.toLowerCase()] || 'Trend Line';
  }

  async getAvailableSymbols(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v3/exchanges`, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch symbols: ${response.status}`);
      }

      const data = await response.json();
      return data.exchanges || [];
    } catch (error) {
      console.error('Error fetching symbols:', error);
      // Return common symbol formats as fallback
      return [
        'NASDAQ:AAPL', 'NASDAQ:MSFT', 'NASDAQ:GOOGL', 'NASDAQ:TSLA',
        'NYSE:IBM', 'NYSE:JPM', 'NYSE:KO', 'NYSE:DIS',
        'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:ADAUSDT',
        'FOREX:EURUSD', 'FOREX:GBPUSD', 'FOREX:USDJPY'
      ];
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const chartService = new ChartService();
