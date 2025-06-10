import { v4 as uuidv4 } from 'uuid';

export interface SSEEvent {
  type: string;
  message: string;
  requestId: string;
  timestamp: string;
  data?: any;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private clientId: string;
  private url: string;
  private listeners: Map<string, ((event: SSEEvent) => void)[]> = new Map();
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private statusListeners: ((status: string) => void)[] = [];

  constructor(baseUrl: string = '') {
    this.clientId = uuidv4();
    this.url = `${baseUrl}/api/v2/events?clientId=${this.clientId}`;
  }

  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.setConnectionStatus('connecting');
    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      this.setConnectionStatus('connected');
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.setConnectionStatus('disconnected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        this.notifyListeners(data.type, data);
        this.notifyListeners('*', data); // Wildcard listeners
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    // Listen for specific event types
    ['request', 'progress', 'success', 'error', 'connection'].forEach(eventType => {
      this.eventSource!.addEventListener(eventType, (event: any) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          this.notifyListeners(eventType, data);
          this.notifyListeners('*', data);
        } catch (error) {
          console.error(`Error parsing ${eventType} event:`, error);
        }
      });
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionStatus('disconnected');
  }

  on(eventType: string, callback: (event: SSEEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  off(eventType: string, callback: (event: SSEEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  onStatusChange(callback: (status: string) => void): void {
    this.statusListeners.push(callback);
  }

  private setConnectionStatus(status: 'connecting' | 'connected' | 'disconnected'): void {
    this.connectionStatus = status;
    this.statusListeners.forEach(callback => callback(status));
  }

  private notifyListeners(eventType: string, event: SSEEvent): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  getClientId(): string {
    return this.clientId;
  }
}

// Create a singleton instance
export const sseClient = new SSEClient();
