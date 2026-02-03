import axios from 'axios';
import { Conversation } from '@11labs/client';

// Types for ElevenLabs requests and responses
export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  [key: string]: any;
}

export interface TextToSpeechRequest {
  text: string;
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface StartCallRequest {
  assistant_id: string;
  name?: string;
}

export interface ElevenlabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  assistantId: string;
}

// Conversation instance for Elevenlabs Conversational SDK
let conversationInstance: Conversation | null = null;

// ElevenLabs API service
export class ElevenlabsAPIService {
  private apiKey: string;
  private baseURL: string;
  private defaultVoiceId: string;
  private defaultModelId: string;
  private defaultCallAssistantId: string;
  private isConfigLoaded: boolean;
  private deobra_voice_id: string = 'XB0fDUnXU5powFXDhCwa'; // Deobra voice ID from ElevenLabs

  constructor() {
    // Initialize with default values
    this.apiKey = '';
    this.baseURL = 'https://api.elevenlabs.io/v1';
    this.defaultVoiceId = this.deobra_voice_id; // Set Deobra as default voice
    this.defaultModelId = 'eleven_turbo_v2';
    this.defaultCallAssistantId = '3FvBwXKJ0YFSqoIIbL07'; // Set the specific agent ID
    this.isConfigLoaded = false;
    
    // Load config when instantiated
    this.loadConfig();
  }
  
  // Initialize the ElevenLabs Conversational SDK
  async getConversation(): Promise<Conversation> {
    await this.ensureConfigLoaded();
    
    if (!conversationInstance) {
      // Use the static method to start a new conversation session
      conversationInstance = await Conversation.startSession({
        // Primary required parameter
        agentId: this.defaultCallAssistantId, // The specific agent ID
        
        // Additional configuration
        authorization: this.apiKey,
        overrides: {
          agent: {
            // Set agent parameters
            firstMessage: "Hello, I'm Deobra. How can I help you today?",
          },
          tts: {
            // Use the Deobra voice - must match the expected API structure
            voiceId: this.defaultVoiceId,
          }
        }
      });
    }
    
    return conversationInstance;
  }

  // Load configuration from server
  private async loadConfig(): Promise<void> {
    try {
      const response = await axios.get('/api/config');
      const config = response.data.elevenlabs;
      
      this.apiKey = config.apiKey;
      this.defaultVoiceId = config.voiceId;
      this.defaultModelId = config.modelId;
      this.defaultCallAssistantId = config.assistantId;
      
      this.isConfigLoaded = true;
    } catch (error) {
      console.error('Error loading ElevenLabs configuration:', error);
    }
  }

  // Ensure config is loaded before making API calls
  private async ensureConfigLoaded(): Promise<void> {
    if (!this.isConfigLoaded) {
      await this.loadConfig();
    }
    
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not available. Please check your server configuration.');
    }
  }

  // Get available voices
  async getVoices(): Promise<Voice[]> {
    try {
      await this.ensureConfigLoaded();
      
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        }
      });
      
      return response.data.voices || [];
    } catch (error) {
      console.error('Error getting ElevenLabs voices:', error);
      throw error;
    }
  }

  // Convert text to speech and get audio URL
  async textToSpeech(text: string, voiceId?: string): Promise<Blob> {
    try {
      await this.ensureConfigLoaded();
      
      const requestData: TextToSpeechRequest = {
        text,
        voice_id: voiceId || this.defaultVoiceId,
        model_id: this.defaultModelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      };
      
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${requestData.voice_id}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'blob'
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error converting text to speech with ElevenLabs:', error);
      throw error;
    }
  }
  
  // Play audio from blob
  static async playAudio(audioBlob: Blob): Promise<HTMLAudioElement> {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(audio);
      };
      
      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };
      
      audio.play().catch(reject);
    });
  }
  
  // Start a conversation with the ElevenLabs conversational AI service using the SDK
  async startCall(name?: string): Promise<string> {
    try {
      await this.ensureConfigLoaded();
      
      console.log('Starting ElevenLabs call with assistant...');
      
      try {
        // Use the Conversation SDK to start a session
        const conversation = await this.getConversation();
        
        // Generate a unique call ID for reference
        const callId = `sdk-call-${Date.now()}`;
        
        console.log('ElevenLabs conversation started successfully');
        return callId;
      } catch (sdkError) {
        console.error('Error starting ElevenLabs conversation:', sdkError);
        
        // Fall back to direct API if SDK fails
        try {
          const response = await axios.post(
            `${this.baseURL}/call`, 
            {
              assistant_id: this.defaultCallAssistantId,
              name: name || 'Website visitor'
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey
              }
            }
          );
          
          console.log('ElevenLabs call response:', response.data);
          return response.data.call_id || `call-${Date.now()}`;
        } catch (apiError: any) {
          console.error('Error starting ElevenLabs conversational call. API returned:', apiError.response?.data || apiError.message);
          
          // If all methods fail, fall back to a local implementation
          console.warn('Falling back to text-to-speech implementation for voice mode');
          
          // Generate a synthetic call ID and handle voice locally through text-to-speech
          const callId = `local-call-${Date.now()}`;
          
          // Generate a welcome message using text-to-speech
          const welcomeText = "Voice mode activated. How can I help you today?";
          const audioBlob = await this.textToSpeech(welcomeText);
          await ElevenlabsAPIService.playAudio(audioBlob);
          
          return callId;
        }
      }
    } catch (error) {
      console.error('Error starting voice mode:', error);
      throw error;
    }
  }
  
  // End an active conversation
  async endCall(callId: string): Promise<void> {
    try {
      await this.ensureConfigLoaded();
      
      // For local calls, we don't need to make an API request
      if (callId.startsWith('local-call-')) {
        console.log('Ending local voice call simulation');
        return;
      }
      
      console.log('Ending ElevenLabs call:', callId);
      
      // If we have an active SDK conversation, end it
      if (conversationInstance && callId.startsWith('sdk-call-')) {
        try {
          await conversationInstance.endSession();
          conversationInstance = null;
          console.log('Successfully ended ElevenLabs conversation via SDK');
          return;
        } catch (sdkError) {
          console.error('Error ending conversation via SDK:', sdkError);
        }
      }
      
      // Fall back to direct API call if needed
      try {
        await axios.post(
          `${this.baseURL}/call/${callId}/end`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': this.apiKey
            }
          }
        );
        console.log('Successfully ended ElevenLabs call via API');
      } catch (endError: any) {
        console.warn('Could not end call via API, but continuing anyway:', endError.response?.data || endError.message);
      }
    } catch (error) {
      console.error('Error ending voice mode:', error);
      // Don't throw the error so we don't prevent cleanup
    }
  }
  
  // Speech to text conversion using ElevenLabs API
  async speechToText(audioBlob: Blob): Promise<string> {
    try {
      await this.ensureConfigLoaded();
      
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Optional parameters
      formData.append('model_id', 'speech-recognition');
      
      // Send the request to ElevenLabs speech-to-text API
      const response = await axios.post(
        `${this.baseURL}/speech-to-text`,
        formData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('ElevenLabs speech-to-text response:', response.data);
      
      // Return the transcribed text
      return response.data.text || '';
    } catch (error) {
      console.error('Error with ElevenLabs speech-to-text:', error);
      
      // If the API key is not set or the API isn't available,
      // fall back to the browser's built-in speech recognition
      try {
        console.log('Falling back to browser speech recognition');
        return await this.fallbackBrowserSpeechRecognition(audioBlob);
      } catch (fallbackError) {
        console.error('Fallback speech recognition also failed:', fallbackError);
        throw error; // Throw the original error if fallback also fails
      }
    }
  }
  
  // Fallback to browser's built-in speech recognition if ElevenLabs is not available
  private async fallbackBrowserSpeechRecognition(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if SpeechRecognition is available
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        reject(new Error('Speech recognition is not supported in this browser'));
        return;
      }
      
      console.log('Using direct browser speech recognition fallback');
      
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      // Set up event handlers
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Browser speech recognition result:', transcript);
        
        // Stop recognition
        recognition.stop();
        
        // Return the transcribed text
        resolve(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      // Start recognition immediately without playing back the audio
      recognition.start();
      
      // Safety timeout (5 seconds)
      setTimeout(() => {
        if (recognition) {
          recognition.stop();
          // Instead of rejecting with error, resolve with empty string
          // This avoids showing error messages for timeouts
          resolve('');
        }
      }, 5000);
    });
  }
}

// Create a singleton instance
export const elevenlabsAPI = new ElevenlabsAPIService();