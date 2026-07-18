/**
 * WebSocket Event Streaming Types
 */

export interface WebSocketConnection {
  id: string;
  userId: string;
  socketId: string;
  channels: string[];
  eventTypes?: string[];
  room?: string;
  metadata?: any;
  connectedAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface WebSocketSubscription {
  connectionId: string;
  userId: string;
  channels: string[];
  eventTypes?: string[];
  room?: string;
  filters?: Record<string, any>;
  createdAt: Date;
}

export interface WebSocketEvent {
  id: string;
  eventType: string;
  channel: string;
  payload: any;
  recipientId?: string;
  room?: string;
  timestamp: string;
  metadata?: any;
}

export interface WebSocketDeliveryResult {
  success: boolean;
  connectionId: string;
  eventId: string;
  deliveredAt: Date;
  error?: string;
}

export interface WebSocketRoomInfo {
  room: string;
  connectionCount: number;
  connections: WebSocketConnection[];
  createdAt: Date;
  lastActivity: Date;
}

export interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  totalRooms: number;
  messagesPerMinute: number;
  avgMessageSize: number;
  topChannels: { channel: string; count: number }[];
  connectionsByChannel: Record<string, number>;
}

export interface WebSocketChannelStats {
  channel: string;
  subscriberCount: number;
  messagesSent: number;
  messagesDelivered: number;
  failedDeliveries: number;
  avgDeliveryTime: number;
}
