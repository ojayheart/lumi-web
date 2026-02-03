import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useRef } from 'react';
import { voiceflowAPI, VoiceflowResponse, VoiceflowAPIService } from '../lib/api/voiceflowAPI';
import { elevenlabsAPI, ElevenlabsAPIService } from '../lib/api/elevenlabsAPI';
import { transcriptAPI } from '../api/transcriptAPI';
import { leadMagnetAPI } from '../api/leadMagnetAPI';

// Local storage keys
const STORAGE_KEYS = {
  MESSAGES: 'aro-ha-messages',
  SESSION_ID: 'aro-ha-session-id',
  LAST_INTERACTION: 'aro-ha-last-interaction'
};

// Define message type
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | any; // Support both string and object content for images
  timestamp: Date;
  messageType?: 'text' | 'voice' | 'images' | 'html'; // Add messageType field
  metadata?: any;
}

// Define chat state
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isCallActive: boolean;
  callId: string | null;
  transcriptId: number | null;
  showLeadMagnetPrompt: boolean;
  leadMagnetPrompt: string;
  showLeadCaptureForm: boolean;
  addMessage: (content: string | any, role: 'user' | 'assistant', messageType?: 'text' | 'voice' | 'images' | 'html') => void;
  sendMessage: (content: string, messageType?: 'text' | 'voice') => Promise<void>;
  clearMessages: () => void;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  speakMessage: (text: string) => Promise<void>;
  onLeadMagnetResponse: (response: 'yes' | 'no') => void;
  submitLeadInfo: (name: string, email: string, phone: string, retreatDate?: string) => Promise<boolean>;
  closeLeadCapture: () => void;
  // Expose setIsLoading to allow components to control loading state
  setIsLoading?: (isLoading: boolean) => void;
}

// Create the context
const ChatContext = createContext<ChatState | undefined>(undefined);

// Generate unique message ID
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Chat provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  // State - initialize with empty array, loadMessagesFromStorage will be called in useEffect
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<number | null>(null);
  const [showLeadMagnetPrompt, setShowLeadMagnetPrompt] = useState(false);
  const [leadMagnetPrompt, setLeadMagnetPrompt] = useState('');
  const [showLeadCaptureForm, setShowLeadCaptureForm] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(new Date());

  // Refs for circular dependency issues
  const speechRecognitionRef = useRef<(() => void) | null>(null);
  const isCallActiveRef = useRef(isCallActive);

  // Update the ref when the state changes
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  // Helpers for storing/retrieving messages from localStorage
  const saveMessagesToStorage = useCallback((messagesArray: Message[]) => {
    try {
      // Convert Date objects to ISO strings for storage
      const messagesForStorage = messagesArray.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messagesForStorage));
      localStorage.setItem(STORAGE_KEYS.LAST_INTERACTION, new Date().toISOString());
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
    }
  }, []);

  const loadMessagesFromStorage = useCallback((): Message[] => {
    try {
      const storedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const lastInteraction = localStorage.getItem(STORAGE_KEYS.LAST_INTERACTION);

      // If no stored messages or if the last interaction was more than 24 hours ago, return empty array
      if (!storedMessages || !lastInteraction) return [];

      const lastInteractionDate = new Date(lastInteraction);
      const now = new Date();
      const hoursSinceLastInteraction = (now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60);

      // Clear old conversations (more than 24 hours old)
      if (hoursSinceLastInteraction > 24) {
        localStorage.removeItem(STORAGE_KEYS.MESSAGES);
        localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        localStorage.removeItem(STORAGE_KEYS.LAST_INTERACTION);
        return [];
      }

      // Parse stored messages and convert ISO date strings back to Date objects
      const parsedMessages = JSON.parse(storedMessages).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      return parsedMessages;
    } catch (error) {
      console.error('Error loading messages from localStorage:', error);
      return [];
    }
  }, []);

  // Add a message to the chat
  const addMessage = useCallback((content: string | any, role: 'user' | 'assistant', messageType?: 'text' | 'voice' | 'images' | 'html') => {
    const newMessage: Message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      messageType
    };

    // Track message for lead magnet system
    leadMagnetAPI.trackMessage();

    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      // Save to localStorage
      saveMessagesToStorage(updatedMessages);
      return updatedMessages;
    });

    // Also record in transcript database if content isn't empty and it's a string
    if (typeof content === 'string' && content.trim()) {
      // Use messageType to determine the correct format for transcript
      const format = messageType === 'html' ? 'html' : 'text';

      transcriptAPI.recordMessage(
        role, 
        content,
        format as any,
        { timestamp: new Date().toISOString() }
      ).then(() => {
        // Update transcriptId state if it was lazily created
        if (!transcriptId && transcriptAPI.getActiveTranscriptId()) {
          setTranscriptId(transcriptAPI.getActiveTranscriptId());
        }
      }).catch(error => {
        console.error('Error recording message in transcript:', error);
        // Non-blocking - we continue even if recording fails
      });
    }
  }, [saveMessagesToStorage, transcriptId]);

  // Speak a message using text-to-speech
  const speakMessage = useCallback(async (text: string) => {
    // Skip if already speaking or no text
    if (isSpeaking || !text.trim()) return;

    try {
      setIsSpeaking(true);

      // Use ElevenLabs API for text-to-speech
      const audioBlob = await elevenlabsAPI.textToSpeech(text);
      await ElevenlabsAPIService.playAudio(audioBlob);
    } catch (error) {
      console.error('Error speaking message:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  // Send a message to the chat API or call API
  const sendMessage = useCallback(async (content: string, messageType: 'text' | 'voice' = 'text') => {
    try {
      // Add user message to the chat
      addMessage(content, 'user', messageType);

      // Track message_sent event for analytics
      let sessionId = localStorage.getItem('aro-ha-session-id');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('aro-ha-session-id', sessionId);
      }
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          eventType: 'message_sent',
          transcriptId,
          metadata: { messageType, contentLength: content.length }
        }),
      }).catch(err => console.warn('Failed to track message_sent event:', err));

      // Set loading state
      setIsLoading(true);

      // Route based on whether there's an active call or not
      if (isCallActive && callId && !callId.startsWith('local-call-')) {
        // For real ElevenLabs calls, we would normally send the message to the call API
        // This would typically be handled through a WebSocket or similar connection
        console.log('Message sent in active ElevenLabs call:', content);

        // For now, we'll use the Voiceflow API for the conversation logic
        // In a complete implementation, this would be handled by the ElevenLabs call API
        const response = await voiceflowAPI.sendMessage(content);
        const assistantMessages = await VoiceflowAPIService.extractMessages(response);

        for (const msg of assistantMessages) {
          addMessage(msg.content, msg.role);
        }
      } else {
        try {
          // Standard text chat using Voiceflow streaming API
          const voiceflowResponse = await voiceflowAPI.sendMessage(content, (streamContent) => {
            // Handle real-time streaming content
            console.log('Streaming content received:', streamContent);
            addMessage(streamContent, 'assistant');
            
            // Handle speaking if needed for streaming content
            if (isCallActive && callId?.startsWith('local-call-')) {
              speakMessage(streamContent).catch(console.error);
            }
          });
          
          // Track the Voiceflow session ID for admin cross-referencing
          const vfSessionId = voiceflowAPI.getSessionID();
          if (vfSessionId) {
            transcriptAPI.updateExternalIds({ voiceflowSessionId: vfSessionId });
          }
          
          // If streaming didn't provide real-time updates, process the full response
          if (voiceflowResponse && !voiceflowResponse.traces) {
            const assistantMessages = await VoiceflowAPIService.extractMessages(voiceflowResponse);
            
            // Add messages directly from Voiceflow
            for (const msg of assistantMessages) {
              addMessage(msg.content, msg.role);
              
              // Handle speaking if needed
              if (isCallActive && callId?.startsWith('local-call-')) {
                speakMessage(msg.content).catch(console.error);
              }
            }
          } else if (!voiceflowResponse) {
            console.warn('No response received from Voiceflow');
          }

          // Images are now handled directly by VoiceFlow via Airtable integration
          // They arrive as markdown in the text response and are rendered by ReactMarkdown
        } catch (error) {
          // Only log the error but don't display an error message to the user
          // since most errors are non-critical and related to supplementary features
          console.error('Error in chat processing:', error);
          // Don't add an error message to the chat
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    } finally {
      setIsLoading(false);
    }
  }, [isCallActive, callId, addMessage, speakMessage]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    // Also clear from localStorage
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_INTERACTION);

    // Reset lead magnet for new chat
    leadMagnetAPI.startNewChat();
  }, []);

  // Speech recognition implementation
  const startSpeechRecognition = useCallback(() => {
    if (!isCallActiveRef.current || !('webkitSpeechRecognition' in window)) return;

    try {
      setIsListening(true);

      // @ts-ignore - SpeechRecognition is not in the TypeScript types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          console.log('Speech recognized:', transcript);
          // Send the recognized speech to the chat and mark it as voice input
          sendMessage(transcript, 'voice').catch(console.error);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Restart recognition if call is still active
        if (isCallActiveRef.current) {
          if (isCallActiveRef.current && speechRecognitionRef.current) {
            speechRecognitionRef.current();
          }
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
    }
  }, [sendMessage]);

  // Store the function in a ref to avoid circular dependencies
  useEffect(() => {
    speechRecognitionRef.current = startSpeechRecognition;
  }, [startSpeechRecognition]);

  // Start a voice call
  const startCall = useCallback(async () => {
    if (isCallActive) return;

    try {
      setIsLoading(true);

      // For interactive local calls, we'll generate a local call ID
      const localCallId = `local-call-${Date.now()}`;
      setCallId(localCallId);

      // Start transcript session
      const newTranscriptId = await transcriptAPI.startConversation('widget', 'voice');
      setTranscriptId(newTranscriptId);

      // Track voice_start event for analytics
      let voiceSessionId = localStorage.getItem('aro-ha-session-id');
      if (!voiceSessionId) {
        voiceSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('aro-ha-session-id', voiceSessionId);
      }
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: voiceSessionId,
          eventType: 'voice_start',
          transcriptId: newTranscriptId,
          metadata: { callId: localCallId }
        }),
      }).catch(err => console.warn('Failed to track voice_start event:', err));

      setIsLoading(false);
      setIsCallActive(true);

      // Add system message to indicate call has started
      addMessage('Voice session started. Start speaking or type your message.', 'assistant');

      // Add initial greeting message
      const welcomeMsg = "Hi there, I'm your Aro Ha virtual assistant. How can I help you today?";
      addMessage(welcomeMsg, 'assistant');

      // Start listening immediately for local calls
      if (messages.length === 0) {
        speakMessage(welcomeMsg).catch(console.error);
      }
      
      // Start the voice recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current();
      }
    } catch (error) {
      console.error('Error starting call:', error);
      addMessage('Sorry, I encountered an error starting the voice session. Please try again.', 'assistant');
      
      setIsCallActive(false);
      setCallId(null);
      
      setIsLoading(false);
    }
  }, [isCallActive, messages, addMessage, speakMessage]);

  // End a voice call
  const endCall = useCallback(async () => {
    if (!isCallActive || !callId) return;

    try {
      // For real ElevenLabs calls, API calls would be made to end the call
      if (!callId.startsWith('local-call-')) {
        console.log('Ending ElevenLabs call:', callId);
        // Here we would make an API call to ElevenLabs to end the call
      }

      // End transcript session
      if (transcriptId) {
        await transcriptAPI.endConversation();
      }

      setCallId(null);
      setIsCallActive(false);
      setIsSpeaking(false);
      setIsListening(false);

      // Add system message to indicate call has ended
      addMessage('Voice session ended.', 'assistant');
    } catch (error) {
      console.error('Error ending call:', error);
      setIsLoading(false);
      
      // Force end the call anyway
      setCallId(null);
      setIsCallActive(false);
    }
  }, [isCallActive, callId, transcriptId, addMessage]);

  // Lead magnet response
  const onLeadMagnetResponse = useCallback((response: 'yes' | 'no') => {
    // Hide the prompt
    setShowLeadMagnetPrompt(false);
    
    // If user said yes, show the form
    if (response === 'yes') {
      setShowLeadCaptureForm(true);
    }
  }, []);

  // Submit lead info to database
  const submitLeadInfo = useCallback(async (name: string, email: string, phone: string, retreatDate?: string) => {
    try {
      // Record the lead info in the transcript
      if (transcriptId) {
        await transcriptAPI.recordLeadInfo(transcriptId, {
          name,
          email,
          phone,
          retreatDate
        });
        
        // Track email captured event for analytics - use persisted session ID
        let sessionId = localStorage.getItem('aro-ha-session-id');
        if (!sessionId) {
          sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('aro-ha-session-id', sessionId);
        }
        try {
          await fetch('/api/analytics/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              eventType: 'email_captured',
              transcriptId,
              metadata: { hasPhone: !!phone }
            }),
          });
        } catch (trackError) {
          console.warn('Failed to track email capture event:', trackError);
        }
      }
      
      // Hide the form
      setShowLeadCaptureForm(false);
      return true;
    } catch (error) {
      console.error('Error submitting lead info:', error);
      return false;
    }
  }, [transcriptId]);

  // Close lead capture form
  const closeLeadCapture = useCallback(() => {
    setShowLeadCaptureForm(false);
  }, []);

  // Update last activity time when a message is sent
  useEffect(() => {
    setLastActivityTime(new Date());
  }, [messages.length]);

  // Load messages from localStorage on initial mount
  useEffect(() => {
    const storedMessages = loadMessagesFromStorage();
    if (storedMessages.length > 0) {
      console.log(`Found ${storedMessages.length} messages in storage, restoring conversation`);
      setMessages(storedMessages);
    }
  }, [loadMessagesFromStorage]);

  // Clean up transcript session when component unmounts
  useEffect(() => {
    return () => {
      // End transcript session if it exists
      if (transcriptId) {
        transcriptAPI.endConversation().catch(console.error);
      }
    };
  }, [transcriptId]);

  // Check for lead magnet conditions
  useEffect(() => {
    const checkLeadMagnet = async () => {
      try {
        // Only check if not already showing lead prompt or form
        if (!showLeadMagnetPrompt && !showLeadCaptureForm) {
          // Check for inactivity
          const inactiveTime = new Date().getTime() - lastActivityTime.getTime();
          const params = {
            messageCount: messages.length,
            isNewChat: messages.length === 0,
            inactiveTime
          };
          
          // Check if we should show lead magnet
          const shouldShowLeadMagnet = leadMagnetAPI.shouldShowLeadMagnet(params);
          
          if (shouldShowLeadMagnet) {
            // Get lead magnet prompt
            const prompt = await leadMagnetAPI.generateLeadMagnetPrompt(transcriptId || undefined);
            setLeadMagnetPrompt(prompt);
            setShowLeadMagnetPrompt(true);
          }
        }
      } catch (error) {
        console.error('Error checking lead magnet:', error);
      }
    };
    
    // Check lead magnet every 1 second
    const interval = setInterval(checkLeadMagnet, 1000);
    
    return () => clearInterval(interval);
  }, [messages, showLeadMagnetPrompt, showLeadCaptureForm, lastActivityTime, transcriptId]);

  // Create context value
  const contextValue: ChatState = {
    messages,
    isLoading,
    isSpeaking,
    isListening,
    isCallActive,
    callId,
    transcriptId,
    showLeadMagnetPrompt,
    leadMagnetPrompt,
    showLeadCaptureForm,
    addMessage,
    sendMessage,
    clearMessages,
    startCall,
    endCall,
    speakMessage,
    onLeadMagnetResponse,
    submitLeadInfo,
    closeLeadCapture,
    setIsLoading
  };

  // Return context provider
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook for using the chat context
export function useChat() {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  return context;
}

// Creates a message object
const createMessage = (role: 'user' | 'assistant', content: string, metadata?: any): Message => ({
  id: generateId(),
  role,
  content,
  timestamp: new Date(),
  metadata
});