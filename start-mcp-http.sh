#!/bin/bash

# Start the HTTP-based MCP Chart Server
# This script starts the server on port 3001

echo "Starting MCP Chart Server (HTTP Mode)..."
echo "Server will be available at: http://localhost:3001"
echo ""
echo "MCP Endpoints:"
echo "  Initialize: POST http://localhost:3001/mcp/initialize"
echo "  List Tools: POST http://localhost:3001/mcp/tools/list" 
echo "  Call Tool:  POST http://localhost:3001/mcp/tools/call"
echo "  SSE Events: GET  http://localhost:3001/mcp/events/:clientId"
echo "  Health:     GET  http://localhost:3001/mcp/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Check if API key is set
if [ -z "$CHART_IMG_API_KEY" ]; then
    echo "Warning: CHART_IMG_API_KEY environment variable not set"
    echo "Chart generation will fail without a valid API key"
    echo ""
fi

# Start the server
npx tsx mcp-http-server.ts