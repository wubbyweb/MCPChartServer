import { Request, Response } from "express";
import { storage } from "./storage";

export interface SSEClient {
  id: string;
  response: Response;
  lastEventId?: string;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  addClient(clientId: string, res: Response, lastEventId?: string): void {
    const client: SSEClient = {
      id: clientId,
      response: res,
      lastEventId,
    };

    this.clients.set(clientId, client);

    // Send initial connection event
    this.sendEvent(clientId, 'connection', 'SSE connection established', 'system');

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(clientId);
    });

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (this.clients.has(clientId)) {
        res.write(': heartbeat\n\n');
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.response.end();
      this.clients.delete(clientId);
    }
  }

  sendEvent(clientId: string, eventType: string, message: string, requestId: string, data?: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const eventData = {
      type: eventType,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      data,
    };

    try {
      client.response.write(`event: ${eventType}\n`);
      client.response.write(`data: ${JSON.stringify(eventData)}\n\n`);
      
      // Store event in storage for history
      if (requestId !== 'system') {
        storage.createSseEvent({
          requestId,
          eventType: eventType.toUpperCase(),
          message,
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Error sending SSE event:', error);
      this.removeClient(clientId);
    }
  }

  broadcast(eventType: string, message: string, requestId: string, data?: any): void {
    this.clients.forEach((client, clientId) => {
      this.sendEvent(clientId, eventType, message, requestId, data);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();

export function handleSSEConnection(req: Request, res: Response): void {
  const clientId = req.query.clientId as string || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const lastEventId = req.headers['last-event-id'] as string;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Send initial connection event
  res.write(`event: connection\n`);
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString()
  })}\n\n`);

  sseManager.addClient(clientId, res, lastEventId);
}
