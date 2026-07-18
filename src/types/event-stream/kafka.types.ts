/**
 * Kafka Event Streaming Types
 */

export interface KafkaEventMessage {
  id: string;
  eventType: string;
  channel: string;
  recipientId?: string;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  sourceId?: string;
  sourceType?: string;
  room?: string;
  metadata?: any;
  timestamp: string;
  expiresAt?: string;
  value?: string | any; // Raw Kafka message value
  partition?: number; // Kafka partition number
  offset?: string; // Kafka message offset
  headers?: Record<string, string>; // Kafka message headers
}

export interface KafkaProducerConfig {
  brokers: string[];
  clientId: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  retries: number;
  acks: number;
}

export interface KafkaConsumerConfig {
  groupId: string;
  brokers: string[];
  clientId: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  topics: string[];
  fromBeginning: boolean;
}

export interface KafkaTopicConfig {
  topic: string;
  partitions: number;
  replicationFactor: number;
}

export interface EventBroadcastResult {
  deliveredCount: number;
  recipientCount: number;
  failedCount: number;
  errors: string[];
  processingTimeMs: number;
}

export interface KafkaMessageMetadata {
  partition: number;
  offset: string;
  timestamp: string;
  headers?: Record<string, string>;
}

export interface EventProcessingResult {
  success: boolean;
  eventId: string;
  processingTimeMs: number;
  error?: string;
}
