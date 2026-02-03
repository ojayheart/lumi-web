import { pgTable, serial, text, timestamp, json, varchar, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Define the database schema for storing conversation transcripts and leads
 */

// Transcript table for storing complete conversations
export const transcripts = pgTable('transcripts', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 100 }).notNull(), // Internal widget session ID
  userId: varchar('user_id', { length: 100 }), // If user identification is available
  source: varchar('source', { length: 50 }).notNull(), // 'voiceflow', 'elevenlabs', or 'widget'
  channel: varchar('channel', { length: 20 }).default('text'), // 'voice' or 'text'
  elevenlabsConversationId: varchar('elevenlabs_conversation_id', { length: 100 }), // ElevenLabs conversation ID for cross-reference
  voiceflowSessionId: varchar('voiceflow_session_id', { length: 100 }), // Voiceflow session ID for cross-reference
  ipAddress: varchar('ip_address', { length: 45 }), // Store IP address (IPv4 or IPv6)
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  metadata: json('metadata').$type<{
    userAgent?: string;
    deviceInfo?: string;
    widgetVersion?: string;
    referrer?: string;
    embedSite?: string;
  }>(),
  summary: text('summary'),
});

// Messages table for storing individual messages within a conversation
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  transcriptId: serial('transcript_id').references(() => transcripts.id).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  messageType: varchar('message_type', { length: 20 }), // 'text', 'voice', etc.
  metadata: json('metadata').$type<{
    voiceId?: string;
    normalized?: boolean;
    originalContent?: string;
  }>(),
});

// Insert schemas for validation
export const insertTranscriptSchema = createInsertSchema(transcripts).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });

// Leads table for storing captured lead information
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  transcriptId: serial('transcript_id').references(() => transcripts.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  contacted: boolean('contacted').default(false),
  leadSource: varchar('lead_source', { length: 50 }).default('chat_widget'),
  metadata: json('metadata').$type<{
    prompt?: string;
    userAgent?: string;
    deviceInfo?: string;
    referrer?: string;
  }>(),
});

// Insert schemas for validation
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true });

// Knowledge gaps table for tracking questions Lumi couldn't answer correctly
export const knowledgeGaps = pgTable('knowledge_gaps', {
  id: serial('id').primaryKey(),
  transcriptId: serial('transcript_id').references(() => transcripts.id).notNull(),
  question: text('question').notNull(),
  lumiResponse: text('lumi_response'),
  severity: varchar('severity', { length: 20 }).notNull(), // 'unanswered', 'incorrect', 'incomplete'
  status: varchar('status', { length: 20 }).default('new').notNull(), // 'new', 'reviewed', 'resolved', 'false_positive'
  aiSuggestedAnswer: text('ai_suggested_answer'),
  humanCorrection: text('human_correction'),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 100 }),
});

// Knowledge documents table for curated correct answers
export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  topic: varchar('topic', { length: 100 }),
  content: text('content').notNull(),
  keywords: text('keywords').array(),
  version: serial('version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 100 }),
});

// Insert schemas for validation
export const insertKnowledgeGapSchema = createInsertSchema(knowledgeGaps).omit({ id: true });
export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocuments).omit({ id: true, version: true });

// Widget events table for tracking analytics events
export const widgetEvents = pgTable('widget_events', {
  id: serial('id').primaryKey(),
  transcriptId: serial('transcript_id').references(() => transcripts.id),
  sessionId: varchar('session_id', { length: 100 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'widget_open', 'widget_close', 'chat_start', 'message_sent', 'email_captured', 'voice_start'
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: json('metadata').$type<{
    userAgent?: string;
    referrer?: string;
    duration?: number;
    messageCount?: number;
  }>(),
});

// Analytics filters table for excluding IPs from analytics
export const analyticsFilters = pgTable('analytics_filters', {
  id: serial('id').primaryKey(),
  filterType: varchar('filter_type', { length: 20 }).notNull().default('ip'), // 'ip' or 'cidr'
  value: varchar('value', { length: 100 }).notNull(), // IP address or CIDR range
  label: varchar('label', { length: 100 }), // Optional description
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Insert schemas for widget events and analytics filters
export const insertWidgetEventSchema = createInsertSchema(widgetEvents).omit({ id: true });
export const insertAnalyticsFilterSchema = createInsertSchema(analyticsFilters).omit({ id: true });

// Types based on the schema
export type Transcript = typeof transcripts.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type KnowledgeGap = typeof knowledgeGaps.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type WidgetEvent = typeof widgetEvents.$inferSelect;
export type AnalyticsFilter = typeof analyticsFilters.$inferSelect;
export type NewTranscript = z.infer<typeof insertTranscriptSchema>;
export type NewMessage = z.infer<typeof insertMessageSchema>;
export type NewLead = z.infer<typeof insertLeadSchema>;
export type NewKnowledgeGap = z.infer<typeof insertKnowledgeGapSchema>;
export type NewKnowledgeDocument = z.infer<typeof insertKnowledgeDocumentSchema>;
export type NewWidgetEvent = z.infer<typeof insertWidgetEventSchema>;
export type NewAnalyticsFilter = z.infer<typeof insertAnalyticsFilterSchema>;