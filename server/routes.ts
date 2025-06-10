import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { handleSSEConnection, sseManager } from "./sse";
import { chartService } from "./chart-service";
import { chartConfigSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // SSE endpoint
  app.get("/api/v2/events", handleSSEConnection);

  // Chart generation endpoint
  app.post("/api/v2/chart/generate", async (req, res) => {
    try {
      // Validate request body
      const config = chartConfigSchema.parse(req.body);
      const clientId = req.headers['x-client-id'] as string;

      // Create chart request record
      const chartRequest = await storage.createChartRequest(config);

      // Send initial event
      if (clientId) {
        sseManager.sendEvent(clientId, 'request', `Chart generation started for ${config.symbol}`, chartRequest.requestId);
      }

      // Update status to processing
      await storage.updateChartRequest(chartRequest.requestId, {
        status: 'processing'
      });

      // Generate chart asynchronously
      chartService.generateChart(config, chartRequest.requestId, clientId)
        .then(async (result) => {
          if (result.success) {
            await storage.updateChartRequest(chartRequest.requestId, {
              status: 'completed',
              chartUrl: result.url,
              base64Data: result.base64,
              processingTime: result.processingTime,
              completedAt: new Date(),
            });
          } else {
            await storage.updateChartRequest(chartRequest.requestId, {
              status: 'failed',
              errorMessage: result.error,
              processingTime: result.processingTime,
              completedAt: new Date(),
            });
          }
        })
        .catch(async (error) => {
          await storage.updateChartRequest(chartRequest.requestId, {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          });
        });

      // Return immediate response with request ID
      res.json({
        success: true,
        requestId: chartRequest.requestId,
        status: 'processing',
        message: 'Chart generation started'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  });

  // Chart status endpoint
  app.get("/api/v2/chart/status/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const chartRequest = await storage.getChartRequest(requestId);

      if (!chartRequest) {
        return res.status(404).json({
          success: false,
          error: 'Chart request not found'
        });
      }

      const response: any = {
        success: true,
        requestId: chartRequest.requestId,
        status: chartRequest.status,
        symbol: chartRequest.symbol,
        interval: chartRequest.interval,
        chartType: chartRequest.chartType,
        createdAt: chartRequest.createdAt,
      };

      if (chartRequest.status === 'completed') {
        response.chart = {
          url: chartRequest.chartUrl,
          base64: chartRequest.base64Data,
          metadata: {
            symbol: chartRequest.symbol,
            interval: chartRequest.interval,
            chartType: chartRequest.chartType,
            width: chartRequest.width,
            height: chartRequest.height,
            generatedAt: chartRequest.completedAt,
            indicators: chartRequest.indicators,
            drawings: chartRequest.drawings
          }
        };
        response.processingTime = chartRequest.processingTime;
      }

      if (chartRequest.status === 'failed') {
        response.error = chartRequest.errorMessage;
      }

      res.json(response);

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // Get available symbols
  app.get("/api/v2/symbols", async (req, res) => {
    try {
      const symbols = await chartService.getAvailableSymbols();
      res.json({
        success: true,
        symbols
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch symbols'
      });
    }
  });

  // Get recent chart requests
  app.get("/api/v2/chart/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const requests = await storage.getRecentChartRequests(limit);
      
      res.json({
        success: true,
        requests: requests.map(req => ({
          requestId: req.requestId,
          symbol: req.symbol,
          interval: req.interval,
          chartType: req.chartType,
          status: req.status,
          createdAt: req.createdAt,
          completedAt: req.completedAt,
          processingTime: req.processingTime,
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // Get SSE events for a request
  app.get("/api/v2/events/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const events = await storage.getSseEvents(requestId);
      
      res.json({
        success: true,
        events: events.map(event => ({
          id: event.id,
          type: event.eventType,
          message: event.message,
          timestamp: event.timestamp,
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      chartServiceConfigured: chartService.isConfigured(),
      sseClients: sseManager.getClientCount(),
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
