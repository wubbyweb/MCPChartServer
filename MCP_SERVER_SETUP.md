# MCP Chart Server Setup Guide

## Overview
This is a Model Context Protocol (MCP) server that integrates with Chart-IMG API to generate TradingView chart visualizations using Server-Sent Events (SSE) for real-time updates.

## Prerequisites

1. **Node.js 20+** - Required for running the server
2. **Chart-IMG API Key** - Get your free API key from [chart-img.com](https://chart-img.com)
3. **MCP Client** - Claude Desktop, Cline, or any MCP-compatible client

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Required: Chart-IMG API Key
CHART_IMG_API_KEY=your_api_key_here

# Optional: Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Start the Server
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## MCP Server Configuration

### For Claude Desktop

Add this configuration to your Claude Desktop settings file:

**Location:** 
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "chart-server": {
      "command": "node",
      "args": [
        "server/index.ts"
      ],
      "cwd": "/path/to/your/mcp-chart-server",
      "env": {
        "CHART_IMG_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### For Cline/Other MCP Clients

```json
{
  "name": "chart-server",
  "command": "node",
  "args": ["server/index.ts"],
  "cwd": "/path/to/your/mcp-chart-server",
  "env": {
    "CHART_IMG_API_KEY": "your_api_key_here"
  }
}
```

## Available MCP Tools

The server exposes these tools through the MCP protocol:

### 1. `generate_chart`
Generate TradingView charts with real-time progress updates.

**Parameters:**
- `symbol` (string): Trading symbol (e.g., "NASDAQ:AAPL")
- `interval` (string): Time interval ("1m", "5m", "15m", "1h", "1D", "1W", "1M")
- `chartType` (string): Chart type ("candlestick", "line", "area", "bar", "heikin_ashi")
- `width` (number): Chart width in pixels (400-2000)
- `height` (number): Chart height in pixels (300-1500)
- `theme` (string): "light" or "dark"
- `indicators` (array): Technical indicators configuration
- `drawings` (array): Chart drawings/annotations
- `timezone` (string): Timezone (default: "America/New_York")

**Example:**
```json
{
  "symbol": "NASDAQ:AAPL",
  "interval": "1D",
  "chartType": "candlestick",
  "width": 800,
  "height": 600,
  "theme": "light",
  "indicators": [
    {
      "type": "sma",
      "period": 20,
      "color": "#FF6B6B"
    }
  ]
}
```

### 2. `get_chart_status`
Check the status of a chart generation request.

**Parameters:**
- `requestId` (string): The request ID returned from generate_chart

### 3. `get_available_symbols`
Retrieve list of available trading symbols from Chart-IMG API.

### 4. `get_recent_requests`
Get recent chart generation requests with their status.

**Parameters:**
- `limit` (number): Maximum number of requests to return (default: 10)

### 5. `subscribe_to_events`
Subscribe to real-time SSE events for chart generation progress.

**Parameters:**
- `requestId` (string): Optional - filter events for specific request

## API Endpoints

If you want to use the server directly via HTTP:

- `POST /api/v2/chart/generate` - Generate a chart
- `GET /api/v2/chart/status/:requestId` - Get chart status
- `GET /api/v2/symbols` - Get available symbols
- `GET /api/v2/chart/recent` - Get recent requests
- `GET /api/v2/events` - SSE endpoint for real-time events
- `GET /api/health` - Health check

## Web Interface

The server includes a built-in web interface accessible at `http://localhost:5000` that provides:

- Interactive API testing interface
- Real-time SSE event monitoring
- Chart preview and download
- Request/response inspection

## SSE Events

The server provides real-time updates through Server-Sent Events:

- `request` - Chart generation started
- `progress` - Processing updates
- `success` - Chart completed successfully
- `error` - Generation failed
- `connection` - SSE connection status

## Error Handling

Common issues and solutions:

1. **Missing API Key**: Set `CHART_IMG_API_KEY` environment variable
2. **Invalid Symbol**: Use format "EXCHANGE:SYMBOL" (e.g., "NASDAQ:AAPL")
3. **Rate Limiting**: Chart-IMG has rate limits based on your plan
4. **Network Issues**: Check internet connection and Chart-IMG API status

## Support

- Chart-IMG API Documentation: [doc.chart-img.com](https://doc.chart-img.com)
- TradingView Symbols: Use TradingView symbol format
- Rate Limits: Depend on your Chart-IMG subscription plan

## Example Usage in MCP Client

```typescript
// Generate a chart
const result = await use_mcp_tool('generate_chart', {
  symbol: 'NASDAQ:AAPL',
  interval: '1D',
  chartType: 'candlestick',
  width: 800,
  height: 600,
  indicators: [
    { type: 'sma', period: 20 },
    { type: 'rsi', period: 14 }
  ]
});

// Check status
const status = await use_mcp_tool('get_chart_status', {
  requestId: result.requestId
});
```