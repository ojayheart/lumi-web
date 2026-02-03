'use client';

import React, { useEffect, useState } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { transcriptAPI } from '@/api/transcriptAPI';

declare global {
  interface Window {
    micStream?: MediaStream;
  }
}

interface ElevenLabsCallProps {
  onClose: () => void;
}

export default function ElevenLabsCall({ onClose }: ElevenLabsCallProps) {
  const { addMessage } = useChat();
  const [hasPermission, setHasPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const conversation = useConversation({
    debug: true,
    onInit: () => {
      console.log('🎯 ElevenLabs conversation initialized');
      console.log('Conversation state:', conversation.status);
      console.log('Available tools:', conversation);
    },
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setErrorMessage('');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
    },
    onMessage: async (message) => {
      console.log('📨 ElevenLabs onMessage called:', {
        source: message.source,
        messageLength: message.message?.length,
        timestamp: Date.now(),
        fullMessage: message
      });
      
      if (message.source === 'ai' && message.message) {
        console.log('🤖 Adding AI message to chat');
        addMessage(message.message, 'assistant');
      } else if (message.source === 'user' && message.message) {
        console.log('👤 Adding user message to chat');
        addMessage(message.message, 'user');
      }
    },
    onError: (error) => {
      const errorMessage = typeof error === 'string' ? error : (error as any)?.message || 'Unknown error';
      console.error('🔴 ElevenLabs conversation error:', error);
      setErrorMessage(errorMessage);
      addMessage(`Error with voice service: ${errorMessage}`, 'assistant');
    },
    onRecordingStarted: () => {
      console.log('Recording started - microphone is now active');
      if (conversation.isSpeaking && !isInterrupting) {
        handleInterruptSpeech();
      }
    },
    onRecordingStopped: () => {
      console.log('Recording stopped - no longer capturing audio');
    },
    bargeInEnabled: true,
    interruptSpeakingThreshold: 0.05
  });

  const { status, isSpeaking } = conversation;

  const requestMicPermission = async () => {
    try {
      const savedPermission = localStorage.getItem('aro_ha_mic_permission');
      if (savedPermission === 'granted') {
        setHasPermission(true);
        return true;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.micStream = stream;
      localStorage.setItem('aro_ha_mic_permission', 'granted');
      setHasPermission(true);

      setTimeout(() => {
        if (window.micStream) {
          window.micStream.getTracks().forEach(track => track.stop());
          window.micStream = undefined;
        }
      }, 500);

      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      const err = error as { name?: string; message?: string };
      setErrorMessage('Microphone access error: ' + (err.message || 'Unknown error'));
      return false;
    }
  };

  const handleStartConversation = async () => {
    try {
      console.log('Starting conversation initialization...');
      
      // Reset any existing conversation state
      if (conversation.status === 'connected') {
        await conversation.endSession();
      }
      
      console.log('Current conversation status:', conversation.status);
      console.log('Attempting fresh connection...');
      
      const permissionGranted = await requestMicPermission();
      if (!permissionGranted) {
        console.error('Microphone permission not granted');
        return;
      }

      console.log('Fetching configuration...');
      const response = await fetch('/api/config');
      const config = await response.json();
      console.log('Config loaded:', { hasApiKey: !!config?.elevenlabs?.apiKey });

      if (!config?.elevenlabs?.apiKey) {
        const error = 'Voice service API key is missing';
        console.error(error);
        setErrorMessage(error);
        return;
      }

      console.log('Starting ElevenLabs session...');
      console.log('Attempting to start ElevenLabs session...');
      try {
        // Add retry logic for connection
        let attempts = 0;
        const maxAttempts = 3;
        let conversationId;
        
        while (attempts < maxAttempts) {
          try {
            console.log('Registering client tools...');
            conversationId = await conversation.startSession({
              agentId: '3FvBwXKJ0YFSqoIIbL07',
              clientTools: {
                displayRetreatLink: (parameters: any) => {
                  console.log('🎯 displayRetreatLink FUNCTION CALLED!');
                  console.log('displayRetreatLink called with full parameters:', JSON.stringify(parameters, null, 2));
                  
                  try {
                    let retreat_name, date, url, link_text;
                    
                    // Check if parameters contain nested JSON string
                    if (parameters && parameters.displayRetreatLink) {
                      const parsedData = JSON.parse(parameters.displayRetreatLink);
                      console.log('Parsed retreat data:', parsedData);
                      
                      retreat_name = parsedData.retreat_name;
                      date = parsedData.date;
                      url = parsedData.url;
                      link_text = parsedData.link_text;
                    } else if (parameters && typeof parameters === 'object') {
                      // Fallback to direct access
                      retreat_name = parameters.retreat_name || parameters.retreatName || parameters.name;
                      date = parameters.date || parameters.retreat_date || parameters.retreatDate;
                      url = parameters.url || parameters.booking_url || parameters.bookingUrl || parameters.link;
                      link_text = parameters.link_text || parameters.linkText;
                    }
                    
                    console.log('Final extracted values:', { retreat_name, date, url, link_text });
                    
                    // Format the retreat information as a nice message
                    const retreatMessage = `🌿 **${retreat_name}**\n\n📅 **Date:** ${date}\n\n🔗 **Book Now:** [${link_text || 'Reserve Your Spot'}](${url})`;
                    
                    // Add the formatted message to the chat immediately
                    addMessage(retreatMessage, 'assistant');
                    console.log('Retreat information displayed in chat successfully');
                  } catch (error) {
                    console.error('Error processing retreat link:', error);
                    addMessage('I encountered an issue displaying the retreat information. Please try again.', 'assistant');
                  }
                },
                // Add a test function to verify client tools are working
                testTool: (parameters: any) => {
                  console.log('🧪 testTool called with:', parameters);
                  addMessage('Test tool called successfully!', 'assistant');
                }
              }
            });
            console.log('Started conversation with ID:', conversationId);
            console.log('Client tools registered successfully');
            
            // Store the ElevenLabs conversation ID for cross-referencing
            if (conversationId) {
              transcriptAPI.updateExternalIds({ elevenlabsConversationId: conversationId });
            }
            break;
          } catch (retryError) {
            attempts++;
            console.log(`Connection attempt ${attempts} failed, ${maxAttempts - attempts} attempts remaining`);
            if (attempts === maxAttempts) throw retryError;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
          }
        }
        
        // Check if session started successfully
        if (!conversationId) {
          throw new Error('No conversation ID returned from startSession');
        }
        
        // Add a delay to ensure connection is established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify connection status
        console.log('Post-connection status:', {
          status: conversation.status,
          isSpeaking: conversation.isSpeaking,
          micMuted: conversation.micMuted
        });
      } catch (sessionError) {
        console.error('Failed to start ElevenLabs session:', sessionError);
        setErrorMessage('Failed to establish voice connection. Please try again.');
        throw sessionError;
      }
      console.log('Connection status:', conversation.status);
      console.log('Session state:', {
        isSpeaking: conversation.isSpeaking,
        status: conversation.status
      });
    } catch (error) {
      console.error('Detailed conversation error:', {
        error,
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        conversationState: {
          status: conversation.status,
          isSpeaking: conversation.isSpeaking,
        }
      });
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage('Failed to start conversation: ' + errorMsg);
    }
  };

  const handleEndConversation = async () => {
    if (isEndingCall) return;
    setIsEndingCall(true);

    try {
      if (conversation) {
        await conversation.endSession();
      }
    } catch (error) {
      console.error('Error ending conversation:', error);
    } finally {
      setTimeout(() => {
        onClose();
        setIsEndingCall(false);
      }, 500);
    }
  };

  const toggleMute = async () => {
    try {
      await conversation.setVolume({ volume: isMuted ? 1 : 0 });
      setIsMuted(!isMuted);
    } catch (error) {
      setErrorMessage('Failed to change volume');
    }
  };

  const handleInterruptSpeech = async () => {
    try {
      setIsInterrupting(true);
      await conversation.setVolume({ volume: 0 });
      setTimeout(async () => {
        await conversation.setVolume({ volume: isMuted ? 0 : 1 });
      }, 500);
    } catch (error) {
      console.error('Error interrupting speech:', error);
    } finally {
      setTimeout(() => {
        setIsInterrupting(false);
      }, 1000);
    }
  };

  useEffect(() => {
    handleStartConversation();
    return () => {
      if (window.micStream) {
        window.micStream.getTracks().forEach(track => track.stop());
        window.micStream = undefined;
      }
      handleEndConversation();
    };
  }, []);

  return (
    <div className="p-4 bg-slate-50 rounded-md">
      <div className="flex justify-between items-center mb-2">
        <p className="font-medium">
          {status === 'connected' 
            ? (isInterrupting 
                ? 'Interrupting Lumi...' 
                : (isSpeaking ? 'Lumi is speaking...' : 'Listening to your voice...')) 
            : 'Connecting to Lumi...'}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            disabled={status !== 'connected'}
            title="Mute/Unmute"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndConversation}
            title="End call"
            disabled={isEndingCall}
          >
            {isEndingCall ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> 
                Ending...
              </>
            ) : (
              <>
                <MicOff className="h-4 w-4 mr-1" /> 
                End Call
              </>
            )}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
      )}

      <div className={`mt-3 p-2 bg-slate-100 rounded-md ${status === 'connected' ? 'block' : 'hidden'}`}>
        <p className="text-sm text-center">
          {isInterrupting ? (
            <span className="flex items-center justify-center">
              <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-dashed border-slate-500"></span> 
              Interrupting Lumi's speech...
            </span>
          ) : isSpeaking ? (
            <span className="flex items-center justify-center">
              <Volume2 className="h-4 w-4 mr-2 animate-pulse" /> Lumi is speaking...
              <span className="ml-2 text-xs text-slate-500">(Start speaking to interrupt)</span>
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Mic className="h-4 w-4 mr-2 animate-pulse" /> Microphone is active - speak now
            </span>
          )}
        </p>
      </div>

      {status !== 'connected' && !errorMessage && (
        <p className="text-sm text-center mt-3 text-slate-500">
          Establishing voice connection... Please wait.
        </p>
      )}
    </div>
  );
}