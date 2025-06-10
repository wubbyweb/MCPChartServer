import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const chartRequests = pgTable("chart_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(),
  symbol: text("symbol").notNull(),
  interval: text("interval").notNull(),
  chartType: text("chart_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  indicators: jsonb("indicators").$type<any[]>(),
  drawings: jsonb("drawings").$type<any[]>(),
  theme: text("theme").notNull().default('light'),
  showVolume: boolean("show_volume").notNull().default(true),
  showGrid: boolean("show_grid").notNull().default(true),
  timezone: text("timezone").notNull().default('America/New_York'),
  status: text("status").notNull().default('pending'), // pending, processing, completed, failed
  chartUrl: text("chart_url"),
  base64Data: text("base64_data"),
  errorMessage: text("error_message"),
  processingTime: integer("processing_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const sseEvents = pgTable("sse_events", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull(),
  eventType: text("event_type").notNull(), // REQUEST, PROGRESS, SUCCESS, ERROR
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChartRequestSchema = createInsertSchema(chartRequests).omit({
  id: true,
  requestId: true,
  status: true,
  chartUrl: true,
  base64Data: true,
  errorMessage: true,
  processingTime: true,
  createdAt: true,
  completedAt: true,
});

export const insertSseEventSchema = createInsertSchema(sseEvents).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ChartRequest = typeof chartRequests.$inferSelect;
export type InsertChartRequest = z.infer<typeof insertChartRequestSchema>;
export type SseEvent = typeof sseEvents.$inferSelect;
export type InsertSseEvent = z.infer<typeof insertSseEventSchema>;

// Chart configuration types
export const chartConfigSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  interval: z.enum(["1m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1D", "1W", "1M"]),
  chartType: z.enum(["candlestick", "line", "area", "bar", "heikin_ashi", "hollow_candle", "baseline", "hi_lo", "column"]),
  width: z.number().min(400).max(2000).default(800),
  height: z.number().min(300).max(1500).default(600),
  indicators: z.array(z.object({
    type: z.string(),
    period: z.number().optional(),
    color: z.string().optional(),
    overbought: z.number().optional(),
    oversold: z.number().optional(),
  })).optional().default([]),
  drawings: z.array(z.object({
    type: z.string(),
    points: z.array(z.object({
      x: z.string(),
      y: z.number(),
    })),
    color: z.string().optional(),
    width: z.number().optional(),
  })).optional().default([]),
  theme: z.enum(["light", "dark"]).default("light"),
  showVolume: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  timezone: z.string().default("America/New_York"),
});

export type ChartConfig = z.infer<typeof chartConfigSchema>;
