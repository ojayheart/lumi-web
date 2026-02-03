/**
 * API client for interacting with the lead magnet and lead capture service
 */
export class LeadMagnetAPIService {
  private static instance: LeadMagnetAPIService;
  private lastPromptTime: number = 0;
  private isNewChat: boolean = true;
  private messageCount: number = 0;
  private readonly INACTIVITY_THRESHOLD_MS = 45 * 1000; // 45 seconds of inactivity before showing lead magnet
  private readonly LEAD_MAGNET_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between lead magnets
  private readonly MIN_MESSAGES_REQUIRED = 2; // Minimum number of messages required before showing lead magnet

  private constructor() {
    // Initialize with the last prompt time from localStorage if available
    const lastPromptTimeStr = localStorage.getItem("lead_magnet_last_shown");
    if (lastPromptTimeStr) {
      this.lastPromptTime = parseInt(lastPromptTimeStr, 10);
    }

    // Set new chat flag
    this.isNewChat = true;
    this.messageCount = 0;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LeadMagnetAPIService {
    if (!LeadMagnetAPIService.instance) {
      LeadMagnetAPIService.instance = new LeadMagnetAPIService();
    }
    return LeadMagnetAPIService.instance;
  }

  /**
   * Mark the start of a new chat session
   */
  public startNewChat(): void {
    this.isNewChat = true;
    this.messageCount = 0;
    console.log("Lead magnet system: New chat started");
  }

  /**
   * Track when a message is added to the chat
   */
  public trackMessage(): void {
    this.messageCount++;

    // After a certain number of messages, no longer consider this a new chat
    if (this.messageCount >= this.MIN_MESSAGES_REQUIRED) {
      this.isNewChat = false;
    }

    console.log(
      `Lead magnet system: Message tracked, count: ${this.messageCount}, isNewChat: ${this.isNewChat}`,
    );
  }

  /**
   * Check if it's appropriate to show a lead magnet based on inactivity and cooldown
   */
  public shouldShowLeadMagnet(params: { messageCount?: number, isNewChat?: boolean, inactiveTime?: number } | Date): boolean {
    const now = Date.now();
    let inactiveTime: number;
    let messageCount: number = this.messageCount;
    
    // Handle both parameter types for backward compatibility
    if (params instanceof Date) {
      // Original implementation accepting just a Date
      inactiveTime = now - params.getTime();
    } else {
      // Updated implementation accepting an object with parameters
      // Override local tracking with passed parameters if provided
      if (params.isNewChat !== undefined) {
        this.isNewChat = params.isNewChat;
      }
      
      if (params.messageCount !== undefined) {
        messageCount = params.messageCount;
      }
      
      inactiveTime = params.inactiveTime || 0;
    }

    // Ensure the user has sent at least one message before showing lead magnet
    // Count both our internal message count and the passed parameter to be safe
    if (this.isNewChat || this.messageCount < this.MIN_MESSAGES_REQUIRED || messageCount < 1) {
      console.log("Lead magnet check: Not enough messages or new chat", {
        isNewChat: this.isNewChat,
        messageCount: messageCount,
        required: this.MIN_MESSAGES_REQUIRED,
      });
      return false;
    }

    // Don't show if we've shown one recently (cooldown period)
    if (now - this.lastPromptTime < this.LEAD_MAGNET_COOLDOWN_MS) {
      console.log("Lead magnet check: Still in cooldown period");
      return false;
    }

    // Check inactivity - show if user has been inactive for the threshold time
    const shouldShow = inactiveTime >= this.INACTIVITY_THRESHOLD_MS;
    console.log("Lead magnet check: Inactivity check", {
      inactiveTime,
      threshold: this.INACTIVITY_THRESHOLD_MS,
      shouldShow,
    });
    return shouldShow;
  }

  /**
   * Generate a lead magnet prompt based on conversation
   */
  public async generateLeadMagnetPrompt(transcriptId?: number): Promise<string> {
    try {
      const response = await fetch("/api/lead-magnet/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcriptId: transcriptId || null }),
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Update the last prompt time
      this.lastPromptTime = Date.now();
      localStorage.setItem(
        "lead_magnet_last_shown",
        this.lastPromptTime.toString(),
      );

      return data.prompt;
    } catch (error) {
      console.error("Error generating lead magnet prompt:", error);
      // Provide a contextual fallback based on recent activity
      return "Would you like to speak with our wellness experts about planning your retreat?";
    }
  }

  /**
   * Submit lead information
   */
  public async submitLead(
    transcriptId: number,
    name: string,
    email: string,
    phone?: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      // Extract retreatDate from metadata if it exists
      let retreatDate = metadata?.retreatDate || null;

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptId,
          name,
          email,
          phone,
          retreatDate,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
      }

      return true;
    } catch (error) {
      console.error("Error submitting lead:", error);
      return false;
    }
  }
}

// Export singleton instance
export const leadMagnetAPI = LeadMagnetAPIService.getInstance();
