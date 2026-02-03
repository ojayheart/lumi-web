import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Mail, TrendingUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AnalyticsOverview {
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  engagedConversations: number;
  engagementRate: number;
  sourceBreakdown: Record<string, number>;
}

interface TranscriptDetail {
  id: number;
  sessionId: string;
  source: string;
  ipAddress: string | null;
  startTime: string;
  endTime: string | null;
  messageCount: number;
  leadCaptured: boolean;
  leadName: string | null;
  leadEmail: string | null;
}

interface PaginatedTranscripts {
  data: TranscriptDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DailyStat {
  date: string;
  conversations: number;
  messages: number;
}

interface Lead {
  id: number;
  transcriptId: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  contacted: boolean;
  leadSource: string;
}

interface PaginatedLeads {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ConversationDetail {
  transcript: {
    id: number;
    sessionId: string;
    source: string;
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
}

export default function Analytics() {
  const [selectedTranscript, setSelectedTranscript] = useState<number | null>(null);
  const [transcriptsPage, setTranscriptsPage] = useState(1);
  const [leadsPage, setLeadsPage] = useState(1);
  const [onlyEngaged, setOnlyEngaged] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['/api/analytics/overview'],
  });

  const { data: transcriptsData, isLoading: transcriptsLoading } = useQuery<PaginatedTranscripts>({
    queryKey: ['/api/analytics/transcripts', transcriptsPage, onlyEngaged],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/transcripts?page=${transcriptsPage}&limit=50&onlyEngaged=${onlyEngaged}`);
      if (!response.ok) throw new Error('Failed to fetch transcripts');
      return response.json();
    },
  });

  const { data: dailyStats, isLoading: dailyStatsLoading } = useQuery<DailyStat[]>({
    queryKey: ['/api/analytics/daily-stats'],
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery<PaginatedLeads>({
    queryKey: ['/api/analytics/leads', leadsPage],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/leads?page=${leadsPage}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  const { data: conversationDetail } = useQuery<ConversationDetail>({
    queryKey: ['/api/transcripts', selectedTranscript],
    enabled: !!selectedTranscript,
  });

  const sourceColors: Record<string, string> = {
    voiceflow: 'bg-blue-500',
    elevenlabs: 'bg-purple-500',
    widget: 'bg-green-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Chat Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Comprehensive reporting on your widget interactions
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="card-conversations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-conversations">
                    {overview ? overview.totalConversations.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Opened chat widget
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-engaged">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engaged Visitors</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-engaged-conversations">
                    {overview ? overview.engagedConversations.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview ? `${overview.engagementRate.toFixed(1)}% engagement rate` : '0% engagement rate'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-messages">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-messages">
                    {overview ? overview.totalMessages.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview && overview.engagedConversations > 0
                      ? `${(overview.totalMessages / overview.engagedConversations).toFixed(1)} avg per chat`
                      : 'No messages yet'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-leads">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Captured</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-leads">
                    {overview?.totalLeads || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview && overview.totalConversations > 0
                      ? `${((overview.totalLeads / overview.totalConversations) * 100).toFixed(2)}% conversion`
                      : '0% conversion'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card data-testid="card-activity-chart">
          <CardHeader>
            <CardTitle>Daily Activity (Last 30 Days)</CardTitle>
            <CardDescription>Conversations and messages over time</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyStatsLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : dailyStats && dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value as string), 'PPP')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="conversations" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Conversations"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Messages"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        {overview && overview.sourceBreakdown && Object.keys(overview.sourceBreakdown).length > 0 && (
          <Card data-testid="card-source-breakdown">
            <CardHeader>
              <CardTitle>Traffic by Source</CardTitle>
              <CardDescription>Breakdown of conversations by integration</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(overview.sourceBreakdown).map(([source, count]) => ({ source, count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Conversations and Leads */}
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList>
            <TabsTrigger value="conversations" data-testid="tab-conversations">Conversations</TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <Card data-testid="card-conversations-table">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Conversations</CardTitle>
                    <CardDescription>
                      Click on a conversation to view the full transcript
                      {transcriptsData && ` (${transcriptsData.total.toLocaleString()} total)`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Switch
                      id="engaged-filter"
                      checked={onlyEngaged}
                      onCheckedChange={(checked) => {
                        setOnlyEngaged(checked);
                        setTranscriptsPage(1);
                      }}
                      data-testid="switch-engaged-filter"
                    />
                    <Label htmlFor="engaged-filter" className="text-sm">
                      Only show engaged conversations
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {transcriptsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : transcriptsData && transcriptsData.data.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Messages</TableHead>
                            <TableHead>Lead</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transcriptsData.data.map((transcript) => (
                            <TableRow
                              key={transcript.id}
                              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                              onClick={() => setSelectedTranscript(transcript.id)}
                              data-testid={`row-transcript-${transcript.id}`}
                            >
                              <TableCell className="font-mono text-xs">
                                #{transcript.id}
                              </TableCell>
                              <TableCell>
                                {format(new Date(transcript.startTime), 'PPp')}
                              </TableCell>
                              <TableCell>
                                <Badge className={sourceColors[transcript.source] || 'bg-gray-500'}>
                                  {transcript.source}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {transcript.ipAddress || 'unknown'}
                              </TableCell>
                              <TableCell>{transcript.messageCount}</TableCell>
                              <TableCell>
                                {transcript.leadCaptured ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium">{transcript.leadName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {transcript.leadEmail}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No lead</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {transcript.endTime ? (
                                  <Badge variant="secondary">Completed</Badge>
                                ) : (
                                  <Badge variant="default">Active</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((transcriptsPage - 1) * 50) + 1} to {Math.min(transcriptsPage * 50, transcriptsData.total)} of {transcriptsData.total.toLocaleString()} conversations
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTranscriptsPage(p => Math.max(1, p - 1))}
                          disabled={transcriptsPage <= 1 || transcriptsLoading}
                          data-testid="button-prev-transcripts"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center px-3 text-sm">
                          Page {transcriptsPage} of {transcriptsData.totalPages || 1}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTranscriptsPage(p => Math.min(transcriptsData.totalPages, p + 1))}
                          disabled={transcriptsPage >= transcriptsData.totalPages || transcriptsLoading || transcriptsData.totalPages === 0}
                          data-testid="button-next-transcripts"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    No conversations yet. Your chat tracking is now active and ready to capture data!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card data-testid="card-leads-table">
              <CardHeader>
                <CardTitle>Captured Leads</CardTitle>
                <CardDescription>
                  All leads collected through the chat widget
                  {leadsData && ` (${leadsData.total.toLocaleString()} total)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : leadsData && leadsData.data.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Contacted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leadsData.data.map((lead) => (
                            <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                              <TableCell className="font-medium">{lead.name}</TableCell>
                              <TableCell>{lead.email}</TableCell>
                              <TableCell>{lead.phone || '-'}</TableCell>
                              <TableCell>
                                {format(new Date(lead.createdAt), 'PPp')}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{lead.leadSource}</Badge>
                              </TableCell>
                              <TableCell>
                                {lead.contacted ? (
                                  <Badge className="bg-green-500">Yes</Badge>
                                ) : (
                                  <Badge variant="secondary">No</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((leadsPage - 1) * 50) + 1} to {Math.min(leadsPage * 50, leadsData.total)} of {leadsData.total.toLocaleString()} leads
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeadsPage(p => Math.max(1, p - 1))}
                          disabled={leadsPage <= 1 || leadsLoading}
                          data-testid="button-prev-leads"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center px-3 text-sm">
                          Page {leadsPage} of {leadsData.totalPages || 1}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeadsPage(p => Math.min(leadsData.totalPages, p + 1))}
                          disabled={leadsPage >= leadsData.totalPages || leadsLoading || leadsData.totalPages === 0}
                          data-testid="button-next-leads"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    No leads captured yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedTranscript} onOpenChange={(open) => !open && setSelectedTranscript(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="dialog-conversation-detail">
          <DialogHeader>
            <DialogTitle>Conversation #{selectedTranscript}</DialogTitle>
            <DialogDescription>
              {conversationDetail && (
                <>
                  Started {format(new Date(conversationDetail.transcript.startTime), 'PPpp')}
                  {conversationDetail.transcript.endTime && 
                    ` • Ended ${format(new Date(conversationDetail.transcript.endTime), 'PPpp')}`
                  }
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {conversationDetail ? (
              <div className="space-y-4">
                {conversationDetail.transcript.summary && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm">{conversationDetail.transcript.summary}</p>
                  </div>
                )}
                
                <div className="space-y-3">
                  {conversationDetail.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.role === 'user' || message.role === 'Guest'
                          ? 'bg-slate-100 dark:bg-slate-800 ml-8'
                          : 'bg-blue-100 dark:bg-blue-900 mr-8'
                      }`}
                      data-testid={`message-${message.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{message.role}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.timestamp), 'p')}
                        </span>
                        {message.messageType && (
                          <Badge variant="outline" className="text-xs">
                            {message.messageType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <Skeleton className="h-20 w-full" />
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
