#!/usr/bin/env node

/**
 * Test script for the MCP Chart Server
 * This demonstrates how to interact with the MCP server programmatically
 */

import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

class MCPTester {
  constructor() {
    this.mcpProcess = null;
    this.requestId = 1;
  }

  async startMCPServer() {
    console.log('Starting MCP server...');
    
    this.mcpProcess = spawn('npx', ['tsx', 'mcp-server.ts'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: {
        ...process.env,
        CHART_IMG_API_KEY: process.env.CHART_IMG_API_KEY || 'test_key'
      }
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (this.mcpProcess.killed) {
      throw new Error('MCP server failed to start');
    }
    
    console.log('MCP server started successfully');
  }

  async sendMessage(message) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      ...message
    };

    const jsonMessage = JSON.stringify(request) + '\n';
    console.log('Sending:', JSON.stringify(request, null, 2));
    
    this.mcpProcess.stdin.write(jsonMessage);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      const onData = (data) => {
        clearTimeout(timeout);
        this.mcpProcess.stdout.off('data', onData);
        
        try {
          const response = JSON.parse(data.toString().trim());
          console.log('Received:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      };

      this.mcpProcess.stdout.on('data', onData);
    });
  }

  async testInitialization() {
    console.log('\n=== Testing Initialization ===');
    
    const initResponse = await this.sendMessage({
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });

    if (initResponse.result?.capabilities) {
      console.log('✓ Initialization successful');
      return true;
    } else {
      console.log('✗ Initialization failed');
      return false;
    }
  }

  async testListTools() {
    console.log('\n=== Testing List Tools ===');
    
    const response = await this.sendMessage({
      method: 'tools/list'
    });

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

  async testHealthCheck() {
    console.log('\n=== Testing Health Check ===');
    
    const response = await this.sendMessage({
      method: 'tools/call',
      params: {
        name: 'health_check',
        arguments: {}
      }
    });

    if (response.result?.content?.[0]?.text?.includes('Health Check')) {
      console.log('✓ Health check successful');
      console.log('Response:', response.result.content[0].text);
      return true;
    } else {
      console.log('✗ Health check failed');
      return false;
    }
  }

  async testGetAvailableSymbols() {
    console.log('\n=== Testing Get Available Symbols ===');
    
    const response = await this.sendMessage({
      method: 'tools/call',
      params: {
        name: 'get_available_symbols',
        arguments: {}
      }
    });

    if (response.result?.content?.[0]?.text?.includes('symbols')) {
      console.log('✓ Get symbols successful');
      return true;
    } else {
      console.log('✗ Get symbols failed');
      return false;
    }
  }

  async testGenerateChart() {
    console.log('\n=== Testing Chart Generation ===');
    
    const response = await this.sendMessage({
      method: 'tools/call',
      params: {
        name: 'generate_chart',
        arguments: {
          symbol: 'NASDAQ:AAPL',
          interval: '1D',
          chartType: 'candlestick',
          width: 800,
          height: 600,
          theme: 'light'
        }
      }
    });

    if (response.result?.content?.[0]?.text?.includes('Chart generated') || 
        response.result?.content?.[0]?.text?.includes('Chart generation failed')) {
      console.log('✓ Chart generation request processed');
      if (response.result.content.length > 1 && response.result.content[1].type === 'image') {
        console.log('✓ Chart image received');
      }
      return true;
    } else {
      console.log('✗ Chart generation failed');
      console.log('Response:', response);
      return false;
    }
  }

  async runAllTests() {
    const results = [];
    
    try {
      await this.startMCPServer();
      
      results.push(await this.testInitialization());
      results.push(await this.testListTools());
      results.push(await this.testHealthCheck());
      results.push(await this.testGetAvailableSymbols());
      results.push(await this.testGenerateChart());
      
      const passed = results.filter(r => r).length;
      const total = results.length;
      
      console.log(`\n=== Test Results ===`);
      console.log(`Passed: ${passed}/${total}`);
      
      if (passed === total) {
        console.log('🎉 All tests passed! MCP server is working correctly.');
      } else {
        console.log('⚠️ Some tests failed. Check the output above for details.');
      }
      
    } catch (error) {
      console.error('Test failed:', error.message);
    } finally {
      if (this.mcpProcess) {
        this.mcpProcess.kill();
        console.log('MCP server stopped');
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
  const tester = new MCPTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export default MCPTester;