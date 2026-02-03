import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, X, SendHorizontal, Mic, MicOff, Loader, PenLine, ArrowDown } from 'lucide-react';
import { useChat, Message } from '../contexts/ChatContext';
import { useIsMobile } from '../hooks/use-mobile';
import { cn } from '../lib/utils';
import { DiamondStar } from './AIIcons';
import ElevenLabsCall from './ElevenLabsCall';
import { LeadMagnetPrompt } from './LeadMagnetPrompt';
import { LeadCaptureForm } from './LeadCaptureForm';
import ReactMarkdown from 'react-markdown';

// TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface CustomChatWidgetProps {
  isMinimized: boolean;
  onMinimize: () => void;
}

export default function CustomChatWidget({ isMinimized, onMinimize }: CustomChatWidgetProps) {
  // State
  const [inputValue, setInputValue] = useState('');
  // Voice functionality disabled per user request
  const [useElevenLabsSDK, setUseElevenLabsSDK] = useState(false); // Will remain false, voice functionality disabled
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isListeningForInput, setIsListeningForInput] = useState(false);

  // Hooks
  const isMobile = useIsMobile();
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const {
    messages,
    isLoading,
    isSpeaking,
    isCallActive,
    sendMessage,
    startCall,
    endCall,
    speakMessage,
    clearMessages,
    showLeadMagnetPrompt,
    leadMagnetPrompt,
    showLeadCaptureForm,
    onLeadMagnetResponse,
    submitLeadInfo,
    closeLeadCapture
  } = useChat();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setTimeout(() => {
      setShowScrollButton(false);
    }, 300);
  }, []);

  // Handle scroll events to show/hide button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const scrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;

    setIsAtBottom(scrolledToBottom);
    setShowScrollButton(!scrolledToBottom);
  }, []);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // Focus input when widget is opened
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isMinimized]);

  // Auto scroll to bottom when new messages arrive, but only if already at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    } else {
      setShowScrollButton(true);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue;
    setInputValue('');
    await sendMessage(messageText);
  };

  // Handle input key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // References for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Reference to the current speech recognition instance
  const recognitionRef = useRef<any>(null);

  // Handle voice-to-text input
  const handleVoiceInput = () => {
    // If we don't have SpeechRecognition, alert the user
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // If we're already listening, stop the recognition
    if (isListeningForInput) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListeningForInput(false);
      return;
    }

    // Toggle listening state
    setIsListeningForInput(true);

    // Use the browser's speech recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Save the recognition instance to our ref
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    // When we get a result, process and send the transcribed text
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognition result:', transcript);

      // Update input field with transcript
      setInputValue(transcript);

      if (transcript.trim()) {
        try {
          // Import and use the text normalization service for speech transcriptions
          console.log('Normalizing speech transcription with OpenAI');
          const { textNormalizationService } = await import('../lib/api/textNormalizationService');
          const normalizedTranscript = await textNormalizationService.normalizeText(transcript);
          console.log('Original transcription:', transcript);
          console.log('Normalized transcription:', normalizedTranscript);

          // Send the normalized transcript
          sendMessage(normalizedTranscript);
          setInputValue('');
        } catch (error) {
          console.error('Error normalizing transcription:', error);
          // Fallback to the original transcript if normalization fails
          sendMessage(transcript);
          setInputValue('');
        }
      }

      // Reset state
      setIsListeningForInput(false);
      recognitionRef.current = null;

      // Focus back on input field
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListeningForInput(false);
      recognitionRef.current = null;

      // Only show alert for critical errors, not for aborted events
      if (event.error !== 'aborted') {
        alert('Speech recognition error: ' + event.error);
      }
    };

    // When it stops for any reason
    recognition.onend = () => {
      setIsListeningForInput(false);
      recognitionRef.current = null;
    };

    // Start listening
    recognition.start();

    // Auto-stop after 10 seconds as a safety measure
    setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 10000);
  };

  // Get chat context once at the component level
  const chatContext = useChat();
  const chatIsLoading = chatContext.isLoading;
  const setLoadingState = chatContext.setIsLoading;

  // Track call state for UI purposes
  const [callButtonDisabled, setCallButtonDisabled] = useState(false);

  // Toggle call with safeguards against multiple initializations
  const handleCallToggle = async () => {
    // Prevent rapid multiple clicks 
    if (chatIsLoading || callButtonDisabled) {
      console.log('Call operation in progress or button disabled, ignoring additional request');
      return;
    }

    // Immediately disable the button to prevent multiple clicks
    setCallButtonDisabled(true);

    // Set global loading state
    if (setLoadingState) {
      setLoadingState(true);
    }

    try {
      // Handle ending active calls
      if (isCallActive || useElevenLabsSDK) {
        console.log('Call is active, ending call...');

        if (useElevenLabsSDK) {
          // Turn off the ElevenLabs SDK call mode first
          console.log('Ending ElevenLabs SDK call');
          setUseElevenLabsSDK(false);

          // Give the component time to unmount and clean up
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (isCallActive) {
          // End the regular call via the context
          console.log('Ending regular ElevenLabs call');
          await endCall();
        }

        console.log('Call ended successfully');
      } 
      // Handle starting new calls - only if no call is active
      else {
        console.log('No active call, starting new call...');

        // Make sure we don't have any lingering state
        if (chatContext.callId) {
          console.log('Found lingering call ID, cleaning up first...');
          try {
            await endCall();
            // Give time for cleanup
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (cleanupError) {
            console.error('Error cleaning up lingering call:', cleanupError);
          }
        }

        console.log('Starting ElevenLabs SDK call');
        // Use the SDK approach which directly uses the ElevenLabs Conversation API
        setUseElevenLabsSDK(true);
      }
    } catch (error) {
      console.error('Error handling call toggle:', error);

      // Reset SDK flag if there was an error
      if (!isCallActive && useElevenLabsSDK) {
        setUseElevenLabsSDK(false);
      }
    } finally {
      // Reset loading states
      if (setLoadingState) {
        setLoadingState(false);
      }

      // Re-enable the button after a short delay
      setTimeout(() => {
        setCallButtonDisabled(false);
        console.log('Call button re-enabled');
      }, 1000);
    }
  };

  // Handle starting a new chat
  const handleNewChat = () => {
    console.log("handleNewChat called - clearing messages");
    clearMessages();
    setNewChatDialogOpen(false);

    // Focus the input field after clearing messages
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Render timestamp
  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render message bubbles
  const renderMessages = () => {
    const messageElements = messages.map((message: Message) => {
      return (
        <div
          key={message.id}
          className={cn(
            'flex w-full mb-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          <div
            className={cn(
              'rounded-lg px-4 py-2 break-words',
              message.role === 'user'
                ? 'bg-[#8E8F70] text-white'
                : 'bg-gray-100 text-gray-800',
              isMobile 
                ? 'max-w-[90%]' // Wider bubbles on mobile
                : 'max-w-[80%]'
            )}
          >
            <div className={cn(
              isMobile ? "text-base markdown-content" : "text-sm markdown-content",
              message.role === 'user' ? 'markdown-user' : 'markdown-assistant'
            )}>
              {message.role === 'user' ? (
                message.content
              ) : (
                <>
                  {/* Simplified message rendering */}
                  {(() => {
                    // Check if this is JSON content that contains images
                    if (typeof message.content === 'string' && message.content.includes('"type":"images"')) {
                      try {
                        // Try to parse as JSON to extract image data
                        const jsonData = JSON.parse(message.content);
                        
                        if (jsonData.type === 'images' && Array.isArray(jsonData.images)) {
                          // It's an image message - display the images
                          return (
                            <div className="mt-2 space-y-4">
                              {jsonData.images.map((img: any, idx: number) => (
                                <div key={idx} className="flex flex-col">
                                  <img 
                                    src={img.url} 
                                    alt="Aro Ha facility" 
                                    className="w-full h-auto rounded-lg shadow-md"
                                    loading="lazy"
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                      } catch (e) {
                        console.log('Failed to parse JSON image content');
                      }
                    }
                    
                    // Default to standard markdown rendering
                    return (
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#767657] underline" />
                          )
                        }}
                      >
                        {typeof message.content === 'string' ? message.content : 'Content not available'}
                      </ReactMarkdown>
                    );
                  })()}
                </>
              )}
            </div>
            <div className="text-xs mt-1 opacity-70 text-right">
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        </div>
      );
    });

    // Add typing indicator if messages are loading
    if (isLoading) {
      messageElements.push(
        <div key="typing-indicator" className="flex w-full mb-3 justify-start">
          <div className="rounded-lg px-3 py-2 bg-gray-100">
            <div className="typing-animation flex items-center h-5">
              <span className="dot text-gray-500">.</span>
              <span className="dot text-gray-500">.</span>
              <span className="dot text-gray-500">.</span>
            </div>
          </div>
        </div>
      );
    }

    return messageElements;
  };

  // If minimized, don't render the full widget
  if (isMinimized) {
    return null;
  }

  return (
    <div 
      className="flex flex-col bg-white shadow-lg sm:rounded-lg"
      style={{
        height: '100%', // Take up full available height
        width: isMobile ? '100vw' : '350px', // Reduced width on desktop, full viewport width on mobile
        overflow: 'hidden'
      }}
    >
      {/* Premium Header */}
      <div className={cn(
        "flex items-center justify-between text-white sm:rounded-t-lg",
        "bg-gradient-to-r from-[#767657] to-[#8E8F70]",
        isMobile ? "p-4" : "p-3" // Larger padding on mobile
      )}>
        <div className="flex items-center">
          {/* Profile Image with Logo - Strong white background */}
          <div className={cn(
            "rounded-full bg-white flex items-center justify-center overflow-hidden",
            "shadow-md border border-white/80",
            isMobile ? "w-10 h-10 mr-3" : "w-8 h-8 mr-2" // Larger avatar on mobile
          )}>
            <img 
              src="/assets/lumi-logo.png" 
              alt="Aro Ha Lumi Logo" 
              className={isMobile ? "w-7 h-7 object-contain" : "w-6 h-6 object-contain"}
            />
          </div>
          <div className={cn(
            "font-bold text-white tracking-wide", // Bold white text for header with better spacing
            isMobile ? "text-xl" : "text-lg" // Larger font size
          )}>Lumi</div>
          {(isLoading || isSpeaking) && (
            <div className="ml-2 flex items-center">
              <span className={cn(
                "text-white font-medium typing-animation flex",
                isMobile ? "text-sm" : "text-xs"
              )}>
                <span className="mr-1">typing</span><span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center">
          {/* New Chat button */}
          <button
            onClick={() => setNewChatDialogOpen(true)}
            className={cn(
              "rounded-full transition-all shadow-inner",
              "bg-white/10 hover:bg-white/20 border border-white/10",
              isMobile ? "mr-3 p-3" : "mr-2 p-2" // Larger touch target on mobile
            )}
            aria-label="New Chat"
            title="New Chat"
            disabled={isLoading}
          >
            <PenLine size={isMobile ? 22 : 18} />
          </button>

          {/* Custom New Chat Dialog */}
          {newChatDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className={cn(
                "bg-white rounded-lg border border-[#767657]/20 shadow-lg p-6",
                isMobile ? "w-[90vw] max-w-lg" : "w-[400px]"
              )}>
                <div className="text-2xl font-bold text-[#767657] tracking-wide text-shadow-subtle">Start New Chat</div>
                <div className="text-[#767657]/80 mt-3">
                  Are you sure you want to start a new chat? This will clear your current conversation history.
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button 
                    onClick={() => setNewChatDialogOpen(false)}
                    className="px-4 py-2 rounded-md border border-[#767657]/30 text-[#767657] hover:bg-[#f8f8f6] transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleNewChat}
                    className="px-4 py-2 rounded-md bg-[#767657] hover:bg-[#767657]/90 text-white shadow-sm border border-[#767657]/80"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Call button with premium styling */}
          <button
            onClick={handleCallToggle}
            disabled={callButtonDisabled}
            className={cn(
              "transition-all duration-200 rounded-full shadow-inner border",
              isMobile ? "mr-3 p-3" : "mr-2 p-2", // Larger touch target on mobile
              // Visual feedback for disabled state
              callButtonDisabled
                ? "opacity-50 cursor-not-allowed"
                : "opacity-100 hover:opacity-90",
              // Color based on call status
              (isCallActive || useElevenLabsSDK) 
                ? "bg-red-500 hover:bg-red-600 border-red-400" 
                : "bg-white/10 hover:bg-white/20 border-white/10"
            )}
            aria-label={(isCallActive || useElevenLabsSDK) ? "End Call" : "Start Call"}
            title={(isCallActive || useElevenLabsSDK) 
                  ? (callButtonDisabled ? "Ending call..." : "End Call") 
                  : (callButtonDisabled ? "Starting call..." : "Start Call")}
          >
            <Phone size={isMobile ? 22 : 18} />
          </button>

          {/* Close button - only shown if onMinimize is a real function */}
          {onMinimize && typeof onMinimize === 'function' && onMinimize.toString() !== '() => {}' && (
            <button
              onClick={onMinimize}
              className={cn(
                "rounded-full transition-all shadow-inner",
                "bg-white/10 hover:bg-white/20 border border-white/10",
                isMobile ? "p-3" : "p-2" // Larger touch target on mobile
              )}
              aria-label="Minimize"
              title="Minimize"
            >
              <X size={isMobile ? 22 : 18} />
            </button>
          )}
        </div>
      </div>

      {/* Speaking indicator (no longer showing "Voice Call Active" message) */}
      {(isCallActive || useElevenLabsSDK) && isSpeaking && (
        <div className={cn(
          "bg-red-50 border-b border-red-100 text-red-800 flex items-center",
          isMobile 
            ? "px-4 py-3 text-base" // Larger indicator on mobile
            : "px-3 py-2 text-sm"
        )}>
          <Phone size={isMobile ? 18 : 14} className="mr-2" />
          <span>Speaking...</span>
        </div>
      )}

      {/* Voice Call Component */}
      {useElevenLabsSDK && (
        <ElevenLabsCall onClose={() => setUseElevenLabsSDK(false)} />
      )}

      {/* Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto relative" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-white via-[#f8f8f6] to-white">
            {/* Premium Welcome Screen with Logo and Introduction */}
            <div className="flex flex-col items-center mb-8 text-center max-w-xs mx-auto">
              <div className="w-28 h-28 rounded-full bg-white shadow-lg flex items-center justify-center mb-6 border border-[#767657]/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#f8f8f6]/40 to-transparent opacity-50"></div>
                <img 
                  src="/assets/lumi-logo.png" 
                  alt="Lumi" 
                  className="w-20 h-20 object-contain p-1 relative z-10"
                />
                <div className="absolute -inset-1 bg-gradient-to-tr from-[#767657]/5 via-white to-[#767657]/5 z-0 opacity-50" 
                  style={{animation: 'subtleBackgroundShift 8s ease-in-out infinite'}}></div>
              </div>
              <h2 className="text-5xl mb-5 font-bold text-[#767657] text-shadow-subtle tracking-wider font-sagona">Lumi</h2>
              <div className="w-16 h-px bg-[#767657]/30 mx-auto mb-5"></div>
              <p className="text-[#767657]/90 mb-6 text-base uppercase tracking-widest font-light">Your AI guide to Aro Ha</p>
            </div>
          </div>
        ) : (
          renderMessages()
        )}

        {/* Lead Magnet Prompt */}
        {showLeadMagnetPrompt && (
          <div className="mb-4 mt-4">
            <LeadMagnetPrompt 
              prompt={leadMagnetPrompt} 
              onResponse={onLeadMagnetResponse} 
            />
          </div>
        )}

        {/* Lead Capture Form */}
        {showLeadCaptureForm && (
          <div className="mb-4 mt-4">
            <LeadCaptureForm 
              onSubmit={submitLeadInfo}
              onCancel={closeLeadCapture}
            />
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-2 right-2 bg-[#8E8F70] text-white rounded-full p-2 shadow-md transition-opacity hover:bg-[#8E8F70]/90 animate-fade-in"
            aria-label="Scroll to bottom"
            title="Scroll to latest message"
          >
            <ArrowDown size={isMobile ? 22 : 18} />
          </button>
        )}
      </div>

      {/* Input Area - Premium pill-shaped design */}
      <div className="border-t border-gray-200 p-3 bg-gradient-to-b from-white to-[#f8f8f6]">
        <div className="flex items-center border border-[#767657]/30 rounded-full px-4 py-3 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <input
            ref={inputRef}
            type="text"
            placeholder="Message..."
            className="flex-1 bg-transparent outline-none text-gray-700 text-base"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />

          {/* Microphone button for speech-to-text is disabled per user request */}

          {/* Send button - Luxury styling */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "flex items-center justify-center rounded-full transition-all w-9 h-9 ml-1",
              inputValue.trim() && !isLoading
                ? "bg-[#767657] text-white hover:bg-[#767657]/90 shadow-sm"
                : "bg-gray-100 text-gray-400"
            )}
          >
            <ArrowDown className="rotate-180" size={isMobile ? 18 : 16} />
          </button>
        </div>
      </div>
    </div>
  );
}