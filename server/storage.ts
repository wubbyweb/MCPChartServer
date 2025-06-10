import { users, chartRequests, sseEvents, type User, type InsertUser, type ChartRequest, type InsertChartRequest, type SseEvent, type InsertSseEvent } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createChartRequest(request: InsertChartRequest): Promise<ChartRequest>;
  getChartRequest(requestId: string): Promise<ChartRequest | undefined>;
  updateChartRequest(requestId: string, updates: Partial<ChartRequest>): Promise<ChartRequest | undefined>;
  getRecentChartRequests(limit: number): Promise<ChartRequest[]>;
  
  createSseEvent(event: InsertSseEvent): Promise<SseEvent>;
  getSseEvents(requestId: string): Promise<SseEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chartRequests: Map<string, ChartRequest>;
  private sseEvents: Map<string, SseEvent[]>;
  private currentUserId: number;
  private currentChartId: number;
  private currentEventId: number;

  constructor() {
    this.users = new Map();
    this.chartRequests = new Map();
    this.sseEvents = new Map();
    this.currentUserId = 1;
    this.currentChartId = 1;
    this.currentEventId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createChartRequest(insertRequest: InsertChartRequest): Promise<ChartRequest> {
    const id = this.currentChartId++;
    const requestId = `req_${Date.now()}_${id}`;
    const now = new Date();
    
    const request: ChartRequest = {
      id,
      requestId,
      ...insertRequest,
      status: 'pending',
      chartUrl: null,
      base64Data: null,
      errorMessage: null,
      processingTime: null,
      createdAt: now,
      completedAt: null,
    };
    
    this.chartRequests.set(requestId, request);
    return request;
  }

  async getChartRequest(requestId: string): Promise<ChartRequest | undefined> {
    return this.chartRequests.get(requestId);
  }

  async updateChartRequest(requestId: string, updates: Partial<ChartRequest>): Promise<ChartRequest | undefined> {
    const existing = this.chartRequests.get(requestId);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.chartRequests.set(requestId, updated);
    return updated;
  }

  async getRecentChartRequests(limit: number): Promise<ChartRequest[]> {
    return Array.from(this.chartRequests.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createSseEvent(insertEvent: InsertSseEvent): Promise<SseEvent> {
    const id = this.currentEventId++;
    const timestamp = new Date();
    
    const event: SseEvent = {
      id,
      ...insertEvent,
      timestamp,
    };

    if (!this.sseEvents.has(insertEvent.requestId)) {
      this.sseEvents.set(insertEvent.requestId, []);
    }
    
    this.sseEvents.get(insertEvent.requestId)!.push(event);
    return event;
  }

  async getSseEvents(requestId: string): Promise<SseEvent[]> {
    return this.sseEvents.get(requestId) || [];
  }
}

export const storage = new MemStorage();
