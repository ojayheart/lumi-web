import { db } from '../server/db';
import { transcripts, messages, leads } from '../shared/schema';
import { desc, eq } from 'drizzle-orm';
import { writeFileSync } from 'fs';
import { format } from 'date-fns';

async function exportTranscripts() {
  console.log('Fetching all transcripts with messages...');
  
  const allTranscripts = await db
    .select({
      id: transcripts.id,
      sessionId: transcripts.sessionId,
      source: transcripts.source,
      ipAddress: transcripts.ipAddress,
      startTime: transcripts.startTime,
      endTime: transcripts.endTime,
      leadId: leads.id,
      leadName: leads.name,
      leadEmail: leads.email,
      leadPhone: leads.phone,
    })
    .from(transcripts)
    .leftJoin(leads, eq(transcripts.id, leads.transcriptId))
    .orderBy(desc(transcripts.startTime));

  console.log(`Found ${allTranscripts.length} transcripts. Fetching all messages in bulk...`);

  // Fetch ALL messages at once
  const allMessages = await db
    .select()
    .from(messages)
    .orderBy(messages.transcriptId, messages.timestamp);

  console.log(`Found ${allMessages.length} messages. Building message map...`);

  // Group messages by transcript ID
  const messagesByTranscript = new Map<number, typeof allMessages>();
  for (const msg of allMessages) {
    if (!messagesByTranscript.has(msg.transcriptId)) {
      messagesByTranscript.set(msg.transcriptId, []);
    }
    messagesByTranscript.get(msg.transcriptId)!.push(msg);
  }

  console.log('Generating CSV...');

  const csvRows: string[] = [];
  
  // CSV Header
  csvRows.push([
    'Transcript ID',
    'Session ID',
    'Date',
    'Time',
    'Source',
    'IP Address',
    'Message Count',
    'Conversation',
    'Lead Name',
    'Lead Email',
    'Lead Phone',
    'Duration (minutes)'
  ].map(field => `"${field}"`).join(','));

  // Escape CSV fields
  const escapeCsv = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Process each transcript
  let processed = 0;
  let exported = 0;
  for (const transcript of allTranscripts) {
    const transcriptMessages = messagesByTranscript.get(transcript.id) || [];

    // Skip transcripts with no messages
    if (transcriptMessages.length === 0) {
      processed++;
      continue;
    }

    // Build conversation text
    const conversationText = transcriptMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join(' | ');

    // Calculate duration
    let duration = '';
    if (transcript.startTime && transcript.endTime) {
      const durationMs = new Date(transcript.endTime).getTime() - new Date(transcript.startTime).getTime();
      duration = (durationMs / 60000).toFixed(1);
    }

    csvRows.push([
      transcript.id,
      transcript.sessionId,
      format(new Date(transcript.startTime), 'yyyy-MM-dd'),
      format(new Date(transcript.startTime), 'HH:mm:ss'),
      transcript.source,
      transcript.ipAddress || '',
      transcriptMessages.length,
      conversationText,
      transcript.leadName || '',
      transcript.leadEmail || '',
      transcript.leadPhone || '',
      duration
    ].map(escapeCsv).join(','));

    processed++;
    exported++;
    if (processed % 5000 === 0) {
      console.log(`Processed ${processed}/${allTranscripts.length} transcripts (${exported} with messages)...`);
    }
  }

  const csvContent = csvRows.join('\n');
  const filename = `engaged-transcripts-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
  
  writeFileSync(filename, csvContent, 'utf-8');
  
  console.log(`✅ Export complete! Saved to: ${filename}`);
  console.log(`Total transcripts with messages exported: ${exported} out of ${allTranscripts.length}`);
}

exportTranscripts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
  });
