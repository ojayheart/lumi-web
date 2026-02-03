import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  MousePointer, 
  MessageSquare, 
  Phone, 
  Clock, 
  Mail, 
  Users, 
  TrendingUp,
  Plus,
  Trash2,
  Shield,
  BarChart3,
  Construction
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface WidgetAnalyticsSummary {
  widgetOpens: number;
  widgetCloses: number;
  chatStarts: number;
  totalConversations: number;
  textConversations: number;
  voiceConversations: number;
  avgDurationSeconds: number;
  avgMessagesPerConversation: number;
  emailsCaptured: number;
  emailsCapturedThisMonth: number;
  uniqueVisitors: number;
}

interface AnalyticsFilter {
  id: number;
  filterType: string;
  value: string;
  label: string | null;
  active: boolean;
  createdAt: string;
}

interface MonthlyEmailStat {
  month: string;
  count: number;
}

export default function WidgetAnalytics() {
  const [newIp, setNewIp] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const queryClientInstance = useQueryClient();

  const { data: summary, isLoading: isLoadingSummary } = useQuery<WidgetAnalyticsSummary>({
    queryKey: ['/api/analytics/widget-summary'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/widget-summary');
      if (!response.ok) throw new Error('Failed to fetch widget analytics');
      return response.json();
    },
  });

  const { data: monthlyEmails, isLoading: isLoadingMonthly } = useQuery<MonthlyEmailStat[]>({
    queryKey: ['/api/analytics/monthly-emails'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/monthly-emails?months=12');
      if (!response.ok) throw new Error('Failed to fetch monthly email stats');
      return response.json();
    },
  });

  const { data: filters, isLoading: isLoadingFilters } = useQuery<AnalyticsFilter[]>({
    queryKey: ['/api/analytics/filters'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/filters');
      if (!response.ok) throw new Error('Failed to fetch filters');
      return response.json();
    },
  });

  const addFilterMutation = useMutation({
    mutationFn: async (data: { value: string; label: string }) => {
      const response = await apiRequest('POST', '/api/analytics/filters', data);
      return response.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/analytics/filters'] });
      setNewIp('');
      setNewLabel('');
      setIsAddFilterOpen(false);
    },
  });

  const updateFilterMutation = useMutation({
    mutationFn: async (data: { id: number; active: boolean }) => {
      const response = await apiRequest('PATCH', `/api/analytics/filters/${data.id}`, { active: data.active });
      return response.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/analytics/filters'] });
    },
  });

  const deleteFilterMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/analytics/filters/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['/api/analytics/filters'] });
    },
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <Construction className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Work in Progress</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Analytics tracking is currently being set up. Data shown may be incomplete or unavailable.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Widget Opens</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-widget-opens">{summary?.widgetOpens || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {summary?.widgetCloses || 0} closes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Starts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-chat-starts">{summary?.chatStarts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {summary?.uniqueVisitors || 0} unique visitors
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-avg-duration">
                  {formatDuration(summary?.avgDurationSeconds || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg {(summary?.avgMessagesPerConversation || 0).toFixed(1)} messages
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Captured</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="stat-emails-captured">{summary?.emailsCapturedThisMonth || 0}</div>
                <p className="text-xs text-muted-foreground">
                  This month ({summary?.emailsCaptured || 0} in period)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Conversation Channels
            </CardTitle>
            <CardDescription>Text vs Voice conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span>Text Conversations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" data-testid="stat-text-conversations">
                      {summary?.textConversations || 0}
                    </span>
                    <Badge variant="secondary">
                      {summary?.totalConversations 
                        ? Math.round((summary.textConversations / summary.totalConversations) * 100) 
                        : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full" 
                    style={{ 
                      width: `${summary?.totalConversations 
                        ? (summary.textConversations / summary.totalConversations) * 100 
                        : 0}%` 
                    }}
                  />
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-500" />
                    <span>Voice Conversations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" data-testid="stat-voice-conversations">
                      {summary?.voiceConversations || 0}
                    </span>
                    <Badge variant="secondary">
                      {summary?.totalConversations 
                        ? Math.round((summary.voiceConversations / summary.totalConversations) * 100) 
                        : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-purple-500 h-3 rounded-full" 
                    style={{ 
                      width: `${summary?.totalConversations 
                        ? (summary.voiceConversations / summary.totalConversations) * 100 
                        : 0}%` 
                    }}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total Conversations</span>
                    <span className="font-medium text-foreground" data-testid="stat-total-conversations">
                      {summary?.totalConversations || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Email Captures
            </CardTitle>
            <CardDescription>Emails collected per month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMonthly ? (
              <Skeleton className="h-32 w-full" />
            ) : monthlyEmails && monthlyEmails.length > 0 ? (
              <div className="space-y-2">
                {monthlyEmails.slice(-6).map((stat) => (
                  <div key={stat.month} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{stat.month}</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="bg-green-500 h-4 rounded"
                        style={{ 
                          width: `${Math.max(4, (stat.count / Math.max(...monthlyEmails.map(s => s.count), 1)) * 100)}px` 
                        }}
                      />
                      <span className="text-sm font-medium w-8 text-right" data-testid={`stat-monthly-${stat.month}`}>
                        {stat.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No email data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                IP Exclusions
              </CardTitle>
              <CardDescription>
                Exclude specific IP addresses from analytics tracking (e.g., your team's IPs)
              </CardDescription>
            </div>
            <Dialog open={isAddFilterOpen} onOpenChange={setIsAddFilterOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-ip-filter">
                  <Plus className="h-4 w-4 mr-2" />
                  Add IP Filter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add IP Exclusion</DialogTitle>
                  <DialogDescription>
                    Add an IP address or CIDR range to exclude from analytics tracking.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">IP Address or CIDR Range</label>
                    <Input
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      placeholder="e.g., 192.168.1.1 or 10.0.0.0/8"
                      className="mt-1"
                      data-testid="input-new-ip"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Label (Optional)</label>
                    <Input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g., Office Network"
                      className="mt-1"
                      data-testid="input-new-label"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddFilterOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addFilterMutation.mutate({ value: newIp, label: newLabel })}
                    disabled={!newIp || addFilterMutation.isPending}
                    data-testid="button-save-ip-filter"
                  >
                    Add Filter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFilters ? (
            <Skeleton className="h-32 w-full" />
          ) : filters && filters.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP / CIDR</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filters.map((filter) => (
                  <TableRow key={filter.id} data-testid={`filter-row-${filter.id}`}>
                    <TableCell className="font-mono text-sm">{filter.value}</TableCell>
                    <TableCell>{filter.label || '-'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={filter.active}
                        onCheckedChange={(checked) => 
                          updateFilterMutation.mutate({ id: filter.id, active: checked })
                        }
                        data-testid={`switch-filter-${filter.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(filter.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFilterMutation.mutate(filter.id)}
                        disabled={deleteFilterMutation.isPending}
                        data-testid={`button-delete-filter-${filter.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No IP filters configured. Add filters to exclude specific IPs from tracking.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
