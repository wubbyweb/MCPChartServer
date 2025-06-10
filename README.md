# MCP Chart Server

A Model Context Protocol (MCP) server that integrates with Chart-IMG API to generate TradingView chart visualizations using Server-Sent Events (SSE) for real-time updates.

<a href="https://glama.ai/mcp/servers/@wubbyweb/MCPChartServer">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@wubbyweb/MCPChartServer/badge" alt="Chart Server MCP server" />
</a>

## Features

- **Real-time Chart Generation**: Generate TradingView charts with live progress updates
- **MCP Protocol Support**: Works with Claude Desktop, Cline, and other MCP clients
- **SSE Integration**: Real-time event streaming for chart generation progress
- **Professional Web Interface**: Built-in API testing interface with live preview
- **Comprehensive API**: Full REST API with status tracking and event history

## Quick Start

### 1. Get API Key
Register at [chart-img.com](https://chart-img.com) to get your free API key.

### 2. Setup Environment
```bash
# Clone and setup
git clone <your-repo>
cd mcp-chart-server
npm install

# Set API key
echo "CHART_IMG_API_KEY=your_api_key_here" > .env
```

### 3. Run the Server
```bash
# Web interface (development)
npm run dev
# Access: http://localhost:5000

# MCP server (for clients)
npx tsx mcp-server.ts
```

## MCP Client Configuration

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "chart-server": {
      "command": "npx",
      "args": ["tsx", "mcp-server.ts"],
      "cwd": "/path/to/mcp-chart-server",
      "env": {
        "CHART_IMG_API_KEY": "your_api_key"
      }
    }
  }
}
```

**Config File Locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Cline/Continue
Similar configuration in your MCP settings.

## Available Tools

### `generate_chart`
Generate TradingView charts with customizable parameters.

**Example:**
```json
{
  "symbol": "NASDAQ:AAPL",
  "interval": "1D",
  "chartType": "candlestick",
  "width": 800,
  "height": 600,
  "indicators": [
    {"type": "sma", "period": 20},
    {"type": "rsi", "period": 14}
  ]
}
```

### `get_chart_status`
Check generation progress and retrieve completed charts.

### `get_available_symbols`
List available trading symbols from Chart-IMG API.

### `get_recent_requests`
View recent chart generation history.

### `health_check`
Verify API configuration and service status.

## Supported Chart Types

- **Candlestick** - Traditional OHLC candles
- **Line** - Simple price line
- **Area** - Filled area chart
- **Bar** - OHLC bars
- **Heikin Ashi** - Modified candlesticks

## Technical Indicators

- **Moving Averages**: SMA, EMA, WMA
- **Oscillators**: RSI, MACD, Stochastic
- **Bollinger Bands**
- **Volume indicators**
- And many more from TradingView

## Symbol Format

Use TradingView symbol format: `EXCHANGE:SYMBOL`

**Examples:**
- `NASDAQ:AAPL` - Apple Inc.
- `NYSE:TSLA` - Tesla Inc.
- `BINANCE:BTCUSDT` - Bitcoin/USDT
- `FOREX:EURUSD` - EUR/USD pair

## Rate Limits

Depends on your Chart-IMG subscription:
- **Basic**: 1 req/sec, 50/day
- **Pro**: 10 req/sec, 500/day
- **Mega**: 15 req/sec, 1000/day
- **Ultra**: 35 req/sec, 3000/day

## Web Interface

Access the built-in interface at `http://localhost:5000` for:
- Interactive API testing
- Real-time SSE event monitoring
- Chart preview and download
- Request/response inspection

## API Endpoints

- `POST /api/v2/chart/generate` - Generate chart
- `GET /api/v2/chart/status/:id` - Check status
- `GET /api/v2/symbols` - Available symbols
- `GET /api/v2/events` - SSE connection
- `GET /api/health` - Health check

## Troubleshooting

**Missing API Key**
```
Error: CHART_IMG_API_KEY not found
Solution: Set environment variable or .env file
```

**Invalid Symbol**
```
Error: Symbol not found
Solution: Use EXCHANGE:SYMBOL format (e.g., NASDAQ:AAPL)
```

**Rate Limited**
```
Error: Too many requests
Solution: Check your Chart-IMG plan limits
```

## Development

```bash
# Start web server
npm run dev

# Run MCP server
npx tsx mcp-server.ts

# Type checking
npm run check
```

## License

MIT License - see LICENSE file for details.