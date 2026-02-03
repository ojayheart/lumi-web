import { transcriptStorage } from '../storage';
import { NewTranscript, NewMessage } from '../../shared/schema';
import { OpenAI } from 'openai';

/**
 * Service layer for transcript management with additional logic
 */
export class TranscriptService {
  private openai: OpenAI | null = null;

  constructor() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_AROHA_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_AROHA_KEY
      });
    }
  }

  /**
   * Start tracking a new conversation or return existing one based on IP address
   */
  async startConversation(sessionId: string, source: string, metadata?: Record<string, any>, ipAddress?: string, channel?: string): Promise<{ transcriptId: number, isNewSession: boolean }> {
    try {
      const clientIpAddress = ipAddress || 'unknown';
      
      // Check if a recent transcript already exists for this IP address
      const existingTranscript = await transcriptStorage.findRecentTranscriptByIpAddress(clientIpAddress);
      
      if (existingTranscript) {
        console.log(`Found existing transcript ${existingTranscript.id} for IP ${clientIpAddress}`);
        return { transcriptId: existingTranscript.id, isNewSession: false };
      }

      // Create a new transcript only if none exists for this IP
      const newTranscript: NewTranscript = {
        sessionId,
        source,
        channel: channel || 'text',
        ipAddress: clientIpAddress,
        startTime: new Date(),
        metadata: metadata || {}
      };
      
      const transcriptId = await transcriptStorage.createTranscript(newTranscript);
      console.log(`Created new transcript ${transcriptId} for IP ${clientIpAddress} (channel: ${channel || 'text'})`);
      return { transcriptId, isNewSession: true };
    } catch (error) {
      console.error('Error starting conversation tracking:', error);
      throw error;
    }
  }

  /**
   * Record a message in the conversation
   */
  async recordMessage(
    transcriptId: number, 
    role: 'user' | 'assistant', 
    content: string,
    messageType: 'text' | 'voice' = 'text',
    metadata?: Record<string, any>
  ): Promise<number> {
    try {
      // Get the formatted role name
      let displayRole = role === 'assistant' ? 'Lumi' : 'Guest';
      
      // If metadata contains a name and it's a user message, use that
      if (role === 'user' && metadata?.name) {
        displayRole = metadata.name;
      }

      const newMessage: NewMessage = {
        transcriptId,
        role: displayRole, // Use the formatted role name
        content,
        timestamp: new Date(),
        messageType,
        metadata: metadata || {}
      };
      
      return await transcriptStorage.addMessage(newMessage);
    } catch (error) {
      console.error('Error recording message:', error);
      throw error;
    }
  }

  /**
   * Check if this would be the first user message in a transcript
   */
  async isFirstUserMessage(transcriptId: number): Promise<boolean> {
    try {
      const transcript = await transcriptStorage.getTranscript(transcriptId);
      if (!transcript) {
        return false;
      }

      // Check if there are any existing user messages
      const userMessages = transcript.messages?.filter(msg => 
        msg.role === 'user' || msg.role === 'Guest'
      ) || [];
      
      return userMessages.length === 0;
    } catch (error) {
      console.error('Error checking first user message:', error);
      return false;
    }
  }

  /**
   * End a conversation and generate a summary
   */
  async endConversation(transcriptId: number): Promise<void> {
    try {
      // Get the full transcript with messages
      const transcriptData = await transcriptStorage.getTranscript(transcriptId);
      if (!transcriptData) {
        throw new Error(`Transcript with ID ${transcriptId} not found`);
      }

      // Generate a summary if OpenAI is available
      let summary: string | undefined;
      if (this.openai && transcriptData.messages.length > 0) {
        summary = await this.generateConversationSummary(transcriptData.messages);
      }

      // Mark transcript as complete
      await transcriptStorage.completeTranscript(transcriptId, summary);
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  /**
   * Generate a summary of the conversation using OpenAI
   */
  private async generateConversationSummary(messages: Array<any>): Promise<string> {
    if (!this.openai) {
      return 'Summary not available (OpenAI API key not configured)';
    }

    try {
      // Format the conversation for OpenAI
      const formattedConversation = messages.map(msg => {
        return `${msg.role}: ${msg.content}`;
      }).join('\n');

      // Ask OpenAI to summarize the conversation
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes conversations. Provide a concise summary of the key points discussed, questions asked, and resolutions provided.'
          },
          {
            role: 'user',
            content: `Please summarize the following conversation in 3-5 bullet points:\n\n${formattedConversation}`
          }
        ],
        max_tokens: 250
      });

      return response.choices[0].message.content || 'Summary generation failed';
    } catch (error) {
      console.error('Error generating conversation summary:', error);
      return 'Error generating summary';
    }
  }



  /**
   * Get usage statistics for a given date range
   */
  async getUsageStatistics(startDate: Date, endDate: Date): Promise<{
    totalConversations: number;
    averageMessagesPerConversation?: number;
    messagesByType?: Record<string, number>;
  }> {
    try {
      // Get total conversation count
      const totalConversations = await transcriptStorage.getTranscriptCountByDate(startDate, endDate);
      
      // TODO: Implement more detailed analytics
      
      return {
        totalConversations,
      };
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const transcriptService = new TranscriptService();