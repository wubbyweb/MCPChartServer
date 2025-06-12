# HTTP MCP Server Usage Guide

The Chart-IMG MCP server now supports both STDIO and HTTP transport modes. HTTP mode is recommended for better compatibility and easier debugging.

## Quick Start (HTTP Mode)

1. **Start the HTTP MCP Server:**
```bash
npx tsx mcp-http-server.ts
```
Server runs on `http://localhost:3001`

2. **Test the Server:**
```bash
# Check server health
curl http://localhost:3001/mcp/health

# Get server info
curl http://localhost:3001/

# List available tools
curl -X POST http://localhost:3001/mcp/tools/list \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## HTTP Endpoints

### Server Information
- **GET /** - Server details and available endpoints

### MCP Protocol
- **POST /mcp/initialize** - Initialize MCP connection
- **POST /mcp/tools/list** - List available tools  
- **POST /mcp/tools/call** - Execute a tool
- **GET /mcp/events/:clientId** - SSE event stream
- **GET /mcp/health** - Health check

## Example Tool Calls

### Generate Chart
```bash
curl -X POST http://localhost:3001/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "generate_chart",
      "arguments": {
        "symbol": "NASDAQ:AAPL",
        "interval": "1D",
        "chartType": "candlestick",
        "width": 800,
        "height": 600,
        "theme": "light"
      }
    }
  }'
```

### Get Chart Status
```bash
curl -X POST http://localhost:3001/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_chart_status",
      "arguments": {
        "requestId": "req_1234567890_1"
      }
    }
  }'
```

### Health Check
```bash
curl -X POST http://localhost:3001/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "health_check",
      "arguments": {}
    }
  }'
```

## SSE Events

Subscribe to real-time events:

```javascript
const clientId = 'my-client-' + Date.now();
const eventSource = new EventSource(`http://localhost:3001/mcp/events/${clientId}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received event:', data);
};

eventSource.addEventListener('chart_progress', (event) => {
  const data = JSON.parse(event.data);
  console.log('Chart progress:', data);
});

eventSource.addEventListener('connection', (event) => {
  const data = JSON.parse(event.data);
  console.log('Connection status:', data);
});
```

## Client Configuration Examples

### Node.js Client
```javascript
class MCPClient {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.requestId = 1;
  }

  async callTool(name, args) {
    const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: { name, arguments: args }
      })
    });
    
    return await response.json();
  }

  async generateChart(config) {
    return await this.callTool('generate_chart', config);
  }
}

// Usage
const client = new MCPClient();
const result = await client.generateChart({
  symbol: 'NASDAQ:AAPL',
  interval: '1D',
  chartType: 'candlestick'
});
```

### Python Client
```python
import requests
import json

class MCPClient:
    def __init__(self, base_url='http://localhost:3001'):
        self.base_url = base_url
        self.request_id = 1

    def call_tool(self, name, args):
        response = requests.post(f'{self.base_url}/mcp/tools/call', 
            json={
                'jsonrpc': '2.0',
                'id': self.request_id,
                'method': 'tools/call',
                'params': {'name': name, 'arguments': args}
            })
        self.request_id += 1
        return response.json()

    def generate_chart(self, config):
        return self.call_tool('generate_chart', config)

# Usage
client = MCPClient()
result = client.generate_chart({
    'symbol': 'NASDAQ:AAPL',
    'interval': '1D',
    'chartType': 'candlestick'
})
```

## Advantages of HTTP Mode

1. **Language Agnostic** - Any HTTP client can connect
2. **Debugging Friendly** - Use curl, Postman, or browser dev tools
3. **Scalable** - Multiple clients can connect simultaneously
4. **Stateless** - No persistent connections required
5. **SSE Support** - Real-time events when needed
6. **Standard Protocols** - Uses familiar HTTP/JSON/SSE

## Testing

Run the comprehensive test suite:
```bash
node test-mcp-http.js
```

This tests all endpoints, tool calls, and SSE functionality automatically.