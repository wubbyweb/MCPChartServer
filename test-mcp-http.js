#!/usr/bin/env node

/**
 * Test script for the HTTP-based MCP Chart Server
 * This demonstrates how to interact with the MCP server over HTTP
 */

import { spawn } from 'child_process';

class MCPHttpTester {
  constructor() {
    this.mcpProcess = null;
    this.baseUrl = 'http://localhost:3001';
    this.requestId = 1;
  }

  async startMCPServer() {
    console.log('Starting MCP HTTP server...');
    
    this.mcpProcess = spawn('npx', ['tsx', 'mcp-http-server.ts'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        CHART_IMG_API_KEY: process.env.CHART_IMG_API_KEY || 'test_key'
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (this.mcpProcess.killed) {
      throw new Error('MCP HTTP server failed to start');
    }
    
    console.log('MCP HTTP server started successfully');
  }

  async sendRequest(endpoint, payload) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Sending request to ${url}:`, JSON.stringify(payload, null, 2));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Received response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Request failed:', error.message);
      throw error;
    }
  }

  async sendGetRequest(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Sending GET request to ${url}`);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('Received response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Request failed:', error.message);
      throw error;
    }
  }

  async testServerInfo() {
    console.log('\n=== Testing Server Info ===');
    
    const response = await this.sendGetRequest('/');
    
    if (response.name === 'chart-img-mcp-server') {
      console.log('✓ Server info retrieved successfully');
      return true;
    } else {
      console.log('✗ Server info test failed');
      return false;
    }
  }

  async testHealthCheck() {
    console.log('\n=== Testing Health Check ===');
    
    const response = await this.sendGetRequest('/mcp/health');
    
    if (response.status === 'healthy') {
      console.log('✓ Health check successful');
      return true;
    } else {
      console.log('✗ Health check failed');
      return false;
    }
  }

  async testInitialization() {
    console.log('\n=== Testing Initialization ===');
    
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    const response = await this.sendRequest('/mcp/initialize', payload);

    if (response.result?.capabilities) {
      console.log('✓ Initialization successful');
      return true;
    } else {
      console.log('✗ Initialization failed');
      return false;
    }
  }

  async testListTools() {
    console.log('\n=== Testing List Tools ===');
    
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list'
    };

    const response = await this.sendRequest('/mcp/tools/list', payload);

    if (response.result?.tools?.length > 0) {
      console.log(`✓ Found ${response.result.tools.length} tools:`);
      response.result.tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
      return true;
    } else {
      console.log('✗ No tools found');
      return false;
    }
  }

  async testToolCall(toolName, args = {}) {
    console.log(`\n=== Testing Tool Call: ${toolName} ===`);
    
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const response = await this.sendRequest('/mcp/tools/call', payload);

    if (response.result?.content) {
      console.log(`✓ Tool call successful for ${toolName}`);
      console.log('Response content:', response.result.content[0]?.text?.substring(0, 200) + '...');
      return true;
    } else if (response.error) {
      console.log(`✗ Tool call failed for ${toolName}: ${response.error.message}`);
      return false;
    } else {
      console.log(`✗ Unexpected response for ${toolName}`);
      return false;
    }
  }

  async testSSEConnection() {
    console.log('\n=== Testing SSE Connection ===');
    
    try {
      const clientId = `test_${Date.now()}`;
      const url = `${this.baseUrl}/mcp/events/${clientId}`;
      
      console.log(`Connecting to SSE endpoint: ${url}`);
      
      // Note: In a real implementation, you'd use EventSource
      // For this test, we'll just verify the endpoint exists
      const response = await fetch(url);
      
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        console.log('✓ SSE endpoint available');
        return true;
      } else {
        console.log('✗ SSE endpoint not properly configured');
        return false;
      }
    } catch (error) {
      console.log('✗ SSE connection test failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    const results = [];
    
    try {
      await this.startMCPServer();
      
      results.push(await this.testServerInfo());
      results.push(await this.testHealthCheck());
      results.push(await this.testInitialization());
      results.push(await this.testListTools());
      results.push(await this.testToolCall('health_check'));
      results.push(await this.testToolCall('get_available_symbols'));
      results.push(await this.testToolCall('get_recent_requests', { limit: 5 }));
      results.push(await this.testSSEConnection());
      
      // Test chart generation with simple config
      results.push(await this.testToolCall('generate_chart', {
        symbol: 'NASDAQ:AAPL',
        interval: '1D',
        chartType: 'candlestick',
        width: 800,
        height: 600,
        theme: 'light'
      }));
      
      const passed = results.filter(r => r).length;
      const total = results.length;
      
      console.log(`\n=== Test Results ===`);
      console.log(`Passed: ${passed}/${total}`);
      
      if (passed === total) {
        console.log('🎉 All tests passed! MCP HTTP server is working correctly.');
      } else {
        console.log('⚠️ Some tests failed. Check the output above for details.');
      }
      
    } catch (error) {
      console.error('Test failed:', error.message);
    } finally {
      if (this.mcpProcess) {
        this.mcpProcess.kill();
        console.log('MCP HTTP server stopped');
      }
    }
  }

  stop() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
    }
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPHttpTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export default MCPHttpTester;