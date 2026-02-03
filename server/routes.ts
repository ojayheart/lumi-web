import type { Express } from "express";
import { createServer, type Server } from "http";
import { transcriptStorage } from "./storage";
import { transcriptService } from './services/transcriptService';
import { leadService } from './services/leadService';
import { leadMagnetService } from './services/leadMagnetService';
import express from "express";
import path from "path";
import axios from "axios";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // API keys endpoint - this is safer than exposing keys directly in client code
  app.get('/api/config', (req, res) => {
    // Log the available keys (only their presence, not the actual value)
    console.log('Available environment variables for API configuration:', {
      'VOICEFLOW_API_KEY': !!process.env.VOICEFLOW_API_KEY,
      'ELEVENLABS_API_KEY': !!process.env.ELEVENLABS_API_KEY,
      'OPENAI_API_AROHA_KEY': !!process.env.OPENAI_API_AROHA_KEY,
    });

    // Construct and return the API configuration
    res.json({
      voiceflow: {
        apiKey: process.env.VOICEFLOW_API_KEY || '',
        projectId: '6786e8cd358548c59f31eda8', // Default project ID from existing widget
        versionId: '6786e8cd358548c59f31eda9',
        shouldProcessImages: true, // Flag to enable image processing
      },
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: 'XB0fDUnXU5powFXDhCwa', // Deobra voice ID
        modelId: 'eleven_turbo_v2',
        assistantId: '3FvBwXKJ0YFSqoIIbL07', // The specific agent ID you provided
      },
      openai: {
        apiKey: process.env.OPENAI_API_AROHA_KEY || '',
        model: 'gpt-4o', // Using the latest OpenAI model for text normalization (released May 13, 2024)
      }
    });
  });

  // Transcript API endpoints

  // Endpoint to start tracking a conversation
  app.post('/api/transcripts/start', async (req, res) => {
    try {
      const { sessionId, source, metadata, channel } = req.body;

      if (!sessionId || !source) {
        return res.status(400).json({ error: 'Session ID and source are required' });
      }

      // Get client IP address - prioritize forwarded headers for real visitor IP
      const getClientIP = (req: any) => {
        // Check for forwarded IP headers first (most reliable for real visitor IP)
        const forwardedFor = req.headers['x-forwarded-for'];
        if (forwardedFor) {
          // X-Forwarded-For can contain multiple IPs, take the first (original client)
          const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
          // Return the first non-private IP
          for (const ip of ips) {
            if (ip && !isPrivateIP(ip)) {
              return ip;
            }
          }
          // If all are private, return the first one
          return ips[0];
        }
        
        // Check other forwarded headers
        if (req.headers['x-real-ip']) return req.headers['x-real-ip'];
        if (req.headers['x-client-ip']) return req.headers['x-client-ip'];
        if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip']; // Cloudflare
        if (req.headers['x-original-forwarded-for']) return req.headers['x-original-forwarded-for'];
        
        // Fallback to connection IPs
        return req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
               'unknown';
      };

      // Helper function to check if IP is private/local
      const isPrivateIP = (ip: string) => {
        if (!ip || ip === 'unknown') return true;
        // Remove IPv6 prefix if present
        const cleanIP = ip.replace(/^::ffff:/, '');
        // Check for private IP ranges
        return cleanIP.startsWith('127.') ||
               cleanIP.startsWith('10.') ||
               cleanIP.startsWith('192.168.') ||
               cleanIP.startsWith('172.16.') ||
               cleanIP.startsWith('172.17.') ||
               cleanIP.startsWith('172.18.') ||
               cleanIP.startsWith('172.19.') ||
               cleanIP.startsWith('172.2') ||
               cleanIP.startsWith('172.30.') ||
               cleanIP.startsWith('172.31.') ||
               cleanIP === 'localhost' ||
               cleanIP === '::1';
      };

      const clientIP = getClientIP(req);
      
      // Log IP detection details for debugging
      console.log('IP Detection Details:', {
        detectedIP: clientIP,
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'x-client-ip': req.headers['x-client-ip'],
        'cf-connecting-ip': req.headers['cf-connecting-ip'],
        'req.ip': req.ip,
        'connection.remoteAddress': req.connection?.remoteAddress,
        'socket.remoteAddress': req.socket?.remoteAddress,
        referrer: metadata?.referrer || 'none'
      });
      
      const result = await transcriptService.startConversation(sessionId, source, metadata, clientIP, channel);
      
      // Send webhook for new sessions
      if (result.isNewSession) {
        try {
          const webhookUrl = 'https://hook.us1.make.com/ijiq686fg4pwydla0jycvk07nr3j8b33';
          const webhookPayload = {
            transcriptId: result.transcriptId,
            sessionId: sessionId,
            source: source,
            channel: channel || 'text',
            ipAddress: clientIP,
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || 'unknown',
            metadata: metadata || {},
            sessionType: 'new_session'
          };

          console.log(`Sending webhook for new session - transcript ${result.transcriptId}`);
          console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));
          
          axios.post(webhookUrl, webhookPayload, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000
          }).then(response => {
            console.log(`Webhook response status: ${response.status} ${response.statusText}`);
            console.log(`✓ New session webhook sent for transcript ${result.transcriptId} from IP ${clientIP}`);
            console.log('Webhook response body:', response.data);
          }).catch(error => {
            console.error(`✗ New session webhook error for transcript ${result.transcriptId}:`, error.message);
            if (error.response) {
              console.error('Response status:', error.response.status);
              console.error('Response data:', error.response.data);
            }
            console.error('Full error:', error);
          });
        } catch (webhookError) {
          console.error('Error sending new session webhook:', webhookError);
          // Don't fail the main request if webhook fails
        }
      }
      
      res.json({ transcriptId: result.transcriptId });
    } catch (error) {
      console.error('Error starting transcript:', error);
      res.status(500).json({ error: 'Failed to start conversation tracking' });
    }
  });

  // Endpoint to update external platform IDs on a transcript
  app.patch('/api/transcripts/:transcriptId/external-ids', async (req, res) => {
    try {
      const { transcriptId } = req.params;
      const { elevenlabsConversationId, voiceflowSessionId } = req.body;

      await transcriptStorage.updateTranscriptExternalIds(parseInt(transcriptId), {
        elevenlabsConversationId,
        voiceflowSessionId
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating external IDs:', error);
      res.status(500).json({ error: 'Failed to update external IDs' });
    }
  });

  // Endpoint to record a message
  app.post('/api/transcripts/:transcriptId/messages', async (req, res) => {
    try {
      const { transcriptId } = req.params;
      const { role, content, messageType, metadata } = req.body;

      if (!role || !content) {
        return res.status(400).json({ error: 'Role and content are required' });
      }

      const messageId = await transcriptService.recordMessage(
        parseInt(transcriptId), 
        role, 
        content,
        messageType,
        metadata
      );

      res.json({ messageId });
    } catch (error) {
      console.error('Error recording message:', error);
      res.status(500).json({ error: 'Failed to record message' });
    }
  });

  // Endpoint to end a conversation
  app.post('/api/transcripts/:transcriptId/end', async (req, res) => {
    try {
      const { transcriptId } = req.params;

      await transcriptService.endConversation(parseInt(transcriptId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error ending transcript:', error);
      res.status(500).json({ error: 'Failed to end conversation' });
    }
  });

  // Endpoint to get a transcript
  app.get('/api/transcripts/:transcriptId', async (req, res) => {
    try {
      const { transcriptId } = req.params;

      const transcript = await transcriptStorage.getTranscript(parseInt(transcriptId));

      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      // Also fetch lead info if available
      const lead = await transcriptStorage.getLeadByTranscriptId(parseInt(transcriptId));

      res.json({
        ...transcript,
        lead: lead ? {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
        } : null,
      });
    } catch (error) {
      console.error('Error retrieving transcript:', error);
      res.status(500).json({ error: 'Failed to retrieve transcript' });
    }
  });

  // Admin password verification endpoint
  app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return res.status(500).json({ error: 'Admin password not configured' });
    }
    
    if (password === adminPassword) {
      return res.json({ success: true });
    }
    
    return res.status(401).json({ error: 'Invalid password' });
  });

  // Admin endpoint to get usage statistics
  app.get('/api/admin/usage', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const stats = await transcriptService.getUsageStatistics(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(stats);
    } catch (error) {
      console.error('Error retrieving usage statistics:', error);
      res.status(500).json({ error: 'Failed to retrieve usage statistics' });
    }
  });

  // Analytics overview endpoint
  app.get('/api/analytics/overview', async (req, res) => {
    try {
      const overview = await transcriptStorage.getAnalyticsOverview();
      res.json(overview);
    } catch (error) {
      console.error('Error retrieving analytics overview:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics overview' });
    }
  });

  // Get all transcripts with details (paginated)
  app.get('/api/analytics/transcripts', async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const onlyEngaged = req.query.onlyEngaged === 'true';
      const transcripts = await transcriptStorage.getAllTranscriptsWithDetails(page, limit, onlyEngaged);
      res.json(transcripts);
    } catch (error) {
      console.error('Error retrieving transcripts:', error);
      res.status(500).json({ error: 'Failed to retrieve transcripts' });
    }
  });

  // Get daily stats
  app.get('/api/analytics/daily-stats', async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const stats = await transcriptStorage.getDailyStats(days);
      res.json(stats);
    } catch (error) {
      console.error('Error retrieving daily stats:', error);
      res.status(500).json({ error: 'Failed to retrieve daily stats' });
    }
  });

  // Get all leads (paginated)
  app.get('/api/analytics/leads', async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const leads = await transcriptStorage.getLeads(page, limit);
      res.json(leads);
    } catch (error) {
      console.error('Error retrieving leads:', error);
      res.status(500).json({ error: 'Failed to retrieve leads' });
    }
  });

  // Admin dashboard - get conversations with filters
  app.get('/api/admin/conversations', async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
      const channel = req.query.channel as string | undefined;
      const onlyEngaged = req.query.onlyEngaged === 'true';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await transcriptStorage.getAdminConversations({
        page,
        limit,
        channel,
        startDate,
        endDate,
        onlyEngaged
      });
      res.json(result);
    } catch (error) {
      console.error('Error retrieving admin conversations:', error);
      res.status(500).json({ error: 'Failed to retrieve conversations' });
    }
  });

  // Admin dashboard - export filtered conversations to CSV
  app.get('/api/admin/export-csv', async (req, res) => {
    try {
      const channel = req.query.channel as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const transcriptsData = await transcriptStorage.getConversationsForExport({
        channel,
        startDate,
        endDate
      });

      // Fetch all messages for these transcripts only
      const transcriptIds = transcriptsData.map(t => t.id);
      let allMessages: any[] = [];
      
      if (transcriptIds.length > 0) {
        const { messages } = await import('@shared/schema');
        const { db } = await import('./db');
        const { sql } = await import('drizzle-orm');
        
        allMessages = await db
          .select()
          .from(messages)
          .where(sql`${messages.transcriptId} IN (${sql.join(transcriptIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(messages.transcriptId, messages.timestamp);
      }

      // Group messages by transcript
      const messagesByTranscript = new Map<number, any[]>();
      for (const msg of allMessages) {
        if (!messagesByTranscript.has(msg.transcriptId)) {
          messagesByTranscript.set(msg.transcriptId, []);
        }
        messagesByTranscript.get(msg.transcriptId)!.push(msg);
      }

      // Build CSV
      const csvRows: string[] = [];
      csvRows.push([
        'Transcript ID',
        'Session ID',
        'Date',
        'Time',
        'Channel',
        'Source',
        'IP Address',
        'Message Count',
        'Conversation',
        'Lead Name',
        'Lead Email',
        'Lead Phone'
      ].map(field => `"${field}"`).join(','));

      const escapeCsv = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      for (const transcript of transcriptsData) {
        const msgs = messagesByTranscript.get(transcript.id) || [];
        const conversationText = msgs
          .map(msg => `${msg.role}: ${msg.content}`)
          .join(' | ');

        csvRows.push([
          transcript.id,
          transcript.sessionId,
          transcript.startTime ? new Date(transcript.startTime).toISOString().split('T')[0] : '',
          transcript.startTime ? new Date(transcript.startTime).toISOString().split('T')[1].split('.')[0] : '',
          transcript.channel || 'text',
          transcript.source,
          transcript.ipAddress || '',
          msgs.length,
          conversationText,
          transcript.leadName || '',
          transcript.leadEmail || '',
          transcript.leadPhone || ''
        ].map(escapeCsv).join(','));
      }

      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transcripts-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  });

  // ==================== Knowledge Gap API Endpoints ====================

  // Run knowledge audit on a date range
  app.post('/api/admin/knowledge-audit', async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const { knowledgeAuditService } = await import('./services/knowledgeAuditService');
      const result = await knowledgeAuditService.runAudit(
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error running knowledge audit:', error);
      res.status(500).json({ error: 'Failed to run knowledge audit' });
    }
  });

  // Get knowledge gaps with pagination and filtering
  app.get('/api/admin/knowledge-gaps', async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
      const status = req.query.status as string | undefined;

      const result = await transcriptStorage.getKnowledgeGaps({ page, limit, status });
      res.json(result);
    } catch (error) {
      console.error('Error retrieving knowledge gaps:', error);
      res.status(500).json({ error: 'Failed to retrieve knowledge gaps' });
    }
  });

  // Get knowledge gap stats
  app.get('/api/admin/knowledge-gaps/stats', async (req, res) => {
    try {
      const stats = await transcriptStorage.getKnowledgeGapStats();
      res.json(stats);
    } catch (error) {
      console.error('Error retrieving knowledge gap stats:', error);
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  });

  // Get single knowledge gap
  app.get('/api/admin/knowledge-gaps/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const gap = await transcriptStorage.getKnowledgeGap(id);
      
      if (!gap) {
        return res.status(404).json({ error: 'Knowledge gap not found' });
      }
      
      res.json(gap);
    } catch (error) {
      console.error('Error retrieving knowledge gap:', error);
      res.status(500).json({ error: 'Failed to retrieve knowledge gap' });
    }
  });

  // Update knowledge gap (resolve, mark false positive, add correction)
  app.patch('/api/admin/knowledge-gaps/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, humanCorrection, resolutionNotes, resolvedBy } = req.body;
      
      const updates: any = {};
      if (status) updates.status = status;
      if (humanCorrection !== undefined) updates.humanCorrection = humanCorrection;
      if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;
      if (resolvedBy) updates.resolvedBy = resolvedBy;
      
      if (status === 'resolved' || status === 'false_positive') {
        updates.resolvedAt = new Date();
      }

      await transcriptStorage.updateKnowledgeGap(id, updates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating knowledge gap:', error);
      res.status(500).json({ error: 'Failed to update knowledge gap' });
    }
  });

  // Widget Analytics - comprehensive summary
  app.get('/api/analytics/widget-summary', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const summary = await transcriptStorage.getWidgetAnalyticsSummary(start, end);
      res.json(summary);
    } catch (error) {
      console.error('Error retrieving widget analytics:', error);
      res.status(500).json({ error: 'Failed to retrieve widget analytics' });
    }
  });

  // Widget Analytics - monthly email stats
  app.get('/api/analytics/monthly-emails', async (req, res) => {
    try {
      const months = req.query.months ? parseInt(req.query.months as string) : 12;
      const stats = await transcriptStorage.getMonthlyEmailStats(months);
      res.json(stats);
    } catch (error) {
      console.error('Error retrieving monthly email stats:', error);
      res.status(500).json({ error: 'Failed to retrieve monthly email stats' });
    }
  });

  // Record widget event
  app.post('/api/analytics/events', async (req, res) => {
    try {
      const { sessionId, eventType, transcriptId, metadata } = req.body;
      
      if (!sessionId || !eventType) {
        return res.status(400).json({ error: 'sessionId and eventType are required' });
      }
      
      // Get client IP
      const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() 
        || req.socket.remoteAddress 
        || null;
      
      // Check if IP is excluded
      if (ipAddress && await transcriptStorage.isIPExcluded(ipAddress)) {
        return res.json({ success: true, excluded: true });
      }
      
      const eventId = await transcriptStorage.recordWidgetEvent({
        sessionId,
        eventType,
        transcriptId: transcriptId || null,
        ipAddress,
        occurredAt: new Date(),
        metadata: metadata || null,
      });
      
      res.json({ success: true, eventId });
    } catch (error) {
      console.error('Error recording widget event:', error);
      res.status(500).json({ error: 'Failed to record event' });
    }
  });

  // Analytics Filters - CRUD for IP exclusions
  app.get('/api/analytics/filters', async (req, res) => {
    try {
      const filters = await transcriptStorage.getAnalyticsFilters();
      res.json(filters);
    } catch (error) {
      console.error('Error retrieving analytics filters:', error);
      res.status(500).json({ error: 'Failed to retrieve filters' });
    }
  });

  app.post('/api/analytics/filters', async (req, res) => {
    try {
      const { value, label, filterType } = req.body;
      
      if (!value) {
        return res.status(400).json({ error: 'IP address or CIDR range is required' });
      }
      
      const filterId = await transcriptStorage.addAnalyticsFilter({
        value,
        label: label || null,
        filterType: filterType || 'ip',
        active: true,
        createdAt: new Date(),
      });
      
      res.json({ success: true, id: filterId });
    } catch (error) {
      console.error('Error adding analytics filter:', error);
      res.status(500).json({ error: 'Failed to add filter' });
    }
  });

  app.patch('/api/analytics/filters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active, label } = req.body;
      
      await transcriptStorage.updateAnalyticsFilter(id, { active, label });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating analytics filter:', error);
      res.status(500).json({ error: 'Failed to update filter' });
    }
  });

  app.delete('/api/analytics/filters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await transcriptStorage.deleteAnalyticsFilter(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting analytics filter:', error);
      res.status(500).json({ error: 'Failed to delete filter' });
    }
  });

  // Download CSV export
  app.get('/api/analytics/download-csv', (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Find the most recent CSV export file
      const files = fs.readdirSync('.');
      const csvFiles = files.filter((f: string) => f.startsWith('engaged-transcripts-export-') && f.endsWith('.csv'));
      
      if (csvFiles.length === 0) {
        return res.status(404).json({ error: 'No export file found' });
      }
      
      // Sort by filename (which includes timestamp) and get the most recent
      csvFiles.sort().reverse();
      const latestFile = csvFiles[0];
      
      res.download(latestFile, 'engaged-transcripts.csv', (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).json({ error: 'Failed to download file' });
        }
      });
    } catch (error) {
      console.error('Error serving CSV:', error);
      res.status(500).json({ error: 'Failed to serve CSV file' });
    }
  });

  // Lead magnet generation endpoint
  app.post('/api/lead-magnet/generate', async (req, res) => {
    try {
      const { transcriptId } = req.body;
      let messages: any[] = [];

      // If a transcript ID is provided, get the messages from that transcript
      if (transcriptId) {
        try {
          const transcript = await transcriptStorage.getTranscript(parseInt(transcriptId));
          if (transcript) {
            messages = transcript.messages;
          }
        } catch (error) {
          console.warn('Could not find transcript:', transcriptId);
          // Continue with empty messages if transcript not found
        }
      }

      // Generate the lead magnet prompt
      const leadMagnetPrompt = await leadMagnetService.generateLeadMagnetPrompt(messages);

      res.json({ prompt: leadMagnetPrompt });
    } catch (error) {
      console.error('Error generating lead magnet:', error);
      res.status(500).json({ error: 'Failed to generate lead magnet' });
    }
  });

  // Knowledge gap flag endpoint - flag incorrect information in transcripts
  app.post('/api/admin/flag-knowledge-gap', async (req, res) => {
    try {
      const { airtableService } = await import('./services/airtableService');
      const { question, answer, note, conversationId, messageId } = req.body;

      if (!question || !answer || !conversationId || !messageId) {
        return res.status(400).json({ error: 'Question, answer, conversation ID, and message ID are required' });
      }

      const recordId = await airtableService.createKnowledgeGapRecord({
        question,
        answer,
        note: note || '',
        conversationId,
        messageId,
        flaggedAt: new Date().toISOString(),
      });

      if (recordId) {
        res.json({ success: true, recordId });
      } else {
        res.status(500).json({ error: 'Failed to create Airtable record' });
      }
    } catch (error) {
      console.error('Error flagging knowledge gap:', error);
      res.status(500).json({ error: 'Failed to flag knowledge gap' });
    }
  });

  // Quick note endpoint - process correction notes with AI and add to knowledge base
  app.post('/api/admin/quick-note', async (req, res) => {
    try {
      const { note, conversationId, conversationContext } = req.body;

      if (!note || !conversationId) {
        return res.status(400).json({ error: 'Note and conversation ID are required' });
      }

      // Use OpenAI to generate Q&A from the note
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_AROHA_KEY,
      });

      const systemPrompt = `You are an AI assistant helping to correct information for a wellness retreat chatbot named "Lumi" at Aro-Ha Wellness Retreat in New Zealand.

A user has submitted a quick note about incorrect information. Your job is to:
1. Extract the corrected fact from the note
2. Generate a clear question that a visitor might ask
3. Generate the correct answer that Lumi should give

The note may reference a recent conversation for context. Use this to understand what was wrong.

Respond in JSON format:
{
  "question": "The question a visitor might ask",
  "answer": "The correct answer Lumi should give"
}

Be concise and professional. The answer should be helpful and accurate, in a friendly tone suitable for a luxury wellness retreat.`;

      const userPrompt = `User's correction note: "${note}"

${conversationContext ? `Recent conversation context:\n${conversationContext}` : ''}

Generate a Q&A pair based on this correction.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      const generated = JSON.parse(responseContent);
      const { question, answer } = generated;

      if (!question || !answer) {
        throw new Error('AI did not generate valid Q&A');
      }

      // Create record in Airtable
      const { airtableService } = await import('./services/airtableService');
      const recordId = await airtableService.createKnowledgeGapRecord({
        question,
        answer,
        note,
        conversationId,
        messageId: 0,
        flaggedAt: new Date().toISOString(),
      });

      if (recordId) {
        res.json({ success: true, recordId, question, answer });
      } else {
        res.status(500).json({ error: 'Failed to create Airtable record' });
      }
    } catch (error) {
      console.error('Error processing quick note:', error);
      res.status(500).json({ error: 'Failed to process quick note' });
    }
  });

  // Lead capture endpoint
  // Note: Image handling is now done by VoiceFlow via Airtable integration
  // Images are delivered as markdown in text responses
  
  app.post('/api/leads', async (req, res) => {
    try {
      const { transcriptId, name, email, phone, retreatDate, metadata } = req.body;

      if (!transcriptId || !name || !email) {
        return res.status(400).json({ error: 'Transcript ID, name, and email are required' });
      }

      // Create lead in our database
      const leadId = await leadService.createLead(
        parseInt(transcriptId),
        name,
        email,
        phone,
        metadata
      );

      // Also create lead in Airtable
      try {
        const { airtableService } = await import('./services/airtableService');

        // Split name into first and last name
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Get transcript to include any retreat date mentions in notes
        const transcript = await transcriptStorage.getTranscript(parseInt(transcriptId));
        const notes = transcript ? 
          `Lead from chat widget. Recent conversation: ${transcript.messages.slice(-3).map(m => m.content).join(' | ')}` :
          'Lead from chat widget';

        // Get full conversation transcript with proper guest name, excluding image messages
        const fullTranscript = transcript ? 
          transcript.messages
            .filter(m => m.messageType !== 'image') // Exclude image messages
            .map(m => {
              const displayRole = m.role === 'user' ? name : m.role;
              return `${displayRole}: ${m.content}`;
            }).join('\n') :
          'No transcript available';

        // Create Airtable record
        await airtableService.createLeadRecord({
          firstName,
          lastName,
          email,
          phone,
          retreatDate: retreatDate || '',
          notes: fullTranscript // Pass full transcript as notes
        });
      } catch (error) {
        console.error('Error creating Airtable record:', error);
        // We'll still return success even if Airtable fails
      }

      res.json({ leadId });
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });

  // Webhook endpoint for conversation ID notifications
  app.post('/api/webhook/conversation-id', (req, res) => {
    try {
      const { type, conversationId, timestamp, source } = req.body;
      
      console.log('Webhook notification received:', {
        type,
        conversationId,
        timestamp,
        source
      });
      
      // Here you can add any processing logic for the conversation ID
      // For example:
      // - Store it in a database
      // - Send it to another service
      // - Trigger additional workflows
      
      res.json({ 
        success: true, 
        message: 'Conversation ID received successfully',
        conversationId 
      });
    } catch (error) {
      console.error('Error processing conversation ID webhook:', error);
      res.status(500).json({ error: 'Failed to process conversation ID' });
    }
  });

  // Widget script endpoint - serves the latest widget implementation
  app.get('/widget-script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const widgetScript = `/**
 * Aro-Ha AI Assistant Widget - Bug-Fixed Toggling Embed
 * 
 * Features:
 * 1. Fixed reopening bug - properly shows/hides on all clicks
 * 2. Uses modern CSS custom properties for perfect viewport fit
 * 3. Properly handles microphone permissions
 * 4. Correctly manages visibility state on each transition
 */
(function() {
  // Prevent multiple instances
  if (window.aroHaWidgetLoaded) return;
  window.aroHaWidgetLoaded = true;

  // Create and inject CSS
  const style = document.createElement('style');
  style.textContent = \`
    /* Widget Styles */
    :root {
      --aro-primary: #8E8F70;
      --aro-button-size: 60px;
      --app-height: 100vh;
    }
    
    .aro-chat-button {
      position: fixed;
      bottom: max(20px, env(safe-area-inset-bottom, 20px));
      right: 20px;
      width: var(--aro-button-size);
      height: var(--aro-button-size);
      border-radius: 50%;
      background-color: var(--aro-primary);
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.8);
    }
    
    .aro-chat-button svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    
    /* Overlay for mobile only */
    .aro-chat-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: 9997;
      display: none;
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
    }
    
    /* Base chat container styles */
    .aro-chat-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      height: 580px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 5px 40px rgba(0,0,0,0.16);
      z-index: 9998;
      display: none;
    }
    
    .aro-chat-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    /* Permission Dialog Styles */
    .aro-permission-dialog {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 5px 40px rgba(0,0,0,0.16);
      z-index: 10000;
      display: none;
      padding: 20px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .aro-permission-dialog h3 {
      margin-top: 0;
      color: var(--aro-primary);
    }
    
    .aro-permission-dialog p {
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .aro-permission-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    
    .aro-permission-button {
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      border: none;
    }
    
    .aro-permission-button.primary {
      background-color: var(--aro-primary);
      color: white;
    }
    
    .aro-permission-button.secondary {
      background-color: #f1f1f1;
      color: #333;
    }
    
    /* Mobile-specific styles with safe area insets */
    @media (max-width: 768px) {
      .aro-chat-container {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 0;
        margin: 0;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      
      /* Mobile scroll lock */
      body.aro-mobile-widget-open {
        overflow: hidden !important;
        position: fixed !important;
        width: 100% !important;
        height: 100% !important;
      }
      
      .aro-permission-dialog {
        width: 90%;
        max-width: 400px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        right: auto;
        bottom: auto;
      }
    }
  \`;
  document.head.appendChild(style);

  // Add viewport meta tag with viewport-fit=cover for notch/safe areas
  if (!document.querySelector('meta[name="viewport"]')) {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';
    document.head.appendChild(viewportMeta);
  } else {
    // Update existing viewport tag if necessary
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (!existingViewport.content.includes('viewport-fit=cover')) {
      existingViewport.content += ', viewport-fit=cover';
    }
  }

  // Update viewport height CSS variable
  function updateViewportHeight() {
    document.documentElement.style.setProperty('--app-height', \`\${window.innerHeight}px\`);
  }

  // Create chat button
  const chatButton = document.createElement('div');
  chatButton.className = 'aro-chat-button';
  chatButton.id = 'aroChatButton';
  chatButton.innerHTML = \`
    <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  \`;
  document.body.appendChild(chatButton);

  // Create overlay
  const chatOverlay = document.createElement('div');
  chatOverlay.className = 'aro-chat-overlay';
  chatOverlay.id = 'aroChatOverlay';
  document.body.appendChild(chatOverlay);

  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'aro-chat-container';
  chatContainer.id = 'aroChatContainer';
  document.body.appendChild(chatContainer);

  // Create permission dialog
  const permissionDialog = document.createElement('div');
  permissionDialog.className = 'aro-permission-dialog';
  permissionDialog.id = 'aroPermissionDialog';
  permissionDialog.innerHTML = \`
    <h3>Microphone Access Required</h3>
    <p>To use voice features in our chat, your browser needs permission to access your microphone. When prompted, please select "Allow" to enable voice interactions.</p>
    <div class="aro-permission-actions">
      <button id="aroPermissionCancel" class="aro-permission-button secondary">Cancel</button>
      <button id="aroPermissionAllow" class="aro-permission-button primary">Allow Microphone</button>
    </div>
  \`;
  document.body.appendChild(permissionDialog);

  // State management
  let micPermissionState = null;
  let iframeCreated = false;
  let isMobile = false;
  let originalScrollPosition = 0;
  let widgetVisible = false; // Track widget visibility state
  
  // Simple mobile detection
  function detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  // Toggle scrolling prevention (only on mobile)
  function toggleMobileScrollLock(lock) {
    if (!isMobile) return; // Only apply on mobile
    
    if (lock) {
      originalScrollPosition = window.scrollY;
      document.body.classList.add('aro-mobile-widget-open');
      document.body.style.top = \`-\${originalScrollPosition}px\`;
    } else {
      document.body.classList.remove('aro-mobile-widget-open');
      document.body.style.top = '';
      window.scrollTo(0, originalScrollPosition);
    }
  }

  // Check if microphone is already permitted
  async function checkMicrophonePermission() {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      return permissionStatus.state;
    } catch (error) {
      console.log('Could not check permission state:', error);
      return 'unknown';
    }
  }

  // Request microphone permission
  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return 'granted';
    } catch (error) {
      console.log('Microphone permission denied:', error);
      return 'denied';
    }
  }

  // Create iframe once
  function createChatIframe() {
    if (iframeCreated) return;
    
    // Clear container first
    chatContainer.innerHTML = '';
    
    // Create the iframe
    const chatIframe = document.createElement('iframe');
    chatIframe.src = 'https://da5418fc-3ce4-4f52-ab1c-e7add5b46e9d-00-fuu7g97oviit.riker.replit.dev/widget-only';
    chatIframe.title = 'Aro Ha Chat';
    chatIframe.allow = 'microphone; autoplay';
    chatIframe.style.width = '100%';
    chatIframe.style.height = '100%';
    chatIframe.style.border = 'none';
    
    // Add iframe to container
    chatContainer.appendChild(chatIframe);
    iframeCreated = true;
  }

  // Show chat widget - guaranteed to work every time
  function showChat() {
    updateViewportHeight();
    toggleMobileScrollLock(true);
    
    // Explicitly set visibility state to track
    widgetVisible = true;

    // First hide the button
    chatButton.style.display = 'none';
    
    // Remove any previous display: none that may have been set
    chatContainer.style.removeProperty('display');
    
    // Then explicitly set to block to ensure visibility
    chatContainer.style.display = 'block';
    
    if (isMobile) {
      chatOverlay.style.display = 'block';
    }
    
    // Create iframe if not created
    createChatIframe();
  }

  // Hide chat widget - guaranteed to work every time
  function hideChat() {
    // Explicitly set visibility state to track
    widgetVisible = false;
    
    // First hide widget and overlay
    chatContainer.style.display = 'none';
    chatOverlay.style.display = 'none';
    
    // Release scroll lock
    toggleMobileScrollLock(false);
    
    // Re-enable the chat button
    chatButton.style.removeProperty('display');
    chatButton.style.display = 'flex';
  }

  // Show permission dialog
  function showPermissionDialog() {
    toggleMobileScrollLock(true);
    
    chatButton.style.display = 'none';
    permissionDialog.style.display = 'block';
    
    if (isMobile) {
      chatOverlay.style.display = 'block';
    }
  }

  // Hide permission dialog
  function hidePermissionDialog() {
    permissionDialog.style.display = 'none';
  }

  // Initialize
  async function initialize() {
    isMobile = detectMobile();
    micPermissionState = await checkMicrophonePermission();
    updateViewportHeight();
    
    // Overlay click handler
    chatOverlay.addEventListener('click', function(e) {
      if (e.target === chatOverlay) {
        hideChat();
      }
    });
    
    // Chat button click handler - toggle behavior
    chatButton.addEventListener('click', async function() {
      if (micPermissionState === 'granted') {
        showChat();
      } else {
        showPermissionDialog();
      }
    });
    
    // Permission dialog buttons
    document.getElementById('aroPermissionAllow').addEventListener('click', async function() {
      micPermissionState = await requestMicrophonePermission();
      
      hidePermissionDialog();
      
      if (micPermissionState === 'granted') {
        showChat();
      } else {
        alert('Microphone permission was denied. Voice features will not work. You can change this in your browser settings.');
        showChat();
      }
    });
    
    document.getElementById('aroPermissionCancel').addEventListener('click', function() {
      hidePermissionDialog();
      showChat();
    });
    
    // Listen for close message from iframe
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'widget-close') {
        hideChat();
      }
      
      // Voice call starting
      if (event.data && event.data.type === 'voice-call-starting') {
        if (micPermissionState !== 'granted') {
          requestMicrophonePermission().then(state => {
            micPermissionState = state;
            const iframe = document.querySelector('.aro-chat-container iframe');
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'mic-permission-update', state: micPermissionState }, '*');
            }
          });
        }
      }
    });
    
    // Window resize handler for viewport height
    window.addEventListener('resize', function() {
      isMobile = detectMobile();
      updateViewportHeight();
    });
    
    // Handle orientation changes specifically
    window.addEventListener('orientationchange', function() {
      setTimeout(function() {
        updateViewportHeight();
      }, 200);
    });
    
    // Fix for keyboard open/close on mobile
    if (isMobile && window.visualViewport) {
      window.visualViewport.addEventListener('resize', function() {
        updateViewportHeight();
      });
    }
    
    // Keyboard escape key to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && widgetVisible) {
        hideChat();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();`;

    res.send(widgetScript);
  });

  // Simple embed loader endpoint
  app.get('/embed.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const embedScript = `/**
 * Aro-Ha AI Assistant Widget Embed Loader
 * 
 * Simple embed script that loads the latest widget implementation
 * from the Aro-Ha servers. This ensures automatic updates.
 * 
 * Usage: Add this script tag to your website:
 * <script src="https://da5418fc-3ce4-4f52-ab1c-e7add5b46e9d-00-fuu7g97oviit.riker.replit.dev/embed.js"></script>
 */
(function() {
  // Prevent loading multiple times
  if (window.aroHaEmbedLoaded) return;
  window.aroHaEmbedLoaded = true;

  // Create script element to load the main widget
  const script = document.createElement('script');
  script.src = 'https://da5418fc-3ce4-4f52-ab1c-e7add5b46e9d-00-fuu7g97oviit.riker.replit.dev/widget-script.js';
  script.async = true;
  script.defer = true;
  
  // Add error handling
  script.onerror = function() {
    console.error('Failed to load Aro-Ha widget script');
  };
  
  script.onload = function() {
    console.log('Aro-Ha widget loaded successfully');
  };
  
  // Append to document head
  document.head.appendChild(script);
})();`;

    res.send(embedScript);
  });

  // Serve static assets from the client/public directory
  app.use('/assets', express.static(path.join(process.cwd(), 'client/public/assets')));

  // Serve HTML files from client/public directory
  app.use(express.static(path.join(process.cwd(), 'client/public')));

  const httpServer = createServer(app);

  return httpServer;
}