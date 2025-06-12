# MCP Chart Server

A Model Context Protocol (MCP) server that integrates with Chart-IMG API to generate TradingView chart visualizations using Server-Sent Events (SSE) for real-time updates.

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

**Option A: Web Interface (Development)**
```bash
npm run dev
# Access: http://localhost:5000
```

**Option B: STDIO MCP Server (Traditional)**
```bash
npx tsx mcp-server.ts
```

**Option C: HTTP MCP Server with SSE (Recommended)**
```bash
npx tsx mcp-http-server.ts
# Or use the startup script:
./start-mcp-http.sh
# Server runs on: http://localhost:3001
```

The HTTP mode provides Server-Sent Events (SSE) for real-time chart generation updates and supports multiple concurrent clients.

## MCP Client Configuration

### Claude Desktop

**STDIO Mode (Traditional):**
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

**HTTP Mode (Recommended):**
```json
{
  "mcpServers": {
    "chart-server-http": {
      "url": "http://localhost:3001",
      "transport": "http"
    }
  }
}
```

**Config File Locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Cline/Continue

**STDIO Mode:**
```json
{
  "name": "chart-server",
  "command": "npx",
  "args": ["tsx", "mcp-server.ts"],
  "cwd": "/path/to/mcp-chart-server",
  "env": {
    "CHART_IMG_API_KEY": "your_api_key"
  }
}
```

**HTTP Mode:**
```json
{
  "name": "chart-server-http",
  "url": "http://localhost:3001",
  "type": "http"
}
```

### HTTP MCP Server with SSE

The HTTP MCP server provides real-time communication through Server-Sent Events (SSE) and standard REST endpoints:

**Core MCP Endpoints:**
- `POST /mcp/initialize` - Initialize MCP connection
- `POST /mcp/tools/list` - List available tools
- `POST /mcp/tools/call` - Execute tools

**Real-time Communication:**
- `GET /mcp/events/:clientId` - SSE event stream for live updates
- Chart generation progress, completion notifications, and errors

**Management Endpoints:**
- `GET /mcp/health` - Server health and configuration status
- `GET /` - Server information and endpoint documentation

**SSE Event Types:**
- `connection` - Client connection status
- `chart_progress` - Real-time chart generation updates
- `heartbeat` - Keep-alive messages

**Example SSE Usage:**
```javascript
const eventSource = new EventSource('http://localhost:3001/mcp/events/my-client');
eventSource.addEventListener('chart_progress', (event) => {
  const data = JSON.parse(event.data);
  console.log('Chart status:', data.type, data.message);
});
```

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

## Server Modes Comparison

| Feature | Web Interface | STDIO MCP | HTTP MCP + SSE |
|---------|---------------|-----------|----------------|
| Purpose | Development/Testing | Claude Desktop | Universal Clients |
| Transport | HTTP | Standard I/O | HTTP + SSE |
| Real-time Updates | WebSocket | None | Server-Sent Events |
| Multiple Clients | Yes | No | Yes |
| Language Support | Browser | MCP Clients Only | Any HTTP Client |
| Debugging | Browser DevTools | Logs | HTTP Tools + SSE |

## SSE Integration Details

The HTTP MCP server uses Server-Sent Events for real-time communication:

**Connection Flow:**
1. Client connects to `/mcp/events/:clientId`
2. Server establishes SSE stream
3. Real-time events sent during chart generation
4. Automatic reconnection on disconnect

**Event Structure:**
```javascript
{
  "type": "chart_progress",
  "requestId": "req_1234567890_1", 
  "message": "Chart generation started",
  "timestamp": "2025-06-12T03:16:30.000Z",
  "data": {
    "symbol": "NASDAQ:AAPL",
    "status": "processing"
  }
}
```

**Client Implementation:**
```javascript
class MCPSSEClient {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.clientId = `client_${Date.now()}`;
    this.eventSource = null;
  }

  connect() {
    this.eventSource = new EventSource(
      `${this.baseUrl}/mcp/events/${this.clientId}`
    );
    
    this.eventSource.onmessage = (event) => {
      console.log('SSE Event:', JSON.parse(event.data));
    };
    
    this.eventSource.addEventListener('chart_progress', (event) => {
      const data = JSON.parse(event.data);
      this.onChartProgress(data);
    });
  }

  onChartProgress(data) {
    console.log(`Chart ${data.requestId}: ${data.message}`);
  }

  async callTool(name, args) {
    const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args }
      })
    });
    return await response.json();
  }
}

// Usage with real-time updates
const client = new MCPSSEClient();
client.connect();

const result = await client.callTool('generate_chart', {
  symbol: 'NASDAQ:AAPL',
  interval: '1D',
  chartType: 'candlestick'
});
// SSE events will show progress in real-time
```

## Development

```bash
# Start web server (port 5000)
npm run dev

# Run STDIO MCP server
npx tsx mcp-server.ts

# Run HTTP MCP server with SSE (port 3001)
npx tsx mcp-http-server.ts

# Type checking
npm run check

# Test HTTP MCP server
node test-mcp-http.js

# View client examples
cat examples/client-examples.md
```

## Client Examples

See `examples/client-examples.md` for complete implementations in:
- **JavaScript/Node.js** - Full SSE client with real-time updates
- **Python** - Threading-based SSE client with error handling  
- **cURL** - Command-line testing and debugging

Each example includes proper SSE event handling, chart generation tracking, and error management.

## License

MIT License - see LICENSE file for details.