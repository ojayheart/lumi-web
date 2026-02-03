import { Message } from '../../shared/schema';
import OpenAI from 'openai';

/**
 * Service for generating lead magnets based on conversation context
 */
export class LeadMagnetService {
  private static instance: LeadMagnetService;
  private sessionRejections: Map<string, number> = new Map();
  private sessionMessageCounts: Map<string, number> = new Map();
  private openai: OpenAI;
  
  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_AROHA_KEY
    });
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): LeadMagnetService {
    if (!LeadMagnetService.instance) {
      LeadMagnetService.instance = new LeadMagnetService();
    }
    return LeadMagnetService.instance;
  }
  
  /**
   * Record a user message to track conversation length
   */
  public trackUserMessage(sessionId: string): void {
    const currentCount = this.sessionMessageCounts.get(sessionId) || 0;
    this.sessionMessageCounts.set(sessionId, currentCount + 1);
  }
  
  /**
   * Record when a user rejects a lead magnet
   */
  public recordRejection(sessionId: string): void {
    const currentMessageCount = this.sessionMessageCounts.get(sessionId) || 0;
    this.sessionRejections.set(sessionId, currentMessageCount);
  }
  
  /**
   * Check if we can show a lead magnet based on conversation state
   */
  public canShowLeadMagnet(sessionId: string): boolean {
    const currentMessageCount = this.sessionMessageCounts.get(sessionId) || 0;
    const lastRejectionMsgCount = this.sessionRejections.get(sessionId) || 0;
    
    // Don't show if we've had less than 5 messages
    if (currentMessageCount < 5) {
      return false;
    }
    
    // Don't show if user has rejected within the last 5 messages
    if (currentMessageCount - lastRejectionMsgCount < 5) {
      return false;
    }
    
    // Only show every 2-3 messages
    if (currentMessageCount % 3 !== 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate a lead magnet prompt based on conversation
   */
  public async generateLeadMagnetPrompt(messages: Message[]): Promise<string> {
    // First, prepare a summary of the conversation
    const conversationSummary = this.prepareConversationSummary(messages);
    
    // Define the lead magnet prompt template
    const promptTemplate = `
    You are creating a simple, direct, and contextually relevant lead capture question for Aro Ha wellness retreat.

    Here is the conversation summary:
    ${conversationSummary}

    INSTRUCTIONS:
    1. Create a brief, single-sentence lead capture question that relates to the user's specific interests from the conversation
    2. Focus on what the user has been asking about (e.g., retreats, facilities, specific programs)
    3. Keep it personal and focused on helping them with their specific interest
    4. Keep your response under 15 words total
    5. Always frame it as an offer to connect with the Aro Ha team

    Example formats:
    - "Would you like to speak with someone about our [specific retreat type] options?"
    - "Can we connect you with our team to discuss [specific interest]?"
    - "Would you like more information about [specific topic] from our experts?"
    
    Do not use generic questions that don't reference the conversation context.
    `;
    
    try {
      // Call OpenAI API to generate lead magnet
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You create highly contextual, specific lead magnet questions based on conversation history."
          },
          {
            role: "user",
            content: promptTemplate
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });
      
      const content = response.choices[0]?.message?.content;
      return content ? content.trim() : 'Would you like one of our team to reach out to you?';
    } catch (error) {
      console.error('Error generating lead magnet prompt:', error);
      return 'Would you like one of our team to reach out to you?';
    }
  }
  
  /**
   * Prepare a summary of the conversation for the lead magnet prompt
   */
  private prepareConversationSummary(messages: Message[] = []): string {
    // If no messages, return generic prompt context
    if (!messages || messages.length === 0) {
      return "No conversation history available. This is a first-time visitor to our website.";
    }
    
    // For short conversations, just use the raw messages
    if (messages.length <= 10) {
      return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }
    
    // For longer conversations, use the most recent 10 messages
    const recentMessages = messages.slice(-10);
    return recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }
}

export const leadMagnetService = LeadMagnetService.getInstance();