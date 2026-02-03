/**
 * API client for interacting with the transcript recording service
 */
export class TranscriptAPIService {
  private static instance: TranscriptAPIService;
  private activeTranscriptId: number | null = null;
  private sessionId: string | null = null;
  
  private constructor() {
    // Always try to restore existing session ID from localStorage first
    const storedSessionId = localStorage.getItem('transcript_session_id');
    
    if (storedSessionId) {
      // Always reuse existing session ID if available
      this.sessionId = storedSessionId;
      console.log('Restored existing session ID:', this.sessionId);
    } else {
      // Only generate new session ID if none exists at all
      this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      localStorage.setItem('transcript_session_id', this.sessionId);
      console.log('Created new session ID:', this.sessionId);
    }
  }
  
  /**
   * Record lead information in the transcript
   */
  async recordLeadInfo(transcriptId: number, leadInfo: {
    name: string;
    email: string;
    phone?: string;
    retreatDate?: string;
  }): Promise<boolean> {
    try {
      // Use existing lead service API
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcriptId,
          ...leadInfo
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error recording lead information:', error);
      return false;
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TranscriptAPIService {
    if (!TranscriptAPIService.instance) {
      TranscriptAPIService.instance = new TranscriptAPIService();
    }
    return TranscriptAPIService.instance;
  }
  
  /**
   * Set or update the session ID
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem('transcript_session_id', sessionId);
  }
  
  /**
   * Start recording a new conversation
   */
  async startConversation(source: 'voiceflow' | 'elevenlabs' | 'widget', channel?: 'voice' | 'text'): Promise<number> {
    try {
      // Get browser and device info for analytics
      const userAgent = navigator.userAgent;
      const referrer = document.referrer || window.location.href;
      
      const response = await fetch('/api/transcripts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          source,
          channel: channel || 'text',
          metadata: {
            userAgent,
            deviceInfo: navigator.platform,
            referrer,
            embedSite: document.location.hostname
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.activeTranscriptId = data.transcriptId;
      
      return data.transcriptId;
    } catch (error) {
      console.error('Error starting conversation recording:', error);
      return 0; // Return 0 to indicate failure
    }
  }
  
  /**
   * Record a message in the conversation
   */
  async recordMessage(
    role: 'user' | 'assistant',
    content: string,
    messageType: 'text' | 'voice' = 'text',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.activeTranscriptId) {
      console.log('No active transcript. Starting one...');
      const transcriptId = await this.startConversation('widget');
      if (!transcriptId) {
        console.error('Failed to start transcript recording');
        return false;
      }
    }
    
    try {
      const response = await fetch(`/api/transcripts/${this.activeTranscriptId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role,
          content,
          messageType,
          metadata
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error recording message:', error);
      return false;
    }
  }
  
  /**
   * Update external platform IDs for cross-referencing in ElevenLabs/Voiceflow dashboards
   */
  async updateExternalIds(updates: {
    elevenlabsConversationId?: string;
    voiceflowSessionId?: string;
  }): Promise<boolean> {
    if (!this.activeTranscriptId) {
      console.warn('No active transcript to update external IDs');
      return false;
    }
    
    try {
      const response = await fetch(`/api/transcripts/${this.activeTranscriptId}/external-ids`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      console.log('Updated external IDs:', updates);
      return true;
    } catch (error) {
      console.error('Error updating external IDs:', error);
      return false;
    }
  }

  /**
   * End the current conversation
   */
  async endConversation(): Promise<boolean> {
    if (!this.activeTranscriptId) {
      return false;
    }
    
    try {
      const response = await fetch(`/api/transcripts/${this.activeTranscriptId}/end`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      this.activeTranscriptId = null;
      return true;
    } catch (error) {
      console.error('Error ending conversation recording:', error);
      return false;
    }
  }

  /**
   * Reset session data - used when conversations are cleared
   */
  resetSession(): void {
    this.activeTranscriptId = null;
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('transcript_session_id', this.sessionId);
    console.log('Reset session with new ID:', this.sessionId);
  }

  /**
   * Get the current active transcript ID
   */
  getActiveTranscriptId(): number | null {
    return this.activeTranscriptId;
  }
}

// Export singleton instance
export const transcriptAPI = TranscriptAPIService.getInstance();