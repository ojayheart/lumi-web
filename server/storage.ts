import { 
  transcripts, messages, leads, knowledgeGaps, knowledgeDocuments, widgetEvents, analyticsFilters,
  Transcript, Message, Lead, KnowledgeGap, KnowledgeDocument, WidgetEvent, AnalyticsFilter,
  NewTranscript, NewMessage, NewLead, NewKnowledgeGap, NewKnowledgeDocument, NewWidgetEvent, NewAnalyticsFilter 
} from '../shared/schema';
import { eq, desc, and, sql, gte, lte, ne, notInArray } from 'drizzle-orm';
import { db } from './db';

/**
 * Storage interface for transcript, message, and lead management
 */
export class TranscriptStorage {
  /**
   * Create a new transcript record for a conversation session
   */
  async createTranscript(transcript: NewTranscript): Promise<number> {
    try {
      const result = await db.insert(transcripts)
        .values(transcript)
        .returning({ id: transcripts.id });
      
      return result[0]?.id || 0;
    } catch (error) {
      console.error('Error creating transcript:', error);
      throw error;
    }
  }

  /**
   * Update external platform IDs on a transcript
   */
  async updateTranscriptExternalIds(transcriptId: number, updates: {
    elevenlabsConversationId?: string;
    voiceflowSessionId?: string;
  }): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.elevenlabsConversationId) {
        updateData.elevenlabsConversationId = updates.elevenlabsConversationId;
      }
      if (updates.voiceflowSessionId) {
        updateData.voiceflowSessionId = updates.voiceflowSessionId;
      }
      
      if (Object.keys(updateData).length === 0) {
        return true;
      }

      await db.update(transcripts)
        .set(updateData)
        .where(eq(transcripts.id, transcriptId));
      
      return true;
    } catch (error) {
      console.error('Error updating transcript external IDs:', error);
      throw error;
    }
  }

  /**
   * Add a message to an existing transcript
   */
  async addMessage(message: NewMessage): Promise<number> {
    try {
      const result = await db.insert(messages)
        .values(message)
        .returning({ id: messages.id });
      
      return result[0]?.id || 0;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Mark a transcript as complete
   */
  async completeTranscript(transcriptId: number, summary?: string): Promise<void> {
    try {
      await db.update(transcripts)
        .set({ 
          endTime: new Date(),
          summary: summary || undefined
        })
        .where(eq(transcripts.id, transcriptId));
    } catch (error) {
      console.error('Error completing transcript:', error);
      throw error;
    }
  }

  /**
   * Get a transcript by ID with all its messages
   */
  async getTranscript(transcriptId: number): Promise<{ transcript: Transcript, messages: Message[] } | null> {
    try {
      const transcriptResult = await db.select()
        .from(transcripts)
        .where(eq(transcripts.id, transcriptId))
        .limit(1);

      if (!transcriptResult.length) {
        return null;
      }

      const messagesResult = await db.select()
        .from(messages)
        .where(eq(messages.transcriptId, transcriptId))
        .orderBy(messages.timestamp);

      return {
        transcript: transcriptResult[0],
        messages: messagesResult
      };
    } catch (error) {
      console.error('Error getting transcript:', error);
      throw error;
    }
  }

  /**
   * Find a transcript by session ID
   */
  async findTranscriptBySessionId(sessionId: string): Promise<Transcript | null> {
    try {
      const result = await db.select()
        .from(transcripts)
        .where(eq(transcripts.sessionId, sessionId))
        .limit(1);

      return result.length ? result[0] : null;
    } catch (error) {
      console.error('Error finding transcript by session ID:', error);
      throw error;
    }
  }

  /**
   * Find the most recent active transcript by IP address
   */
  async findRecentTranscriptByIpAddress(ipAddress: string): Promise<Transcript | null> {
    try {
      const result = await db.select()
        .from(transcripts)
        .where(eq(transcripts.ipAddress, ipAddress))
        .orderBy(desc(transcripts.startTime))
        .limit(1);

      return result.length ? result[0] : null;
    } catch (error) {
      console.error('Error finding transcript by IP address:', error);
      throw error;
    }
  }

  /**
   * Get the latest transcripts (paginated)
   */
  async getRecentTranscripts(page = 1, limit = 20): Promise<Transcript[]> {
    try {
      const offset = (page - 1) * limit;
      
      return await db.select()
        .from(transcripts)
        .orderBy(desc(transcripts.startTime))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error getting recent transcripts:', error);
      throw error;
    }
  }

  /**
   * Get count of transcripts by date range
   */
  async getTranscriptCountByDate(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await db.select({ count: sql`count(*)` })
        .from(transcripts)
        .where(
          and(
            sql`${transcripts.startTime} >= ${startDate}`,
            sql`${transcripts.startTime} <= ${endDate}`
          )
        );
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Error getting transcript count by date:', error);
      throw error;
    }
  }

  /**
   * Store a new lead captured from the chat
   */
  async createLead(lead: NewLead): Promise<number> {
    try {
      const result = await db.insert(leads)
        .values(lead)
        .returning({ id: leads.id });
      
      return result[0]?.id || 0;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }
  
  /**
   * Mark a lead as contacted
   */
  async markLeadContacted(leadId: number): Promise<void> {
    try {
      await db.update(leads)
        .set({ contacted: true })
        .where(eq(leads.id, leadId));
    } catch (error) {
      console.error('Error marking lead as contacted:', error);
      throw error;
    }
  }
  
  /**
   * Get all leads (paginated with metadata)
   */
  async getLeads(page = 1, limit = 50): Promise<{
    data: Lead[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      
      const [countResult, leadsData] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(leads),
        db.select()
          .from(leads)
          .orderBy(desc(leads.createdAt))
          .limit(limit)
          .offset(offset)
      ]);

      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data: leadsData,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Error getting leads:', error);
      throw error;
    }
  }

  /**
   * Get lead by transcript ID
   */
  async getLeadByTranscriptId(transcriptId: number): Promise<Lead | null> {
    try {
      const result = await db.select()
        .from(leads)
        .where(eq(leads.transcriptId, transcriptId))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error getting lead by transcript ID:', error);
      return null;
    }
  }

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalLeads: number;
    engagedConversations: number;
    engagementRate: number;
    sourceBreakdown: Record<string, number>;
  }> {
    try {
      const [conversationsResult, messagesResult, leadsResult, engagedResult, sourceResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(transcripts),
        db.select({ count: sql<number>`count(*)` }).from(messages),
        db.select({ count: sql<number>`count(*)` }).from(leads),
        db.select({ count: sql<number>`count(*)` })
          .from(transcripts)
          .where(sql`EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.transcriptId} = ${transcripts.id})`),
        db.select({ 
          source: transcripts.source, 
          count: sql<number>`count(*)` 
        })
        .from(transcripts)
        .groupBy(transcripts.source)
      ]);

      const sourceBreakdown = sourceResult.reduce((acc, row) => {
        acc[row.source] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      const totalConversations = Number(conversationsResult[0]?.count || 0);
      const engagedConversations = Number(engagedResult[0]?.count || 0);
      const engagementRate = totalConversations > 0 ? (engagedConversations / totalConversations) * 100 : 0;

      return {
        totalConversations,
        totalMessages: Number(messagesResult[0]?.count || 0),
        totalLeads: Number(leadsResult[0]?.count || 0),
        engagedConversations,
        engagementRate,
        sourceBreakdown
      };
    } catch (error) {
      console.error('Error getting analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get all transcripts with message counts and lead info (paginated)
   * Optimized to only count messages for the current page's transcripts
   */
  async getAllTranscriptsWithDetails(page = 1, limit = 50, onlyEngaged = false): Promise<{
    data: Array<{
      id: number;
      sessionId: string;
      source: string;
      ipAddress: string | null;
      startTime: Date;
      endTime: Date | null;
      messageCount: number;
      leadCaptured: boolean;
      leadName: string | null;
      leadEmail: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const engagedFilter = sql`EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.transcriptId} = ${transcripts.id})`;

      const countQuery = onlyEngaged
        ? db.select({ count: sql<number>`count(*)` }).from(transcripts).where(engagedFilter)
        : db.select({ count: sql<number>`count(*)` }).from(transcripts);

      const baseTranscriptsQuery = db.select({
        id: transcripts.id,
        sessionId: transcripts.sessionId,
        source: transcripts.source,
        ipAddress: transcripts.ipAddress,
        startTime: transcripts.startTime,
        endTime: transcripts.endTime,
        leadId: leads.id,
        leadName: leads.name,
        leadEmail: leads.email,
      })
      .from(transcripts)
      .leftJoin(leads, eq(transcripts.id, leads.transcriptId));

      const transcriptsQuery = onlyEngaged
        ? baseTranscriptsQuery
            .where(engagedFilter)
            .orderBy(desc(transcripts.startTime), desc(transcripts.id))
            .limit(limit)
            .offset(offset)
        : baseTranscriptsQuery
            .orderBy(desc(transcripts.startTime), desc(transcripts.id))
            .limit(limit)
            .offset(offset);

      const [countResult, transcriptsWithLeads] = await Promise.all([
        countQuery,
        transcriptsQuery
      ]);

      const transcriptIds = transcriptsWithLeads.map(t => t.id);
      
      const messageCounts = transcriptIds.length > 0 ? await db.select({
        transcriptId: messages.transcriptId,
        count: sql<number>`count(*)`
      })
      .from(messages)
      .where(sql`${messages.transcriptId} IN (${sql.join(transcriptIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(messages.transcriptId) : [];

      const messageCountMap = messageCounts.reduce((acc, row) => {
        acc[row.transcriptId] = Number(row.count);
        return acc;
      }, {} as Record<number, number>);

      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data: transcriptsWithLeads.map(row => ({
          id: row.id,
          sessionId: row.sessionId,
          source: row.source,
          ipAddress: row.ipAddress,
          startTime: row.startTime,
          endTime: row.endTime,
          messageCount: messageCountMap[row.id] || 0,
          leadCaptured: !!row.leadId,
          leadName: row.leadName,
          leadEmail: row.leadEmail,
        })),
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Error getting transcripts with details:', error);
      throw error;
    }
  }

  /**
   * Get conversations for admin dashboard with filters
   */
  async getAdminConversations(options: {
    page?: number;
    limit?: number;
    channel?: string;
    startDate?: Date;
    endDate?: Date;
    onlyEngaged?: boolean;
  }): Promise<{
    data: Array<{
      id: number;
      sessionId: string;
      source: string;
      channel: string | null;
      elevenlabsConversationId: string | null;
      voiceflowSessionId: string | null;
      ipAddress: string | null;
      startTime: Date;
      endTime: Date | null;
      messageCount: number;
      leadCaptured: boolean;
      leadName: string | null;
      leadEmail: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 25, channel, startDate, endDate, onlyEngaged = true } = options;
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];
      
      if (onlyEngaged) {
        conditions.push(sql`EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.transcriptId} = ${transcripts.id})`);
      }
      
      if (channel && channel !== 'all') {
        conditions.push(sql`${transcripts.channel} = ${channel}`);
      }
      
      if (startDate) {
        conditions.push(sql`${transcripts.startTime} >= ${startDate.toISOString()}`);
      }
      
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(sql`${transcripts.startTime} <= ${endOfDay.toISOString()}`);
      }

      const whereClause = conditions.length > 0 
        ? sql.join(conditions, sql` AND `)
        : sql`1=1`;

      const [countResult, transcriptsWithLeads] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(transcripts)
          .where(whereClause),
        db.select({
          id: transcripts.id,
          sessionId: transcripts.sessionId,
          source: transcripts.source,
          channel: transcripts.channel,
          elevenlabsConversationId: transcripts.elevenlabsConversationId,
          voiceflowSessionId: transcripts.voiceflowSessionId,
          ipAddress: transcripts.ipAddress,
          startTime: transcripts.startTime,
          endTime: transcripts.endTime,
          leadId: leads.id,
          leadName: leads.name,
          leadEmail: leads.email,
        })
        .from(transcripts)
        .leftJoin(leads, eq(transcripts.id, leads.transcriptId))
        .where(whereClause)
        .orderBy(desc(transcripts.startTime), desc(transcripts.id))
        .limit(limit)
        .offset(offset)
      ]);

      const transcriptIds = transcriptsWithLeads.map(t => t.id);
      
      const messageCounts = transcriptIds.length > 0 ? await db.select({
        transcriptId: messages.transcriptId,
        count: sql<number>`count(*)`
      })
      .from(messages)
      .where(sql`${messages.transcriptId} IN (${sql.join(transcriptIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(messages.transcriptId) : [];

      const messageCountMap = messageCounts.reduce((acc, row) => {
        acc[row.transcriptId] = Number(row.count);
        return acc;
      }, {} as Record<number, number>);

      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data: transcriptsWithLeads.map(row => ({
          id: row.id,
          sessionId: row.sessionId,
          source: row.source,
          channel: row.channel,
          elevenlabsConversationId: row.elevenlabsConversationId,
          voiceflowSessionId: row.voiceflowSessionId,
          ipAddress: row.ipAddress,
          startTime: row.startTime,
          endTime: row.endTime,
          messageCount: messageCountMap[row.id] || 0,
          leadCaptured: !!row.leadId,
          leadName: row.leadName,
          leadEmail: row.leadEmail,
        })),
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Error getting admin conversations:', error);
      throw error;
    }
  }

  /**
   * Get all engaged conversations for CSV export with filters
   */
  async getConversationsForExport(options: {
    channel?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Array<{
    id: number;
    sessionId: string;
    source: string;
    channel: string | null;
    ipAddress: string | null;
    startTime: Date;
    endTime: Date | null;
    leadName: string | null;
    leadEmail: string | null;
    leadPhone: string | null;
  }>> {
    const { channel, startDate, endDate } = options;

    try {
      const conditions: any[] = [
        sql`EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.transcriptId} = ${transcripts.id})`
      ];
      
      if (channel && channel !== 'all') {
        conditions.push(sql`${transcripts.channel} = ${channel}`);
      }
      
      if (startDate) {
        conditions.push(sql`${transcripts.startTime} >= ${startDate.toISOString()}`);
      }
      
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(sql`${transcripts.startTime} <= ${endOfDay.toISOString()}`);
      }

      const whereClause = sql.join(conditions, sql` AND `);

      const result = await db.select({
        id: transcripts.id,
        sessionId: transcripts.sessionId,
        source: transcripts.source,
        channel: transcripts.channel,
        ipAddress: transcripts.ipAddress,
        startTime: transcripts.startTime,
        endTime: transcripts.endTime,
        leadName: leads.name,
        leadEmail: leads.email,
        leadPhone: leads.phone,
      })
      .from(transcripts)
      .leftJoin(leads, eq(transcripts.id, leads.transcriptId))
      .where(whereClause)
      .orderBy(desc(transcripts.startTime));

      return result;
    } catch (error) {
      console.error('Error getting conversations for export:', error);
      throw error;
    }
  }

  /**
   * Get daily conversation stats for the last N days
   */
  async getDailyStats(days: number = 30): Promise<Array<{
    date: string;
    conversations: number;
    messages: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const conversationStats = await db.select({
        date: sql<string>`DATE(${transcripts.startTime})`,
        count: sql<number>`count(*)`
      })
      .from(transcripts)
      .where(sql`${transcripts.startTime} >= ${startDate}`)
      .groupBy(sql`DATE(${transcripts.startTime})`)
      .orderBy(sql`DATE(${transcripts.startTime})`);

      const messageStats = await db.select({
        date: sql<string>`DATE(${messages.timestamp})`,
        count: sql<number>`count(*)`
      })
      .from(messages)
      .where(sql`${messages.timestamp} >= ${startDate}`)
      .groupBy(sql`DATE(${messages.timestamp})`)
      .orderBy(sql`DATE(${messages.timestamp})`);

      const messageMap = messageStats.reduce((acc, row) => {
        acc[row.date] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      return conversationStats.map(row => ({
        date: row.date,
        conversations: Number(row.count),
        messages: messageMap[row.date] || 0
      }));
    } catch (error) {
      console.error('Error getting daily stats:', error);
      throw error;
    }
  }

  // ==================== Knowledge Gap Methods ====================

  /**
   * Create a new knowledge gap record
   */
  async createKnowledgeGap(gap: NewKnowledgeGap): Promise<number> {
    try {
      const result = await db.insert(knowledgeGaps)
        .values(gap)
        .returning({ id: knowledgeGaps.id });
      return result[0]?.id || 0;
    } catch (error) {
      console.error('Error creating knowledge gap:', error);
      throw error;
    }
  }

  /**
   * Get all knowledge gaps with pagination and filtering
   */
  async getKnowledgeGaps(options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{
    data: KnowledgeGap[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 25, status } = options;
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];
      if (status && status !== 'all') {
        conditions.push(eq(knowledgeGaps.status, status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [gaps, countResult] = await Promise.all([
        db.select()
          .from(knowledgeGaps)
          .where(whereClause)
          .orderBy(desc(knowledgeGaps.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(knowledgeGaps)
          .where(whereClause)
      ]);

      const total = Number(countResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      return { data: gaps, total, page, limit, totalPages };
    } catch (error) {
      console.error('Error getting knowledge gaps:', error);
      throw error;
    }
  }

  /**
   * Get a single knowledge gap by ID
   */
  async getKnowledgeGap(id: number): Promise<KnowledgeGap | null> {
    try {
      const result = await db.select()
        .from(knowledgeGaps)
        .where(eq(knowledgeGaps.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting knowledge gap:', error);
      throw error;
    }
  }

  /**
   * Update a knowledge gap (for resolving, adding corrections, etc.)
   */
  async updateKnowledgeGap(id: number, updates: Partial<{
    status: string;
    humanCorrection: string;
    resolutionNotes: string;
    resolvedBy: string;
    resolvedAt: Date;
  }>): Promise<boolean> {
    try {
      await db.update(knowledgeGaps)
        .set(updates)
        .where(eq(knowledgeGaps.id, id));
      return true;
    } catch (error) {
      console.error('Error updating knowledge gap:', error);
      throw error;
    }
  }

  /**
   * Get transcripts for audit within a date range
   */
  async getTranscriptsForAudit(startDate: Date, endDate: Date): Promise<Array<{
    transcript: Transcript;
    messages: Message[];
  }>> {
    try {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const transcriptList = await db.select()
        .from(transcripts)
        .where(and(
          gte(transcripts.startTime, startDate),
          lte(transcripts.startTime, endOfDay),
          sql`EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.transcriptId} = ${transcripts.id})`
        ))
        .orderBy(desc(transcripts.startTime));

      const results: Array<{ transcript: Transcript; messages: Message[] }> = [];

      for (const transcript of transcriptList) {
        const msgs = await db.select()
          .from(messages)
          .where(eq(messages.transcriptId, transcript.id))
          .orderBy(messages.timestamp);
        results.push({ transcript, messages: msgs });
      }

      return results;
    } catch (error) {
      console.error('Error getting transcripts for audit:', error);
      throw error;
    }
  }

  /**
   * Get knowledge gap stats
   */
  async getKnowledgeGapStats(): Promise<{
    total: number;
    new: number;
    reviewed: number;
    resolved: number;
    falsePositive: number;
  }> {
    try {
      const result = await db.select({
        status: knowledgeGaps.status,
        count: sql<number>`count(*)`
      })
      .from(knowledgeGaps)
      .groupBy(knowledgeGaps.status);

      const stats = { total: 0, new: 0, reviewed: 0, resolved: 0, falsePositive: 0 };
      for (const row of result) {
        const count = Number(row.count);
        stats.total += count;
        if (row.status === 'new') stats.new = count;
        else if (row.status === 'reviewed') stats.reviewed = count;
        else if (row.status === 'resolved') stats.resolved = count;
        else if (row.status === 'false_positive') stats.falsePositive = count;
      }
      return stats;
    } catch (error) {
      console.error('Error getting knowledge gap stats:', error);
      throw error;
    }
  }

  // ==================== Knowledge Document Methods ====================

  /**
   * Create a new knowledge document
   */
  async createKnowledgeDocument(doc: NewKnowledgeDocument): Promise<number> {
    try {
      const result = await db.insert(knowledgeDocuments)
        .values(doc)
        .returning({ id: knowledgeDocuments.id });
      return result[0]?.id || 0;
    } catch (error) {
      console.error('Error creating knowledge document:', error);
      throw error;
    }
  }

  /**
   * Get all knowledge documents
   */
  async getKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
    try {
      return await db.select()
        .from(knowledgeDocuments)
        .orderBy(desc(knowledgeDocuments.updatedAt));
    } catch (error) {
      console.error('Error getting knowledge documents:', error);
      throw error;
    }
  }

  /**
   * Update a knowledge document
   */
  async updateKnowledgeDocument(id: number, updates: Partial<{
    title: string;
    topic: string;
    content: string;
    keywords: string[];
  }>): Promise<boolean> {
    try {
      await db.update(knowledgeDocuments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(knowledgeDocuments.id, id));
      return true;
    } catch (error) {
      console.error('Error updating knowledge document:', error);
      throw error;
    }
  }

  // ==================== Widget Events & Analytics Methods ====================

  /**
   * Record a widget event
   */
  async recordWidgetEvent(event: NewWidgetEvent): Promise<number> {
    try {
      const result = await db.insert(widgetEvents)
        .values(event)
        .returning({ id: widgetEvents.id });
      return result[0]?.id || 0;
    } catch (error) {
      console.error('Error recording widget event:', error);
      throw error;
    }
  }

  /**
   * Get all active excluded IPs
   */
  async getExcludedIPs(): Promise<string[]> {
    try {
      const filters = await db.select({ value: analyticsFilters.value })
        .from(analyticsFilters)
        .where(eq(analyticsFilters.active, true));
      return filters.map(f => f.value);
    } catch (error) {
      console.error('Error getting excluded IPs:', error);
      return [];
    }
  }

  /**
   * Check if an IP should be excluded
   */
  async isIPExcluded(ipAddress: string): Promise<boolean> {
    const excludedIPs = await this.getExcludedIPs();
    return excludedIPs.some(excluded => {
      if (excluded.includes('/')) {
        return this.ipMatchesCIDR(ipAddress, excluded);
      }
      return ipAddress === excluded;
    });
  }

  /**
   * Simple CIDR matching
   */
  private ipMatchesCIDR(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/');
      const mask = parseInt(bits, 10);
      
      const ipParts = ip.split('.').map(Number);
      const rangeParts = range.split('.').map(Number);
      
      const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
      const maskNum = ~((1 << (32 - mask)) - 1);
      
      return (ipNum & maskNum) === (rangeNum & maskNum);
    } catch {
      return false;
    }
  }

  /**
   * Add an IP exclusion filter
   */
  async addAnalyticsFilter(filter: NewAnalyticsFilter): Promise<number> {
    try {
      const result = await db.insert(analyticsFilters)
        .values(filter)
        .returning({ id: analyticsFilters.id });
      return result[0]?.id || 0;
    } catch (error) {
      console.error('Error adding analytics filter:', error);
      throw error;
    }
  }

  /**
   * Get all analytics filters
   */
  async getAnalyticsFilters(): Promise<AnalyticsFilter[]> {
    try {
      return await db.select()
        .from(analyticsFilters)
        .orderBy(desc(analyticsFilters.createdAt));
    } catch (error) {
      console.error('Error getting analytics filters:', error);
      throw error;
    }
  }

  /**
   * Update an analytics filter
   */
  async updateAnalyticsFilter(id: number, updates: { active?: boolean; label?: string }): Promise<boolean> {
    try {
      await db.update(analyticsFilters)
        .set(updates)
        .where(eq(analyticsFilters.id, id));
      return true;
    } catch (error) {
      console.error('Error updating analytics filter:', error);
      throw error;
    }
  }

  /**
   * Delete an analytics filter
   */
  async deleteAnalyticsFilter(id: number): Promise<boolean> {
    try {
      await db.delete(analyticsFilters)
        .where(eq(analyticsFilters.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting analytics filter:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive widget analytics summary
   */
  async getWidgetAnalyticsSummary(startDate: Date, endDate: Date): Promise<{
    widgetOpens: number;
    widgetCloses: number;
    chatStarts: number;
    totalConversations: number;
    textConversations: number;
    voiceConversations: number;
    avgDurationSeconds: number;
    avgMessagesPerConversation: number;
    emailsCaptured: number;
    emailsCapturedThisMonth: number;
    uniqueVisitors: number;
  }> {
    try {
      const excludedIPs = await this.getExcludedIPs();
      
      // Widget events counts - convert dates to ISO strings for postgres
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      
      const [widgetOpenResult, widgetCloseResult, chatStartResult, emailCapturedResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(widgetEvents)
          .where(and(
            eq(widgetEvents.eventType, 'widget_open'),
            sql`${widgetEvents.occurredAt} >= ${startDateStr}`,
            sql`${widgetEvents.occurredAt} <= ${endDateStr}`
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(widgetEvents)
          .where(and(
            eq(widgetEvents.eventType, 'widget_close'),
            sql`${widgetEvents.occurredAt} >= ${startDateStr}`,
            sql`${widgetEvents.occurredAt} <= ${endDateStr}`
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(widgetEvents)
          .where(and(
            eq(widgetEvents.eventType, 'chat_start'),
            sql`${widgetEvents.occurredAt} >= ${startDateStr}`,
            sql`${widgetEvents.occurredAt} <= ${endDateStr}`
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(widgetEvents)
          .where(and(
            eq(widgetEvents.eventType, 'email_captured'),
            sql`${widgetEvents.occurredAt} >= ${startDateStr}`,
            sql`${widgetEvents.occurredAt} <= ${endDateStr}`
          )),
      ]);

      // Conversation stats
      const [totalConvResult, textConvResult, voiceConvResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` })
          .from(transcripts)
          .where(and(
            sql`${transcripts.startTime} >= ${startDateStr}`,
            sql`${transcripts.startTime} <= ${endDateStr}`
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(transcripts)
          .where(and(
            eq(transcripts.channel, 'text'),
            sql`${transcripts.startTime} >= ${startDateStr}`,
            sql`${transcripts.startTime} <= ${endDateStr}`
          )),
        db.select({ count: sql<number>`count(*)` })
          .from(transcripts)
          .where(and(
            eq(transcripts.channel, 'voice'),
            sql`${transcripts.startTime} >= ${startDateStr}`,
            sql`${transcripts.startTime} <= ${endDateStr}`
          )),
      ]);

      // Average duration (for completed conversations)
      const durationResult = await db.select({
        avgDuration: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (end_time - start_time))), 0)`
      })
        .from(transcripts)
        .where(and(
          sql`${transcripts.startTime} >= ${startDateStr}`,
          sql`${transcripts.startTime} <= ${endDateStr}`,
          sql`end_time IS NOT NULL`
        ));

      // Average messages per conversation
      const msgCountResult = await db.select({
        avgMessages: sql<number>`COALESCE(AVG(msg_count), 0)`
      })
        .from(sql`(
          SELECT t.id, COUNT(m.id) as msg_count
          FROM transcripts t
          LEFT JOIN messages m ON m.transcript_id = t.id
          WHERE t.start_time >= ${startDateStr} AND t.start_time <= ${endDateStr}
          GROUP BY t.id
        ) as subquery`);

      // Emails captured this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const startOfMonthStr = startOfMonth.toISOString();
      const endOfMonthStr = endOfMonth.toISOString();
      
      const emailsThisMonthResult = await db.select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(and(
          sql`${leads.createdAt} >= ${startOfMonthStr}`,
          sql`${leads.createdAt} <= ${endOfMonthStr}`
        ));

      // Unique visitors (by session)
      const uniqueVisitorsResult = await db.select({
        count: sql<number>`count(DISTINCT session_id)`
      })
        .from(widgetEvents)
        .where(and(
          sql`${widgetEvents.occurredAt} >= ${startDateStr}`,
          sql`${widgetEvents.occurredAt} <= ${endDateStr}`
        ));

      return {
        widgetOpens: Number(widgetOpenResult[0]?.count || 0),
        widgetCloses: Number(widgetCloseResult[0]?.count || 0),
        chatStarts: Number(chatStartResult[0]?.count || 0),
        totalConversations: Number(totalConvResult[0]?.count || 0),
        textConversations: Number(textConvResult[0]?.count || 0),
        voiceConversations: Number(voiceConvResult[0]?.count || 0),
        avgDurationSeconds: Number(durationResult[0]?.avgDuration || 0),
        avgMessagesPerConversation: Number(msgCountResult[0]?.avgMessages || 0),
        emailsCaptured: Number(emailCapturedResult[0]?.count || 0),
        emailsCapturedThisMonth: Number(emailsThisMonthResult[0]?.count || 0),
        uniqueVisitors: Number(uniqueVisitorsResult[0]?.count || 0),
      };
    } catch (error) {
      console.error('Error getting widget analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get monthly email capture stats
   */
  async getMonthlyEmailStats(months: number = 12): Promise<Array<{ month: string; count: number }>> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      const startDateStr = startDate.toISOString();
      
      const result = await db.select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        count: sql<number>`count(*)`
      })
        .from(leads)
        .where(sql`${leads.createdAt} >= ${startDateStr}`)
        .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

      return result.map(r => ({
        month: r.month,
        count: Number(r.count)
      }));
    } catch (error) {
      console.error('Error getting monthly email stats:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const transcriptStorage = new TranscriptStorage();