import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogoutButton } from '@/components/LogoutButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, MessageSquare, Phone, ChevronLeft, ChevronRight, Eye, ExternalLink, Users, Mail, CheckCircle, XCircle, AlertTriangle, Search, Loader2, AlertCircle, HelpCircle, MinusCircle, BarChart3 } from 'lucide-react';
import WidgetAnalytics from '@/components/WidgetAnalytics';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface TranscriptRow {
  id: number;
  sessionId: string;
  source: string;
  channel: string | null;
  elevenlabsConversationId: string | null;
  voiceflowSessionId: string | null;
  ipAddress: string | null;
  startTime: string;
  endTime: string | null;
  messageCount: number;
  leadCaptured: boolean;
  leadName: string | null;
  leadEmail: string | null;
}

interface PaginatedTranscripts {
  data: TranscriptRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LeadRow {
  id: number;
  transcriptId: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  contacted: boolean;
  leadSource: string | null;
}

interface PaginatedLeads {
  data: LeadRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface KnowledgeGapRow {
  id: number;
  transcriptId: number;
  question: string;
  lumiResponse: string | null;
  severity: 'unanswered' | 'incorrect' | 'incomplete';
  status: 'new' | 'reviewed' | 'resolved' | 'false_positive';
  aiSuggestedAnswer: string | null;
  humanCorrection: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface PaginatedKnowledgeGaps {
  data: KnowledgeGapRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface KnowledgeGapStats {
  total: number;
  new: number;
  reviewed: number;
  resolved: number;
  falsePositive: number;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [page, setPage] = useState(1);
  const [leadsPage, setLeadsPage] = useState(1);
  const [gapsPage, setGapsPage] = useState(1);
  const [gapsStatusFilter, setGapsStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [auditStartDate, setAuditStartDate] = useState<Date | undefined>(undefined);
  const [auditEndDate, setAuditEndDate] = useState<Date | undefined>(undefined);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGapRow | null>(null);
  const [isGapDialogOpen, setIsGapDialogOpen] = useState(false);
  const [humanCorrection, setHumanCorrection] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Add admin-page class to body for CSS styling (enables scrolling)
  useEffect(() => {
    document.body.classList.add('admin-page');
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, []);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '25');
    params.set('onlyEngaged', 'true');
    if (channelFilter !== 'all') {
      params.set('channel', channelFilter);
    }
    if (startDate) {
      params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params.set('endDate', endDate.toISOString());
    }
    return params.toString();
  };

  const { data: transcriptsData, isLoading } = useQuery<PaginatedTranscripts>({
    queryKey: ['/api/admin/conversations', page, channelFilter, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/admin/conversations?${buildQueryParams()}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
  });

  const { data: leadsData, isLoading: isLoadingLeads } = useQuery<PaginatedLeads>({
    queryKey: ['/api/analytics/leads', leadsPage],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/leads?page=${leadsPage}&limit=25`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  const { data: gapsData, isLoading: isLoadingGaps } = useQuery<PaginatedKnowledgeGaps>({
    queryKey: ['/api/admin/knowledge-gaps', gapsPage, gapsStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', gapsPage.toString());
      params.set('limit', '25');
      if (gapsStatusFilter !== 'all') {
        params.set('status', gapsStatusFilter);
      }
      const response = await fetch(`/api/admin/knowledge-gaps?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch knowledge gaps');
      return response.json();
    },
  });

  const { data: gapsStats } = useQuery<KnowledgeGapStats>({
    queryKey: ['/api/admin/knowledge-gaps/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/knowledge-gaps/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  const auditMutation = useMutation({
    mutationFn: async (params: { startDate: Date; endDate: Date }) => {
      const response = await apiRequest('POST', '/api/admin/knowledge-audit', {
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/knowledge-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/knowledge-gaps/stats'] });
    },
  });

  const updateGapMutation = useMutation({
    mutationFn: async (params: { id: number; status: string; humanCorrection?: string; resolutionNotes?: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/knowledge-gaps/${params.id}`, {
        status: params.status,
        humanCorrection: params.humanCorrection,
        resolutionNotes: params.resolutionNotes,
        resolvedBy: 'admin',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/knowledge-gaps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/knowledge-gaps/stats'] });
      setIsGapDialogOpen(false);
      setSelectedGap(null);
      setHumanCorrection('');
      setResolutionNotes('');
    },
  });

  const handleRunAudit = () => {
    if (auditStartDate && auditEndDate) {
      auditMutation.mutate({ startDate: auditStartDate, endDate: auditEndDate });
    }
  };

  const openGapDialog = (gap: KnowledgeGapRow) => {
    setSelectedGap(gap);
    setHumanCorrection(gap.humanCorrection || '');
    setResolutionNotes(gap.resolutionNotes || '');
    setIsGapDialogOpen(true);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'unanswered':
        return <Badge className="bg-red-500"><HelpCircle className="h-3 w-3 mr-1" />Unanswered</Badge>;
      case 'incorrect':
        return <Badge className="bg-orange-500"><XCircle className="h-3 w-3 mr-1" />Incorrect</Badge>;
      case 'incomplete':
        return <Badge className="bg-yellow-500"><MinusCircle className="h-3 w-3 mr-1" />Incomplete</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />New</Badge>;
      case 'reviewed':
        return <Badge className="bg-blue-500"><Eye className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'false_positive':
        return <Badge variant="secondary">False Positive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (channelFilter !== 'all') {
        params.set('channel', channelFilter);
      }
      if (startDate) {
        params.set('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.set('endDate', endDate.toISOString());
      }
      
      const response = await fetch(`/api/admin/export-csv?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to export');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcripts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setChannelFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage conversations and leads
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'conversations' && (
              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            )}
            <LogoutButton />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="conversations" className="flex items-center gap-2" data-testid="tab-conversations">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2" data-testid="tab-leads">
              <Users className="h-4 w-4" />
              Leads {leadsData?.total ? `(${leadsData.total})` : ''}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>
                  View and filter all chat transcripts
                  {transcriptsData && ` (${transcriptsData.total.toLocaleString()} total)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Channel</label>
                    <select
                      value={channelFilter}
                      onChange={(e) => {
                        setChannelFilter(e.target.value);
                        setPage(1);
                      }}
                      className="flex h-10 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      data-testid="select-channel"
                    >
                      <option value="all">All Channels</option>
                      <option value="text">Text Chat</option>
                      <option value="voice">Voice Chat</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        setStartDate(e.target.value ? new Date(e.target.value) : undefined);
                        setPage(1);
                      }}
                      className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      data-testid="input-start-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        setEndDate(e.target.value ? new Date(e.target.value) : undefined);
                        setPage(1);
                      }}
                      className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      data-testid="input-end-date"
                    />
                  </div>

                  {(channelFilter !== 'all' || startDate || endDate) && (
                    <Button variant="ghost" onClick={clearFilters} data-testid="button-clear-filters">
                      Clear Filters
                    </Button>
                  )}
                </div>

                {isLoading ? (
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
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>External IDs</TableHead>
                            <TableHead>Messages</TableHead>
                            <TableHead>Lead</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transcriptsData.data.map((row) => (
                            <TableRow key={row.id} data-testid={`row-transcript-${row.id}`}>
                              <TableCell className="font-mono text-sm">{row.id}</TableCell>
                              <TableCell>
                                {format(new Date(row.startTime), 'MMM d, yyyy')}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(row.startTime), 'h:mm a')}
                                </span>
                              </TableCell>
                              <TableCell>
                                {row.channel === 'voice' ? (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                    <Phone className="h-3 w-3 mr-1" />
                                    Voice
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Text
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {row.elevenlabsConversationId && (
                                    <a
                                      href={`https://elevenlabs.io/app/conversational-ai/history?conversation_id=${row.elevenlabsConversationId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                                      title={row.elevenlabsConversationId}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      ElevenLabs
                                    </a>
                                  )}
                                  {row.voiceflowSessionId && (
                                    <a
                                      href="https://creator.voiceflow.com/"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                      title={row.voiceflowSessionId}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Voiceflow
                                    </a>
                                  )}
                                  {!row.elevenlabsConversationId && !row.voiceflowSessionId && (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{row.messageCount} messages</Badge>
                              </TableCell>
                              <TableCell>
                                {row.leadCaptured ? (
                                  <div>
                                    <Badge className="bg-green-500">{row.leadName}</Badge>
                                    <br />
                                    <span className="text-xs text-muted-foreground">{row.leadEmail}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/conversation/${row.id}`)}
                                  data-testid={`button-view-${row.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, transcriptsData.total)} of {transcriptsData.total.toLocaleString()} conversations
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page <= 1 || isLoading}
                          data-testid="button-prev-page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center px-3 text-sm">
                          Page {page} of {transcriptsData.totalPages || 1}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(transcriptsData.totalPages, p + 1))}
                          disabled={page >= transcriptsData.totalPages || isLoading}
                          data-testid="button-next-page"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    No conversations found matching your filters
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Leads</CardTitle>
                <CardDescription>
                  All captured leads from chat conversations
                  {leadsData && ` (${leadsData.total} total)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLeads ? (
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
                            <TableHead>Captured At</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Contacted</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leadsData.data.map((lead) => (
                            <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                              <TableCell className="font-medium">{lead.name}</TableCell>
                              <TableCell>
                                <a 
                                  href={`mailto:${lead.email}`} 
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                >
                                  <Mail className="h-3 w-3" />
                                  {lead.email}
                                </a>
                              </TableCell>
                              <TableCell>{lead.phone || '-'}</TableCell>
                              <TableCell>
                                {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(lead.createdAt), 'h:mm a')}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{lead.leadSource || 'chat_widget'}</Badge>
                              </TableCell>
                              <TableCell>
                                {lead.contacted ? (
                                  <Badge className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Yes
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    No
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/conversation/${lead.transcriptId}`)}
                                  data-testid={`button-view-lead-${lead.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Chat
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((leadsPage - 1) * 25) + 1} to {Math.min(leadsPage * 25, leadsData.total)} of {leadsData.total} leads
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeadsPage(p => Math.max(1, p - 1))}
                          disabled={leadsPage <= 1 || isLoadingLeads}
                          data-testid="button-leads-prev-page"
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
                          disabled={leadsPage >= leadsData.totalPages || isLoadingLeads}
                          data-testid="button-leads-next-page"
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

          <TabsContent value="analytics" className="mt-6">
            <WidgetAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
