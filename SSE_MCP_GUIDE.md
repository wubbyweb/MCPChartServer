# SSE MCP Server Complete Guide

The Chart-IMG MCP server provides two transport modes: traditional STDIO and HTTP with Server-Sent Events (SSE). This guide focuses on the HTTP SSE implementation.

## Why SSE for MCP?

Server-Sent Events provide several advantages for MCP implementations:

1. **Real-time Updates** - Live progress notifications during chart generation
2. **Multi-client Support** - Multiple clients can connect simultaneously
3. **Language Agnostic** - Any HTTP client can connect
4. **Debugging Friendly** - Standard HTTP tools work for testing
5. **Firewall Friendly** - Uses standard HTTP ports and protocols
6. **Automatic Reconnection** - Built-in browser support for connection recovery

## Architecture Overview

```
┌─────────────┐     HTTP POST      ┌─────────────────┐
│ MCP Client  │────────────────────│                 │
│             │                    │  HTTP MCP       │
│             │     SSE Stream     │  Server         │
│             │◄───────────────────│  (Port 3001)    │
└─────────────┘                    │                 │
                                   │                 │
┌─────────────┐     HTTP POST      │                 │
│ MCP Client  │────────────────────│                 │
│   (Python)  │                    │                 │
│             │     SSE Stream     │                 │
│             │◄───────────────────│                 │
└─────────────┘                    └─────────────────┘
                                           │
                                           │ Chart-IMG API
                                           ▼
                                   ┌─────────────────┐
                                   │  Chart-IMG      │
                                   │  Service        │
                                   │  (External)     │
                                   └─────────────────┘
```

## Server Startup

Start the HTTP MCP server with SSE support:

```bash
# Direct execution
npx tsx mcp-http-server.ts

# Using startup script
./start-mcp-http.sh

# With custom port (modify source)
PORT=3002 npx tsx mcp-http-server.ts
```

The server provides comprehensive logging:
```
Chart-IMG MCP HTTP Server running on http://localhost:3001
MCP Endpoints:
  Initialize: POST http://localhost:3001/mcp/initialize
  List Tools: POST http://localhost:3001/mcp/tools/list
  Call Tool:  POST http://localhost:3001/mcp/tools/call
  SSE Events: GET  http://localhost:3001/mcp/events/:clientId
  Health:     GET  http://localhost:3001/mcp/health
```

## SSE Event Flow

### Connection Establishment
1. Client generates unique `clientId`
2. Opens SSE connection to `/mcp/events/:clientId`
3. Server establishes stream and sends connection event
4. Heartbeat messages maintain connection (every 30s)

### Chart Generation Flow
1. Client calls `generate_chart` tool via POST
2. Server broadcasts `chart_progress` event with type "started"
3. Chart-IMG API processes request
4. Server broadcasts progress events during processing
5. Final event indicates completion or failure

### Event Types

**Connection Events:**
```json
{
  "type": "connected",
  "clientId": "mcp_1749698104642_abc123",
  "timestamp": "2025-06-12T03:16:30.000Z"
}
```

**Chart Progress Events:**
```json
{
  "type": "chart_progress",
  "requestId": "req_1749698104642_1",
  "message": "Chart generation started for NASDAQ:AAPL",
  "timestamp": "2025-06-12T03:16:30.000Z",
  "data": {
    "symbol": "NASDAQ:AAPL",
    "status": "started"
  }
}
```

**Completion Events:**
```json
{
  "type": "chart_progress",
  "requestId": "req_1749698104642_1", 
  "processingTime": 2847,
  "timestamp": "2025-06-12T03:16:33.000Z",
  "data": {
    "type": "completed"
  }
}
```

## Client Implementation Patterns

### Browser JavaScript
```javascript
const eventSource = new EventSource('http://localhost:3001/mcp/events/my-client');
eventSource.addEventListener('chart_progress', handleProgress);
```

### Node.js
```javascript
import EventSource from 'eventsource';
const es = new EventSource('http://localhost:3001/mcp/events/my-client');
```

### Python
```python
import sseclient
response = requests.get(sse_url, stream=True)
client = sseclient.SSEClient(response)
for event in client.events():
    handle_event(event)
```

### cURL Testing
```bash
curl -N http://localhost:3001/mcp/events/test-client
```

## Tool Integration

All MCP tools work identically whether using STDIO or HTTP transport:

### Available Tools
- `generate_chart` - Create TradingView charts with real-time progress
- `get_chart_status` - Check status of chart generation requests
- `get_available_symbols` - List supported trading symbols
- `get_recent_requests` - View recent chart generation history
- `health_check` - Verify server configuration and status

### Tool Call Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_chart",
    "arguments": {
      "symbol": "NASDAQ:AAPL",
      "interval": "1D", 
      "chartType": "candlestick"
    }
  }
}
```

## Error Handling

### Connection Errors
- Automatic reconnection in browser environments
- Manual reconnection logic required for other clients
- Connection status events indicate when to reconnect

### Tool Execution Errors
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Tool execution error: Chart generation failed",
    "data": "Chart-IMG API error: Invalid symbol format"
  }
}
```

### SSE Stream Errors
- Monitor `onerror` events in EventSource
- Implement exponential backoff for reconnection
- Log connection state changes for debugging

## Performance Considerations

### Concurrent Connections
- No artificial limit on client connections
- Each SSE stream consumes minimal server resources
- Memory usage scales linearly with connected clients

### Event Broadcasting
- Chart progress events broadcast to all connected clients
- Consider client-specific filtering for large deployments
- Events include `requestId` for client-side filtering

### Chart Generation
- Chart-IMG API has rate limits based on subscription tier
- Processing time varies from 1-10 seconds typically
- Failed generations trigger immediate error events

## Monitoring and Debugging

### Health Endpoint
```bash
curl http://localhost:3001/mcp/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-12T03:16:30.000Z",
  "clientCount": 3,
  "chartServiceConfigured": true
}
```

### Server Logs
- SSE connection/disconnection events
- Tool execution timing and results
- Chart-IMG API interaction logs
- Error details with stack traces

### Client Debugging
- Browser DevTools Network tab shows SSE stream
- Use `curl -N` for command-line SSE testing
- HTTP debugging tools work with all endpoints

## Production Deployment

### Reverse Proxy Configuration
```nginx
location /mcp/ {
    proxy_pass http://localhost:3001/mcp/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
}
```

### Environment Variables
```bash
CHART_IMG_API_KEY=your_api_key_here
PORT=3001
NODE_ENV=production
```

### Process Management
```bash
# Using PM2
pm2 start mcp-http-server.ts --name "mcp-chart-server"

# Using systemd
systemctl start mcp-chart-server.service
```

### Security Considerations
- CORS headers configured for cross-origin access
- No authentication required for tool access
- Chart-IMG API key secured server-side
- Consider rate limiting for public deployments

## Comparison with STDIO Mode

| Aspect | STDIO Mode | HTTP SSE Mode |
|--------|------------|---------------|
| **Setup Complexity** | Simple | Moderate |
| **Client Languages** | MCP-specific | Any HTTP client |
| **Real-time Updates** | None | Full SSE support |
| **Multiple Clients** | Single process | Unlimited |
| **Debugging** | Process logs | HTTP tools + SSE |
| **Network Requirements** | Local only | Network accessible |
| **Protocol Overhead** | Minimal | HTTP headers |
| **Connection Management** | Automatic | Manual reconnection |

The HTTP SSE mode is recommended for production deployments, multi-client scenarios, and development environments requiring real-time feedback.