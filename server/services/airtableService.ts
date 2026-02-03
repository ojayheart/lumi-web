import Airtable from 'airtable';

const AIRTABLE_BASE_ID = 'appnNWO7ArRjVGM2E';
const AIRTABLE_TABLE_ID = 'tblzjSaOCjIP8K5dF';

// Get API key and log for debugging
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
console.log('Airtable API Key present:', !!AIRTABLE_API_KEY);

if (!AIRTABLE_API_KEY) {
  console.error('AIRTABLE_API_KEY is not set. Airtable integration will not work.');
  throw new Error('AIRTABLE_API_KEY is required');
}

// Initialize Airtable with Personal Access Token
const airtable = new Airtable({
  apiKey: AIRTABLE_API_KEY,
  endpointUrl: 'https://api.airtable.com',
  requestTimeout: 30000  // 30 second timeout
});

const base = airtable.base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_ID);

interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  retreatDate?: string;
  notes?: string;
}

interface KnowledgeGapData {
  question: string;
  answer: string;
  note?: string;
  conversationId?: number;
  messageId?: number;
  flaggedAt?: string;
}

const QUESTIONS_TABLE_ID = 'tbl5ml177JepTjmGy';

/**
 * Service for interacting with Airtable
 */
export class AirtableService {
  /**
   * Create a new lead record in Airtable
   */
  public async createLeadRecord(leadData: LeadData): Promise<string | null> {
    if (!process.env.AIRTABLE_API_KEY) {
      console.error('Cannot create Airtable record: API key not set');
      return null;
    }

    try {
      // Split name into first and last name if not already provided
      let firstName = leadData.firstName;
      let lastName = leadData.lastName;
      if (!firstName || !lastName) {
        const nameParts = leadData.firstName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Format transcript for notes with proper guest name
      const transcriptNotes = leadData.notes ? 
        `Conversation Transcript:\n${leadData.notes.replace(/Guest:/g, `${firstName}:`).replace(/Guest :/g, `${firstName}:`).replace(/user:/g, `${firstName}:`).replace(/User:/g, `${firstName}:`)}\n` : '';

      const record = await table.create({
        'name': `${firstName} ${lastName}`.trim(),
        'email': leadData.email,
        'phone number': leadData.phone || '',
        'retreat date': leadData.retreatDate || '',
        'notes': transcriptNotes,
        'first name': firstName,
        'last name': lastName,
        'transcript': leadData.notes || '' // Store full transcript separately if needed
      });

      console.log(`Created Airtable record: ${record.getId()}`);
      return record.getId();
    } catch (error: any) {
      console.error('Error creating Airtable record:', error);
      // Log detailed error information
      if (error.response) {
        console.error('Airtable error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return null;
    }
  }

  /**
   * Create a knowledge gap record for flagged incorrect information
   */
  public async createKnowledgeGapRecord(data: KnowledgeGapData): Promise<string | null> {
    if (!process.env.AIRTABLE_API_KEY) {
      console.error('Cannot create Airtable record: API key not set');
      return null;
    }

    try {
      const questionsTable = base(QUESTIONS_TABLE_ID);
      
      // Only use Question and Answer fields - the core fields for VoiceFlow's knowledge base
      const record = await questionsTable.create({
        'Question': data.question,
        'Answer': data.answer
      });

      console.log(`Created knowledge gap record: ${record.getId()}`);
      return record.getId();
    } catch (error: any) {
      console.error('Error creating knowledge gap record:', error);
      if (error.message) {
        console.error('Airtable error message:', error.message);
      }
      return null;
    }
  }
}

// Export a singleton instance
export const airtableService = new AirtableService();