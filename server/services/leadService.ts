import { transcriptStorage } from '../storage';

/**
 * Service for managing lead generation and capture
 */
export class LeadService {
  private static instance: LeadService;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): LeadService {
    if (!LeadService.instance) {
      LeadService.instance = new LeadService();
    }
    return LeadService.instance;
  }
  
  /**
   * Create a new lead
   */
  public async createLead(
    transcriptId: number,
    name: string,
    email: string,
    phone?: string,
    rawMetadata?: Record<string, any>
  ): Promise<number> {
    try {
      // Convert the raw metadata to the expected format
      const metadata = rawMetadata ? {
        prompt: rawMetadata.prompt,
        userAgent: rawMetadata.userAgent,
        deviceInfo: rawMetadata.deviceInfo,
        referrer: rawMetadata.referrer
      } : null;
      
      const leadId = await transcriptStorage.createLead({
        transcriptId,
        name,
        email,
        phone: phone || null,
        metadata,
        createdAt: new Date(),
        contacted: false
      });
      
      console.log(`Created new lead (ID: ${leadId}) for transcript ${transcriptId}`);
      return leadId;
    } catch (error) {
      console.error(`Error creating lead for transcript ${transcriptId}:`, error);
      throw error;
    }
  }
  
  /**
   * Mark a lead as contacted
   */
  public async markLeadContacted(leadId: number): Promise<void> {
    try {
      await transcriptStorage.markLeadContacted(leadId);
      console.log(`Marked lead ${leadId} as contacted`);
    } catch (error) {
      console.error(`Error marking lead ${leadId} as contacted:`, error);
      throw error;
    }
  }
  
  /**
   * Get all leads with pagination
   */
  public async getLeads(page = 1, limit = 20) {
    try {
      return await transcriptStorage.getLeads(page, limit);
    } catch (error) {
      console.error('Error getting leads:', error);
      throw error;
    }
  }
}

export const leadService = LeadService.getInstance();