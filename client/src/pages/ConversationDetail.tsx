import { useQuery, useMutation } from '@tanstack/react-query';
import { LogoutButton } from '@/components/LogoutButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Phone, ExternalLink, Clock, User, Calendar, Hash, Mail, Flag, AlertTriangle, CheckCircle, PenLine, Loader2, Send } from 'lucide-react';
import { format, formatDistanceStrict } from 'date-fns';
import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ConversationDetail {
  transcript: {
    id: number;
    sessionId: string;
    source: string;
    channel: string | null;
    elevenlabsConversationId: string | null;
    voiceflowSessionId: string | null;
    ipAddress: string | null;
    startTime: string;
    endTime: string | null;
    metadata: any;
    summary: string | null;
  };
  messages: Array<{
    id: number;
    role: string;
    content: string;
    timestamp: string;
    messageType: string | null;
  }>;
  lead: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface FlagDialogState {
  isOpen: boolean;
  messageId: number | null;
  question: string;
  answer: string;
}

export default function ConversationDetailPage() {
  const [, params] = useRoute('/admin/conversation/:id');
  const [, navigate] = useLocation();
  const conversationId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  
  const [flagDialog, setFlagDialog] = useState<FlagDialogState>({
    isOpen: false,
    messageId: null,
    question: '',
    answer: '',
  });
  const [flagNote, setFlagNote] = useState('');
  const [flaggedMessages, setFlaggedMessages] = useState<Set<number>>(new Set());
  const [quickNote, setQuickNote] = useState('');
  const [submittedNotes, setSubmittedNotes] = useState<Array<{ id: string; note: string; status: 'pending' | 'success' | 'error'; timestamp: Date; question?: string; answer?: string }>>([]);

  // Add admin-page class to body for CSS styling (enables scrolling)
  useEffect(() => {
    document.body.classList.add('admin-page');
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, []);

  const flagMutation = useMutation({
    mutationFn: async (data: { question: string; answer: string; note: string; conversationId: number; messageId: number }) => {
      const response = await fetch('/api/admin/flag-knowledge-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to flag knowledge gap');
      return response.json();
    },
    onSuccess: (_, variables) => {
      setFlaggedMessages(prev => new Set(Array.from(prev).concat(variables.messageId)));
      toast({
        title: 'Flagged successfully',
        description: 'The knowledge gap has been sent to Airtable for review.',
      });
      setFlagDialog({ isOpen: false, messageId: null, question: '', answer: '' });
      setFlagNote('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to flag the knowledge gap. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const quickNoteMutation = useMutation({
    mutationFn: async (data: { noteId: string; note: string; conversationId: number; conversationContext: string }) => {
      const response = await fetch('/api/admin/quick-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: data.note,
          conversationId: data.conversationId,
          conversationContext: data.conversationContext,
        }),
      });
      if (!response.ok) throw new Error('Failed to process note');
      const result = await response.json();
      return { ...result, noteId: data.noteId };
    },
    onSuccess: (data) => {
      setSubmittedNotes(prev => prev.map(n => 
        n.id === data.noteId ? { ...n, status: 'success' as const, question: data.question, answer: data.answer } : n
      ));
      toast({
        title: 'Note processed',
        description: 'AI generated Q&A has been sent to Airtable.',
      });
    },
    onError: (_, variables) => {
      setSubmittedNotes(prev => prev.map(n => 
        n.id === variables.noteId ? { ...n, status: 'error' as const } : n
      ));
      toast({
        title: 'Error',
        description: 'Failed to process the note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleQuickNoteSubmit = () => {
    if (!quickNote.trim() || !conversationId || !detail) return;
    
    const noteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const conversationContext = detail.messages
      .slice(-10)
      .map(m => `${m.role === 'user' || m.role === 'Guest' ? 'User' : 'Lumi'}: ${m.content}`)
      .join('\n');
    
    setSubmittedNotes(prev => [...prev, { id: noteId, note: quickNote, status: 'pending', timestamp: new Date() }]);
    
    quickNoteMutation.mutate({
      noteId,
      note: quickNote,
      conversationId,
      conversationContext,
    });
    
    setQuickNote('');
  };

  const handleFlagClick = (messageIndex: number) => {
    if (!detail) return;
    
    const message = detail.messages[messageIndex];
    const previousMessage = messageIndex > 0 ? detail.messages[messageIndex - 1] : null;
    
    const question = previousMessage && (previousMessage.role === 'user' || previousMessage.role === 'Guest')
      ? previousMessage.content
      : 'N/A';
    const answer = message.content;
    
    setFlagDialog({
      isOpen: true,
      messageId: message.id,
      question,
      answer,
    });
  };

  const handleSubmitFlag = () => {
    if (!flagDialog.messageId || !conversationId) return;
    
    flagMutation.mutate({
      question: flagDialog.question,
      answer: flagDialog.answer,
      note: flagNote,
      conversationId,
      messageId: flagDialog.messageId,
    });
  };

  const { data: detail, isLoading } = useQuery<ConversationDetail>({
    queryKey: ['/api/transcripts', conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/transcripts/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      return response.json();
    },
    enabled: !!conversationId,
  });

  if (!conversationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invalid conversation ID</p>
      </div>
    );
  }

  const getDuration = () => {
    if (!detail?.transcript.startTime) return 'Unknown';
    
    const startTime = new Date(detail.transcript.startTime);
    const now = new Date();
    const hoursSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // If more than 24 hours have passed, show "Conversation finished"
    if (hoursSinceStart > 24) {
      return 'Conversation finished';
    }
    
    if (detail.transcript.endTime) {
      return formatDistanceStrict(startTime, new Date(detail.transcript.endTime));
    }
    
    return 'In progress';
  };
  
  const duration = getDuration();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
          <LogoutButton />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : detail ? (
          <>
            {/* Conversation Metadata Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      Conversation #{detail.transcript.id}
                      <Badge variant="secondary" className={cn(
                        detail.transcript.channel === 'voice' 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-blue-100 text-blue-800"
                      )}>
                        {detail.transcript.channel === 'voice' ? (
                          <><Phone className="h-3 w-3 mr-1" /> Voice</>
                        ) : (
                          <><MessageSquare className="h-3 w-3 mr-1" /> Text</>
                        )}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Session: {detail.transcript.sessionId}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Started
                    </div>
                    <p className="font-medium">
                      {format(new Date(detail.transcript.startTime), 'PPP')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(detail.transcript.startTime), 'h:mm:ss a')}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Duration
                    </div>
                    <p className="font-medium">{duration}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      Messages
                    </div>
                    <p className="font-medium">{detail.messages.length}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Source
                    </div>
                    <p className="font-medium">{detail.transcript.source || 'Widget'}</p>
                  </div>
                </div>

                {/* Visitor Contact Info */}
                {detail.lead && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Visitor Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-16">Name:</span>
                        <span className="text-sm font-medium">{detail.lead.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-16">Email:</span>
                        <a 
                          href={`mailto:${detail.lead.email}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          data-testid="link-email"
                        >
                          <Mail className="h-3 w-3" />
                          {detail.lead.email}
                        </a>
                      </div>
                      {detail.lead.phone && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-16">Phone:</span>
                          <a 
                            href={`tel:${detail.lead.phone}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            data-testid="link-phone"
                          >
                            <Phone className="h-3 w-3" />
                            {detail.lead.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Platform ID Section */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Platform Reference</h4>
                  
                  {detail.transcript.channel === 'voice' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-32">ElevenLabs ID:</span>
                        {detail.transcript.elevenlabsConversationId ? (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-purple-50 text-purple-800 rounded text-sm font-mono">
                              {detail.transcript.elevenlabsConversationId}
                            </code>
                            <a
                              href={`https://elevenlabs.io/app/conversational-ai/history?conversation_id=${detail.transcript.elevenlabsConversationId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm"
                              data-testid="link-elevenlabs"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open
                            </a>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Not captured</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-32">Voiceflow ID:</span>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm font-mono">
                            {detail.transcript.voiceflowSessionId || detail.transcript.sessionId}
                          </code>
                          <a
                            href="https://creator.voiceflow.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                            data-testid="link-voiceflow"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Dashboard
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* IP Address if available */}
                {detail.transcript.ipAddress && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">IP Address: </span>
                    <span className="text-sm font-mono">{detail.transcript.ipAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages Card */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation Transcript</CardTitle>
                <CardDescription>
                  {detail.messages.length} messages in this conversation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detail.messages.length > 0 ? (
                  <div className="space-y-4">
                    {detail.messages.map((msg, index) => (
                      <div
                        key={msg.id || index}
                        className={cn(
                          "p-4 rounded-lg relative group",
                          msg.role === 'user' || msg.role === 'Guest'
                            ? "bg-blue-50 dark:bg-blue-900/20 ml-8 border-l-4 border-blue-400"
                            : "bg-slate-100 dark:bg-slate-800 mr-8 border-l-4 border-slate-400"
                        )}
                        data-testid={`message-${index}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {msg.role === 'user' || msg.role === 'Guest' ? 'Visitor' : 'Lumi'}
                          </span>
                          <div className="flex items-center gap-2">
                            {msg.role !== 'user' && msg.role !== 'Guest' && (
                              flaggedMessages.has(msg.id) ? (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Flagged
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleFlagClick(index)}
                                  data-testid={`button-flag-${index}`}
                                >
                                  <Flag className="h-3 w-3 mr-1" />
                                  Flag
                                </Button>
                              )
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.timestamp), 'h:mm:ss a')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        {msg.messageType && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {msg.messageType}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No messages in this conversation
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Notes Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="h-5 w-5" />
                  Quick Correction Notes
                </CardTitle>
                <CardDescription>
                  Add a note about incorrect information. AI will generate a Q&A and send it to your knowledge base.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Example: 'Lumi said the retreat starts at 8am but it actually starts at 7am' or 'The price for the 5-day retreat is $4500, not $4000'"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    className="flex-1 min-h-[80px]"
                    data-testid="textarea-quick-note"
                  />
                  <Button 
                    onClick={handleQuickNoteSubmit}
                    disabled={!quickNote.trim() || quickNoteMutation.isPending}
                    className="self-end"
                    data-testid="button-submit-quick-note"
                  >
                    {quickNoteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {submittedNotes.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium">Submitted Notes</h4>
                    {submittedNotes.map((note, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          note.status === 'pending' && "bg-yellow-50 border border-yellow-200",
                          note.status === 'success' && "bg-green-50 border border-green-200",
                          note.status === 'error' && "bg-red-50 border border-red-200"
                        )}
                        data-testid={`note-${idx}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium flex items-center gap-2">
                            {note.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />}
                            {note.status === 'success' && <CheckCircle className="h-3 w-3 text-green-600" />}
                            {note.status === 'error' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                            {note.status === 'pending' ? 'Processing...' : note.status === 'success' ? 'Sent to Airtable' : 'Failed'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(note.timestamp, 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{note.note}</p>
                        {note.status === 'success' && note.question && note.answer && (
                          <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                            <div>
                              <span className="text-xs font-medium text-green-700">Generated Question:</span>
                              <p className="text-green-800">{note.question}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-green-700">Generated Answer:</span>
                              <p className="text-green-800">{note.answer}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Conversation not found
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Flag Knowledge Gap Dialog */}
      <Dialog open={flagDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setFlagDialog({ isOpen: false, messageId: null, question: '', answer: '' });
          setFlagNote('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Flag Incorrect Information
            </DialogTitle>
            <DialogDescription>
              This will send the question and answer to Airtable for review and correction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">User Question</Label>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                {flagDialog.question || 'No question available'}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Lumi's Response</Label>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm max-h-48 overflow-y-auto">
                {flagDialog.answer}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag-note" className="text-sm font-medium">
                What's wrong with this response?
              </Label>
              <Textarea
                id="flag-note"
                placeholder="Describe what information is incorrect or missing..."
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-flag-note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFlagDialog({ isOpen: false, messageId: null, question: '', answer: '' });
                setFlagNote('');
              }}
              data-testid="button-cancel-flag"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFlag}
              disabled={flagMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="button-submit-flag"
            >
              {flagMutation.isPending ? 'Submitting...' : 'Submit to Airtable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
