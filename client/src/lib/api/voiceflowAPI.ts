import axios from 'axios';

// Types for Voiceflow responses and requests
export interface VoiceflowMessage {
  type: string;
  payload: {
    message?: string;
    text?: string;
    buttons?: Array<{ name: string; request: { type: string; payload: any } }>;
    visual?: any;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface VoiceflowResponse {
  messages?: VoiceflowMessage[];
  sessionID?: string;
  [key: string]: any;
}

export interface VoiceflowConfig {
  apiKey: string;
  projectId: string;
  versionId: string;
}

interface UserConfig {
  userID?: string;
  sessionID?: string;
}

// Voiceflow Dialog API service
export class VoiceflowAPIService {
  private apiKey: string;
  private baseURL: string;
  private versionID: string;
  private projectID: string;
  private userID: string;
  private sessionID: string | null;
  private isConfigLoaded: boolean;

  constructor(
    config?: UserConfig
  ) {
    // Initialize with default values
    this.apiKey = '';
    this.baseURL = 'https://general-runtime.voiceflow.com';
    this.projectID = '';
    this.versionID = 'production';
    this.isConfigLoaded = false;

    // Set user-specific data
    this.userID = config?.userID || `user-${Math.random().toString(36).substring(2, 9)}`;
    this.sessionID = config?.sessionID || null;

    // Load config when instantiated
    this.loadConfig();
  }

  // Load configuration from server
  private async loadConfig(): Promise<void> {
    try {
      const response = await axios.get('/api/config');
      const config = response.data.voiceflow;

      this.apiKey = config.apiKey;
      this.projectID = config.projectId;
      this.versionID = config.versionId;

      this.isConfigLoaded = true;
    } catch (error) {
      console.error('Error loading Voiceflow configuration:', error);
    }
  }

  // Get the user ID
  getUserID(): string {
    return this.userID;
  }

  // Ensure config is loaded before making API calls
  private async ensureConfigLoaded(): Promise<void> {
    if (!this.isConfigLoaded) {
      await this.loadConfig();
    }

    if (!this.apiKey) {
      throw new Error('Voiceflow API key not available. Please check your server configuration.');
    }
  }

  // Initialize a conversation with Voiceflow
  async startConversation(): Promise<VoiceflowResponse> {
    try {
      await this.ensureConfigLoaded();

      console.log('Starting Voiceflow conversation with config:', {
        endpoint: `${this.baseURL}/state/user/${this.userID}/interact`,
        projectID: this.projectID,
        versionID: this.versionID
      });

      const response = await axios.post(
        `${this.baseURL}/state/user/${this.userID}/interact`,
        {
          action: { type: 'launch' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
            versionID: this.versionID,
            projectID: this.projectID
          }
        }
      );

      console.log('Voiceflow start conversation response:', response.data);

      // Set the session ID if returned from API
      if (response.data.sessionID) {
        this.sessionID = response.data.sessionID;
      } else {
        // Generate a fallback session ID if none is returned
        this.sessionID = `session-${Date.now()}`;
        console.warn('No sessionID in Voiceflow response, using fallback:', this.sessionID);
      }

      // The returned data might be an array directly instead of having a messages property
      if (Array.isArray(response.data)) {
        console.log('Response data is an array, adapting format');
        // Create a proper structure for our response
        const responseData = {
          messages: response.data
        };
        response.data = responseData;
      }

      // If there are no messages in the response, add a welcome message
      if (!response.data.messages || response.data.messages.length === 0) {
        console.warn('No messages in Voiceflow start response, adding welcome message');
        response.data.messages = [
          {
            type: 'text',
            payload: {
              message: 'Hello! How can I help you today?'
            }
          }
        ];
      }

      return response.data;
    } catch (error) {
      console.error('Error starting Voiceflow conversation:', error);

      // Generate a fallback session ID
      this.sessionID = `session-${Date.now()}`;

      // Return a fallback response
      return {
        sessionID: this.sessionID,
        messages: [
          {
            type: 'text',
            payload: {
              message: 'Hello! How can I help you today?'
            }
          }
        ]
      };
    }
  }

  // Send a user message to Voiceflow using streaming API
  async sendMessage(message: string, onStreamMessage?: (content: string) => void): Promise<VoiceflowResponse> {
    try {
      await this.ensureConfigLoaded();

      // Check session if needed
      if (!this.sessionID) {
        const sessionCheck = await this.startConversation();
        this.sessionID = sessionCheck.sessionID || null;
      }

      // Use the new streaming endpoint
      const streamEndpoint = `${this.baseURL}/v2/project/${this.projectID}/user/${this.userID}/interact/stream`;

      console.log('Sending streaming message to Voiceflow:', {
        endpoint: streamEndpoint,
        projectID: this.projectID,
        versionID: this.versionID,
        userID: this.userID
      });

      // Create the request body
      const requestBody = {
        action: {
          type: 'text',
          payload: message
        }
      };

      // Create a fetch request for streaming
      const response = await fetch(streamEndpoint + `?environment=${this.versionID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Voiceflow streaming API returned ${response.status}: ${response.statusText}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const traces: any[] = [];
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                traces.push(data);
                
                // Handle different types of streaming data
                if (data.type === 'text' && data.payload?.message) {
                  console.log('Streaming text message:', data.payload.message);
                  
                  // If streaming callback is provided, call it immediately
                  if (onStreamMessage) {
                    onStreamMessage(data.payload.message);
                  } else {
                    accumulatedContent += data.payload.message + ' ';
                  }
                } else if (data.type === 'text' && data.payload?.slate) {
                  // Handle slate content format
                  const slateContent = data.payload.slate.content
                    ?.map((content: any) => {
                      if (content.children) {
                        return content.children
                          .map((child: any) => child.text || '')
                          .join(' ')
                          .trim();
                      }
                      return '';
                    })
                    .filter((text: string) => text.length > 0)
                    .join('\n\n');
                  
                  if (slateContent && onStreamMessage) {
                    console.log('Streaming slate content:', slateContent);
                    onStreamMessage(slateContent);
                  }
                } else {
                  // Log other trace types for debugging
                  console.log('Streaming trace:', data.type, data.payload);
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming data:', line);
              }
            } else if (line.startsWith('event: end')) {
              break;
            }
          }
        }
      }

      console.log('Voiceflow streaming response traces:', traces);

      // Return the response in the expected format
      return {
        messages: traces,
        traces: traces
      };

    } catch (error) {
      console.error('Error with Voiceflow streaming API:', error);
      
      // Fallback to the original non-streaming API
      return this.sendMessageFallback(message);
    }
  }

  // Fallback method using the original API
  private async sendMessageFallback(message: string): Promise<VoiceflowResponse> {
    try {
      await this.ensureConfigLoaded();

      const response = await axios.post(
        `${this.baseURL}/state/user/${this.userID}/interact`,
        {
          action: {
            type: 'text',
            payload: message
          },
          config: {
            tts: false
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
            versionID: this.versionID,
            projectID: this.projectID
          }
        }
      );

      console.log('Voiceflow fallback response:', response.data);

      if (Array.isArray(response.data)) {
        return { messages: response.data };
      }

      return response.data;
    } catch (error) {
      console.error('Error with Voiceflow fallback API:', error);
      return { messages: [] };
    }
  }

  // Image handling moved to separate service

  // Helper to extract and normalize text from Voiceflow response
  static async extractMessages(response: VoiceflowResponse): Promise<Array<{role: 'user' | 'assistant', content: string}>> {
    const messages: Array<{role: 'user' | 'assistant', content: string}> = [];

    // Log the entire response for debugging
    console.log('Extracting messages from Voiceflow response:', response);

    // If response is an array, use it directly, otherwise check for messages property
    const messageArray = Array.isArray(response) ? response : (response.messages || []);



    // Process the array of messages
    for (const msg of messageArray) {
      // Skip path messages and no-reply messages
      if (msg.type === 'path' || msg.type === 'no-reply') {
        continue;
      }

      // Handle website_navigation (links to websites)
      if (msg.type === 'website_navigation' && msg.payload && msg.payload.url) {
        const url = msg.payload.url;
        messages.push({
          role: 'assistant',
          content: `Here's a link you might find helpful: [${url}](${url})`
        });
        continue;
      }

      // Handle visual media like images (if available)
      if (msg.type === 'visual' && msg.payload && msg.payload.image) {
        const imageUrl = msg.payload.image;
        messages.push({
          role: 'assistant',
          content: `![Image](${imageUrl})`
        });
        continue;
      }

      // Handle text messages - seems to be the typical response
      if (msg.type === 'text' && msg.payload) {
        // Try to extract message content from various possible formats
        let messageContent = '';

        // Direct message field
        if (msg.payload.message) {
          messageContent = msg.payload.message;
        } 
        // Text field
        else if (msg.payload.text) {
          messageContent = msg.payload.text;
        }
        // Slate content - this is the format Voiceflow is using in the logs
        else if (msg.payload.slate && msg.payload.slate.content) {
          // Concatenate all text from all children in the slate content
          messageContent = msg.payload.slate.content
            .map((content: any) => {
              if (content.children) {
                return content.children
                  .map((child: any) => child.text || '')
                  .join(' ')
                  .trim();
              }
              return '';
            })
            .filter((text: string) => text.length > 0)
            .join('\n\n');
        }

        // If we found content, add it as a message directly
        if (messageContent) {
          console.log('Voiceflow message:', messageContent);

          messages.push({
            role: 'assistant',
            content: messageContent
          });
        }
      }
    }

    // If no messages were found but there is response data, add a fallback message
    if (messages.length === 0) {
      console.warn('No messages extracted from Voiceflow response, adding fallback');
      messages.push({
        role: 'assistant',
        content: 'I received your message and am processing it.'
      });
    }

    return messages;
  }

  // Get current session ID
  getSessionID(): string | null {
    return this.sessionID;
  }

  // Set session ID (for restoring conversations)
  setSessionID(sessionId: string): void {
    if (sessionId && sessionId.trim()) {
      this.sessionID = sessionId;
      console.log('Session ID set to:', sessionId);
    }
  }

  // End the conversation
  async endConversation(): Promise<void> {
    if (!this.sessionID) return;

    try {
      await this.ensureConfigLoaded();

      await axios.post(
        `${this.baseURL}/state/user/${this.userID}/interact`,
        {
          action: { type: 'end' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
            versionID: this.versionID,
            projectID: this.projectID
          }
        }
      );

      this.sessionID = null;
    } catch (error) {
      console.error('Error ending Voiceflow conversation:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const voiceflowAPI = new VoiceflowAPIService();