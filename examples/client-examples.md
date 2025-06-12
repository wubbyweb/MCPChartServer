# MCP Client Examples

Examples for connecting to the HTTP MCP server with SSE support across different programming languages.

## JavaScript/Node.js Client

```javascript
import fetch from 'node-fetch';
import EventSource from 'eventsource';

class ChartMCPClient {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.eventSource = null;
    this.requestId = 1;
  }

  // Connect to SSE stream
  connectSSE() {
    const sseUrl = `${this.baseUrl}/mcp/events/${this.clientId}`;
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onopen = () => {
      console.log('SSE connection established');
    };

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE Event:', data);
    };

    this.eventSource.addEventListener('chart_progress', (event) => {
      const data = JSON.parse(event.data);
      this.handleChartProgress(data);
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
    };
  }

  handleChartProgress(data) {
    console.log(`Chart ${data.requestId}: ${data.type} - ${data.message || ''}`);
    
    if (data.type === 'completed') {
      console.log(`Processing time: ${data.processingTime}ms`);
    } else if (data.type === 'failed') {
      console.error(`Chart generation failed: ${data.error}`);
    }
  }

  // Call MCP tool
  async callTool(name, args = {}) {
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

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Tool call failed: ${result.error.message}`);
    }
    
    return result.result;
  }

  // Generate chart with real-time updates
  async generateChart(config) {
    console.log('Generating chart...', config);
    const result = await this.callTool('generate_chart', config);
    
    // Extract request ID for tracking
    const requestIdMatch = result.content[0].text.match(/Request ID: (req_\d+_\d+)/);
    if (requestIdMatch) {
      console.log(`Tracking chart generation: ${requestIdMatch[1]}`);
    }
    
    return result;
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage example
async function main() {
  const client = new ChartMCPClient();
  
  // Connect to SSE for real-time updates
  client.connectSSE();
  
  try {
    // Generate a chart
    const result = await client.generateChart({
      symbol: 'NASDAQ:AAPL',
      interval: '1D',
      chartType: 'candlestick',
      width: 800,
      height: 600,
      theme: 'light'
    });
    
    console.log('Chart generation initiated');
    
    // Keep connection open to receive updates
    setTimeout(() => {
      client.disconnect();
      process.exit(0);
    }, 30000); // Close after 30 seconds
    
  } catch (error) {
    console.error('Error:', error.message);
    client.disconnect();
  }
}

main();
```

## Python Client

```python
import requests
import json
import time
import threading
import sseclient
from datetime import datetime

class ChartMCPClient:
    def __init__(self, base_url='http://localhost:3001'):
        self.base_url = base_url
        self.client_id = f"client_{int(time.time())}_{id(self)}"
        self.request_id = 1
        self.sse_thread = None
        self.stop_sse = False

    def connect_sse(self):
        """Connect to SSE stream in a separate thread"""
        def sse_listener():
            sse_url = f"{self.base_url}/mcp/events/{self.client_id}"
            headers = {'Accept': 'text/event-stream'}
            
            try:
                response = requests.get(sse_url, headers=headers, stream=True)
                client = sseclient.SSEClient(response)
                
                for event in client.events():
                    if self.stop_sse:
                        break
                        
                    if event.event == 'chart_progress':
                        data = json.loads(event.data)
                        self.handle_chart_progress(data)
                    elif event.data:
                        data = json.loads(event.data)
                        print(f"SSE Event: {data}")
                        
            except Exception as e:
                print(f"SSE Error: {e}")

        self.sse_thread = threading.Thread(target=sse_listener)
        self.sse_thread.daemon = True
        self.sse_thread.start()
        print("SSE connection started")

    def handle_chart_progress(self, data):
        """Handle chart progress events"""
        print(f"Chart {data.get('requestId')}: {data.get('type')} - {data.get('message', '')}")
        
        if data.get('type') == 'completed':
            print(f"Processing time: {data.get('processingTime')}ms")
        elif data.get('type') == 'failed':
            print(f"Chart generation failed: {data.get('error')}")

    def call_tool(self, name, args=None):
        """Call MCP tool"""
        if args is None:
            args = {}
            
        payload = {
            'jsonrpc': '2.0',
            'id': self.request_id,
            'method': 'tools/call',
            'params': {
                'name': name,
                'arguments': args
            }
        }
        self.request_id += 1
        
        response = requests.post(
            f'{self.base_url}/mcp/tools/call',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        result = response.json()
        
        if 'error' in result:
            raise Exception(f"Tool call failed: {result['error']['message']}")
            
        return result['result']

    def generate_chart(self, config):
        """Generate chart with real-time updates"""
        print(f"Generating chart: {config}")
        result = self.call_tool('generate_chart', config)
        
        # Extract request ID for tracking
        text_content = result['content'][0]['text']
        import re
        match = re.search(r'Request ID: (req_\d+_\d+)', text_content)
        if match:
            print(f"Tracking chart generation: {match.group(1)}")
            
        return result

    def disconnect(self):
        """Disconnect SSE stream"""
        self.stop_sse = True
        if self.sse_thread:
            self.sse_thread.join(timeout=1)

# Usage example
def main():
    client = ChartMCPClient()
    
    try:
        # Connect to SSE for real-time updates
        client.connect_sse()
        
        # Generate a chart
        result = client.generate_chart({
            'symbol': 'NASDAQ:TSLA',
            'interval': '1D',
            'chartType': 'line',
            'width': 1000,
            'height': 600,
            'theme': 'dark'
        })
        
        print("Chart generation initiated")
        
        # Wait for updates
        time.sleep(30)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.disconnect()

if __name__ == "__main__":
    main()
```

## cURL Examples

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"

# Check server health
echo "=== Health Check ==="
curl -s "$BASE_URL/mcp/health" | jq

# List available tools
echo -e "\n=== List Tools ==="
curl -s -X POST "$BASE_URL/mcp/tools/list" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | jq '.result.tools[] | {name, description}'

# Generate chart
echo -e "\n=== Generate Chart ==="
curl -s -X POST "$BASE_URL/mcp/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
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
  }' | jq

# Test SSE connection
echo -e "\n=== SSE Connection Test ==="
timeout 10s curl -s "$BASE_URL/mcp/events/test-client" &
```

## Dependencies

**JavaScript/Node.js:**
```bash
npm install node-fetch eventsource
```

**Python:**
```bash
pip install requests sseclient-py
```