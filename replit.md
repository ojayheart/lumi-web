# Aro-Ha AI Assistant Widget

## Overview

This is an embeddable AI chat widget built for the Aro-Ha Wellness Retreat. The application provides both voice and text-based chat interfaces, allowing website visitors to interact with an AI assistant to learn about retreat offerings, view images, and access booking information.

The widget is designed to be embedded on third-party websites (particularly Webflow) with a single script tag, providing a seamless conversational experience with minimal setup required.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for the main application
- Vite as the build tool and dev server
- TailwindCSS with Radix UI components for styling
- Shadcn/ui component library for consistent UI patterns

**Key Design Decisions:**

1. **Dual Chat Interface Pattern**: The application supports two distinct chat modes that can be toggled:
   - **ElevenLabs Voice Chat**: Real-time voice conversation using WebSocket connection
   - **Voiceflow Text Chat**: Traditional text-based chat interface
   
   *Rationale*: Provides flexibility for users who prefer voice interaction versus those who prefer typing, accommodating different accessibility needs and usage contexts.

2. **Embeddable Widget Architecture**: Multiple embed script variations (20+ files) demonstrate iterative improvements for cross-platform compatibility:
   - Mobile-responsive design with safe area support for notched devices
   - Pointer-events management to prevent click-through issues
   - Viewport height handling for consistent mobile browser experience
   - Full-screen mode on mobile devices for better UX
   
   *Rationale*: The widget must work seamlessly across diverse websites, platforms, and devices without interfering with host site functionality.

3. **Component-Based UI Structure**:
   - Modular chat components (ChatInterface, VoiceflowChat, ElevenLabsCall)
   - Reusable UI components from Radix/Shadcn
   - Context-based state management (ChatContext)
   
   *Rationale*: Promotes code reusability and maintainability while ensuring consistent behavior across different chat modes.

### Backend Architecture

**Technology Stack:**
- Express.js server (Node.js)
- TypeScript for type safety
- Drizzle ORM for database operations
- Neon (PostgreSQL) for data persistence

**Key Design Decisions:**

1. **API Service Layer Pattern**: 
   - Separate service modules for different integrations (Voiceflow, ElevenLabs, Airtable)
   - Transcript management system for conversation history
   - Image relevance matching using AI
   
   *Rationale*: Separates business logic from route handlers, making the codebase more testable and maintainable.

2. **Conversation State Management**:
   - Server-side transcript storage in PostgreSQL
   - Message-based conversation tracking
   - Session management via unique user/transcript IDs
   
   *Rationale*: Enables persistent conversations, analytics, and the ability to resume chats across sessions.

3. **RESTful API Design**:
   - `/api/transcripts` - Conversation management
   - `/api/config` - Configuration delivery
   - `/api/chat/stream` - Streaming chat responses
   - `/api/leads` - Lead capture and Airtable integration
   - `/api/admin/flag-knowledge-gap` - Flag incorrect AI responses for review
   - `/api/analytics/*` - Widget analytics and event tracking
   
   *Rationale*: Clean separation of concerns with dedicated endpoints for specific functionality.

### Data Architecture

**Database Schema** (via Drizzle ORM):
- `transcripts` table: Stores conversation sessions
- `messages` table: Stores individual messages within transcripts
- Timestamps and metadata for tracking conversation flow

**Data Flow:**
1. User interaction triggers frontend chat component
2. Message sent to appropriate API endpoint (Voiceflow or ElevenLabs)
3. Response processed and stored in database
4. UI updated with response content
5. Optional image relevance check triggers Airtable query

### Integration Patterns

**Client Tool Pattern (ElevenLabs)**:
- Custom client-side tools registered with ElevenLabs agent
- Tool calling mechanism for triggering UI actions
- Examples: `display_retreat_link`, `logMessage`, `speech_to_text`

*Rationale*: Allows the AI to trigger specific client-side behaviors like showing retreat booking links or displaying images, creating a more interactive experience.

**Image Display System (Updated September 2025)**:
- VoiceFlow now handles images directly via its Airtable integration
- Images are delivered as markdown syntax `![alt](url)` embedded in text responses
- ReactMarkdown automatically renders images with responsive CSS styling
- No separate API calls needed for image fetching

*Rationale*: Simplified architecture by using VoiceFlow's native image handling instead of maintaining a separate image service. Images arrive naturally within conversation flow with proper context.

**Lead Magnet System**:
- Tracks conversation engagement (message count, inactivity)
- Triggers email capture forms at strategic points
- SendGrid integration for email delivery

*Rationale*: Converts casual browsers into leads while maintaining a non-intrusive user experience.

## External Dependencies

### Third-Party Services

**ElevenLabs Conversational AI** (`@11labs/client`, `@11labs/react`)
- Real-time voice conversation API
- WebSocket-based communication
- Purpose: Provides natural voice interaction capabilities

**Voiceflow Dialog Manager API**
- Text-based conversational AI
- HTTP-based interaction endpoint
- Purpose: Handles text chat logic and conversation flows

**Airtable** (`airtable`)
- Cloud spreadsheet database
- REST API for data retrieval
- Purpose: Stores and serves retreat images with metadata and descriptions
- Configuration: Base ID and Table ID stored in environment variables

**SendGrid** (`@sendgrid/mail`)
- Transactional email service
- Purpose: Sends lead magnet emails and notifications

**Neon Database** (`@neondatabase/serverless`)
- Serverless PostgreSQL database
- Purpose: Stores conversation transcripts and messages
- Connection: Uses DATABASE_URL environment variable

### API Integrations

**Axios** (`axios`)
- HTTP client for external API calls
- Used for: Voiceflow API, image services, external data fetching

**OpenAI API** (inferred from image relevance logic)
- AI-powered image relevance scoring
- Purpose: Matches user queries to appropriate images

### Development Tools

**Build & Development:**
- Vite - Fast build tool and dev server
- esbuild - JavaScript bundler (for server code)
- tsx - TypeScript execution for development
- Drizzle Kit - Database migrations and schema management

**UI Framework:**
- Radix UI - Headless UI component primitives
- TailwindCSS - Utility-first CSS framework
- class-variance-authority - Component variant management

**Type Safety:**
- TypeScript - Static type checking
- @types packages for third-party libraries

### Environment Configuration

Required environment variables:
- `DATABASE_URL` - Neon PostgreSQL connection string
- ElevenLabs API credentials
- Voiceflow project ID and API key
- Airtable base and table IDs
- SendGrid API key