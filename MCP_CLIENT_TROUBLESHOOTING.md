# MCP Client Troubleshooting Guide

If your MCP client shows "Waiting for server to respond to `initialize` request...", here are common causes and solutions.

## Common Issues and Solutions

### 1. Server URL Configuration

**Problem:** Client connecting to wrong URL or port  
**Solution:** Ensure client points to the correct HTTP MCP server endpoint

```bash
# Correct server URL
http://localhost:3001

# Test server availability
curl http://localhost:3001/mcp/health
```

### 2. Request Format Issues

**Problem:** Client sending incorrect initialization payload  
**Solution:** Verify the JSON-RPC 2.0 format is correct

**Correct Initialize Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "your-client-name",
      "version": "1.0.0"
    }
  }
}
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "sse": {
        "enabled": true,
        "endpoint": "/mcp/events/CLIENT_ID"
      }
    },
    "serverInfo": {
      "name": "chart-img-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

### 3. HTTP Headers Missing

**Problem:** Missing Content-Type header  
**Solution:** Include proper HTTP headers

```bash
curl -X POST http://localhost:3001/mcp/initialize \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'
```

### 4. Client Timeout Issues

**Problem:** Client timeout too short for server response  
**Solution:** Increase client timeout or check server responsiveness

```bash
# Test server response time
time curl -X POST http://localhost:3001/mcp/initialize \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### 5. Network Connectivity

**Problem:** Network or firewall blocking connection  
**Solution:** Verify network connectivity and port access

```bash
# Test basic connectivity
nc -zv localhost 3001

# Check if server is listening
netstat -tlnp | grep :3001

# Test HTTP connectivity
curl -v http://localhost:3001/
```

### 6. Server Not Running

**Problem:** HTTP MCP server not started  
**Solution:** Start the server properly

```bash
# Start HTTP MCP server
npx tsx mcp-http-server.ts

# Verify server is running
curl http://localhost:3001/mcp/health
```

## Debugging Steps

### Step 1: Verify Server Status
```bash
# Check server health
curl http://localhost:3001/mcp/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-06-12T...",
  "clientCount": 0,
  "chartServiceConfigured": true
}
```

### Step 2: Test Initialize Endpoint
```bash
curl -X POST http://localhost:3001/mcp/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "debug-client",
        "version": "1.0.0"
      }
    }
  }'
```

### Step 3: Test SSE Connection
```bash
# Open SSE stream (keep running in background)
curl -N http://localhost:3001/mcp/events/debug-client &

# Should show connection events
```

### Step 4: Test Tool Listing
```bash
curl -X POST http://localhost:3001/mcp/tools/list \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

## Client Configuration Examples

### JavaScript/Node.js
```javascript
const mcpClient = {
  baseUrl: 'http://localhost:3001',
  timeout: 10000, // 10 second timeout
  
  async initialize() {
    const response = await fetch(`${this.baseUrl}/mcp/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'js-client',
            version: '1.0.0'
          }
        }
      }),
      signal: AbortSignal.timeout(this.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
};
```

### Python
```python
import requests
import json

class MCPClient:
    def __init__(self, base_url='http://localhost:3001', timeout=10):
        self.base_url = base_url
        self.timeout = timeout
    
    def initialize(self):
        payload = {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'initialize',
            'params': {
                'protocolVersion': '2024-11-05',
                'capabilities': {},
                'clientInfo': {
                    'name': 'python-client',
                    'version': '1.0.0'
                }
            }
        }
        
        response = requests.post(
            f'{self.base_url}/mcp/initialize',
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=self.timeout
        )
        
        response.raise_for_status()
        return response.json()
```

## Common Error Messages

### "Connection refused"
- Server not running on specified port
- Wrong port number in client configuration
- Firewall blocking connection

### "Timeout"
- Server taking too long to respond
- Network latency issues
- Client timeout set too low

### "Invalid JSON"
- Malformed request payload
- Missing required fields
- Incorrect JSON-RPC format

### "404 Not Found"
- Wrong endpoint URL
- Server not properly configured
- Missing route handlers

## Protocol Verification

The HTTP MCP server implements the Model Context Protocol over HTTP with these endpoints:

1. **POST /mcp/initialize** - Client initialization handshake
2. **POST /mcp/tools/list** - List available tools
3. **POST /mcp/tools/call** - Execute tools
4. **GET /mcp/events/:clientId** - SSE event stream
5. **GET /mcp/health** - Server health check

Each endpoint expects proper JSON-RPC 2.0 format and returns structured responses. The SSE endpoint provides real-time updates during chart generation.

## Still Having Issues?

1. Check server logs for error messages
2. Verify Chart-IMG API key is configured
3. Test with curl commands above
4. Review client implementation against examples
5. Ensure client follows JSON-RPC 2.0 specification