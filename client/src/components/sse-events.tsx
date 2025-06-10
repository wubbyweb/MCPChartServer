import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { sseClient, SSEEvent } from "@/lib/sse-client";

interface SSEEventsProps {
  requestId: string | null;
}

export default function SSEEvents({ requestId }: SSEEventsProps) {
  const [events, setEvents] = useState<SSEEvent[]>([]);

  useEffect(() => {
    const handleEvent = (event: SSEEvent) => {
      if (!requestId || event.requestId === requestId || event.requestId === 'system') {
        setEvents(prev => [...prev, event].slice(-50)); // Keep last 50 events
      }
    };

    // Listen to all events
    sseClient.on('*', handleEvent);

    return () => {
      sseClient.off('*', handleEvent);
    };
  }, [requestId]);

  const getEventBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'request':
        return 'bg-blue-100 text-blue-700';
      case 'progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'success':
        return 'bg-[--success-green] text-white';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'connection':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="p-6 h-full">
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-[--text-primary] mb-4">Real-time Events</h3>
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[--secondary-slate]">No events yet. Generate a chart to see real-time updates.</p>
              </div>
            ) : (
              events.map((event, index) => (
                <div key={index} className="flex items-start space-x-3 text-xs py-1">
                  <span className="text-[--secondary-slate] font-mono min-w-[60px]">
                    {formatTime(event.timestamp)}
                  </span>
                  <Badge className={`${getEventBadgeColor(event.type)} font-mono text-xs px-2 py-1`}>
                    {event.type.toUpperCase()}
                  </Badge>
                  <span className="text-[--text-primary] flex-1">
                    {event.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
