# CRM MVP

A modern, clean CRM system built with Next.js 14, PostgreSQL, and Prisma.

## Features

- **Authentication**: Email/password login with NextAuth
- **Companies**: Manage company information and relationships
- **Contacts**: Track people and their company associations
- **Deals**: Pipeline management with stages (Lead → Qualified → Proposal → Negotiation → Won/Lost)
- **Tasks**: Task management with due dates and status tracking
- **Notes System**: Create, edit, and manage notes for all entities
- **Activity Timeline**: Chronological view of all activities and notes
- **Global Search**: Search across companies, contacts, deals, and tasks
- **Dashboard**: Key metrics and KPIs
- **NLP Assistant**: AI-powered assistant for natural language CRM interactions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Prisma ORM + pgvector for embeddings
- **Authentication**: NextAuth.js with Credentials Provider
- **Validation**: Zod
- **Forms**: React Hook Form
- **Tables**: TanStack Table
- **AI/LLM**: Ollama (local) or OpenAI (optional)
- **Deployment**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git
- Ollama (optional, for AI assistant)

### Option 1: Automated Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crm-mvp
   ```

2. **Run the startup script**
   ```bash
   # Using npm
   npm run startup

   # Or directly
   ./start.sh
   ```

   The script will:
   - Check system requirements
   - Install dependencies
   - Start PostgreSQL with Docker (includes pgvector)
   - Set up the database schema
   - Seed with demo data
   - Start the development server

3. **Open your browser**
   - Visit `http://localhost:3000`
   - Login with: `admin@example.com` / `password123`

4. **(Optional) Set up Ollama for AI Assistant**
   ```bash
   # Install Ollama (visit https://ollama.com)

   # Pull required models
   ollama pull llama3.1
   ollama pull nomic-embed-text

   # Start Ollama (runs on http://localhost:11434)
   ollama serve
   ```

### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crm-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start PostgreSQL with pgvector**
   ```bash
   docker compose up -d
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # Seed with demo data
   npm run db:seed
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your settings (defaults should work for local development).

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   - Visit `http://localhost:3000`
   - Login with: `admin@example.com` / `password123`

## NLP Assistant Setup

The CRM includes an AI-powered assistant that can search, summarize, draft content, and create records via natural language.

### Local Mode (Default - Ollama)

The assistant runs fully locally using Ollama. No paid APIs required.

1. **Install Ollama**
   - macOS: `brew install ollama`
   - Linux: `curl -fsSL https://ollama.com/install.sh | sh`
   - Windows: Download from https://ollama.com

2. **Pull required models**
   ```bash
   # LLM for chat (pick one)
   ollama pull llama3.1          # Recommended, 8B params
   ollama pull llama3.1:70b      # Better quality, needs more RAM
   ollama pull mistral           # Alternative, good quality

   # Embeddings model for semantic search
   ollama pull nomic-embed-text  # Recommended
   ollama pull mxbai-embed-large # Alternative
   ```

3. **Start Ollama**
   ```bash
   ollama serve
   ```

   Ollama runs on `http://localhost:11434` by default.

4. **Verify in the app**
   - Go to `/assistant` in the CRM
   - The status banner should show "Assistant Ready (Local)"

### OpenAI Mode (Optional)

If you prefer to use OpenAI instead of local models:

1. **Set environment variables**
   ```env
   USE_OPENAI="true"
   OPENAI_API_KEY="sk-..."
   ```

2. **Restart the app**
   - The assistant will use `gpt-4o-mini` and `text-embedding-3-small`

### Assistant Capabilities

The assistant can:

1. **Search**: Find records using natural language
   - "Find my deals in negotiation over $5k closing this month"
   - "Show contacts at Acme Corp"

2. **Summarize**: Get insights from your data
   - "Summarize my last 10 notes for Acme"
   - "What tasks are due this week?"

3. **Draft**: Generate content (output only, won't send)
   - "Write a follow-up email to John about the proposal"
   - "Draft meeting notes for the Acme call"

4. **Create Records**: Propose new records (requires confirmation)
   - "Create a task to call Sarah tomorrow at 2pm"
   - "Add a note to Acme: Had a great demo today"
   - "Create a deal for TechCorp worth $10,000"

### Security

- All queries are scoped to the logged-in user's data
- The assistant cannot access other users' records
- Record creation requires explicit user confirmation
- The assistant will never reveal secrets, env vars, or passwords

## Demo Data

The seed script creates:
- 1 admin user (admin@example.com / password123)
- 10 companies
- 20 contacts
- 15 deals across all pipeline stages
- 20 tasks (mix of open/done)
- 20+ notes with activity

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── assistant/     # Assistant API endpoints
│   ├── assistant/         # Assistant chat page
│   ├── companies/         # Company pages
│   ├── contacts/          # Contact pages
│   ├── deals/             # Deal pages
│   ├── tasks/             # Task pages
│   ├── settings/          # Settings page
│   ├── dashboard/         # Dashboard page
│   └── login/             # Authentication
├── components/            # Reusable components
│   ├── assistant/        # Assistant UI components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── lib/                  # Utilities and configurations
│   ├── actions/          # Server actions
│   ├── ollama.ts         # Ollama integration
│   ├── embeddings.ts     # Embedding pipeline
│   ├── retrieval.ts      # RAG retrieval
│   ├── auth.ts           # NextAuth config
│   └── prisma.ts         # Prisma client
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts          # Seed script
├── scripts/              # Setup scripts
│   └── init-pgvector.sql # pgvector initialization
└── public/               # Static assets
```

## Database Schema

### Core Entities

- **User**: Authentication and ownership
- **Company**: Business organizations
- **Contact**: People with company relationships
- **Deal**: Sales opportunities with pipeline stages
- **Task**: Action items with due dates
- **Note**: Activity and comments on all entities

### Assistant Entities

- **AssistantThread**: Conversation threads
- **AssistantMessage**: Chat messages (user/assistant/system)
- **AssistantAction**: Proposed and executed actions
- **DocumentEmbedding**: Vector embeddings for RAG

### Deal Stages

1. **LEAD**: Initial contact
2. **QUALIFIED**: Validated opportunity
3. **PROPOSAL**: Formal proposal sent
4. **NEGOTIATION**: Terms being discussed
5. **WON**: Deal closed successfully
6. **LOST**: Deal lost to competitor/no decision

## API Design

- **Server Actions**: Used for mutations (create, update, delete)
- **API Routes**: Used for complex queries and external integrations
- **Streaming**: Assistant responses stream via Server-Sent Events
- **Zod Validation**: All inputs validated on server
- **Prisma Includes**: N+1 prevention with proper eager loading

## Permissions

- **Single-tenant**: Users can only see their own records
- **Ownership**: All related records must belong to the same user
- **Server enforcement**: Permissions checked on all operations
- **Assistant scoping**: All RAG queries filtered by ownerUserId

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run startup      # Automated setup and startup script (port 5432)
npm run startup:alt  # Alternative startup script (port 5434)
npm run check-setup  # Validate environment setup
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes (dev only)
npm run db:migrate   # Create and run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

#### Setup Scripts

**Validation Script (`./check-setup.sh`)**
Before running the startup script, you can validate your environment:

```bash
# Run validation
./check-setup.sh

# Or use npm
npm run check-setup
```

This script checks:
- Node.js and npm versions
- Docker and Docker Compose availability
- Required files and dependencies
- Environment configuration

**Startup Script (`./start.sh`)**
The included startup script automates the entire setup process:

- ✅ Checks system requirements (Node.js, Docker)
- ✅ Installs npm dependencies
- ✅ Starts PostgreSQL database with Docker Compose (includes pgvector)
- ✅ Waits for database to be ready
- ✅ Sets up Prisma schema and generates client
- ✅ Seeds database with demo data
- ✅ Starts the development server
- ✅ Provides login credentials

**Usage:**
```bash
# Make executable (first time only)
chmod +x start.sh

# Run the startup script
./start.sh

# Or use npm
npm run startup
```

### Database Management

- **Development**: Use `npm run db:push` for quick schema changes
- **Production**: Use `npm run db:migrate` for versioned migrations
- **Studio**: `npm run db:studio` for database GUI

## Deployment

### Environment Variables

```env
# Core
DATABASE_URL="postgresql://user:password@host:5432/db"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-nextauth-secret"

# Seed User
SEED_USER_EMAIL="admin@yourdomain.com"
SEED_USER_PASSWORD="secure-password"

# Ollama (Local LLM)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1"
OLLAMA_EMBED_MODEL="nomic-embed-text"

# OpenAI (Optional)
USE_OPENAI="false"
OPENAI_API_KEY=""
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker compose -f docker-compose.prod.yml up -d
```

## Recent Features

### 🤖 NLP Assistant (NEW)
- **Natural Language Search**: Find records using conversational queries
- **Summarization**: Get AI-generated summaries of your CRM data
- **Content Drafting**: Generate emails, notes, and other content
- **Record Creation**: Create tasks, notes, and deals via chat
- **Streaming Responses**: Real-time AI responses with Server-Sent Events
- **Action Confirmation**: All write operations require explicit user confirmation
- **Local-First**: Runs completely offline with Ollama

### 📝 Notes System & Activity Timeline
- **Note Creation**: Add notes to companies, contacts, deals, and tasks
- **Activity Timeline**: Chronological view of all activities and interactions
- **Rich Text Notes**: Multi-line notes with full formatting support
- **Contextual Notes**: Notes are linked to specific entities for better organization

### 🔍 Global Search
- **Multi-Entity Search**: Search across companies, contacts, deals, and tasks simultaneously
- **Real-time Results**: Instant search with debounced queries
- **Rich Results**: Detailed search results with entity relationships
- **Quick Navigation**: Click to navigate directly to any result

### 📊 Enhanced Activity Tracking
- **Timeline View**: Visual timeline of all entity activities
- **Activity Types**: Notes, task completions, deal updates, and more
- **Chronological Order**: Activities sorted by most recent first
- **Activity Details**: Expandable activity details with full context

## QA Checklist

### Core Flows
- [x] User can log in with demo credentials (admin@example.com / password123)
- [x] Dashboard shows correct KPIs (open deals: 13, won this month: 4, tasks due soon: 5, total contacts: 20)
- [x] Company CRUD works (list, create, view detail pages)
- [x] Contact CRUD works (list with company associations)
- [x] Deal CRUD works (pipeline stages, amounts, associations)
- [x] Task CRUD works (status management, due dates)
- [x] Notes system works (create, view, timeline)
- [x] Activity timeline displays notes and activities
- [x] Global search works across all entities
- [x] Settings page loads with organization config

### Assistant Flows
- [ ] Assistant page loads with status indicator
- [ ] Ollama status shows "Ready" when Ollama is running
- [ ] Ollama status shows setup instructions when Ollama is not available
- [ ] User can create new chat threads
- [ ] User can send messages and receive streaming responses
- [ ] Search queries return relevant CRM records
- [ ] Citations link to correct record detail pages
- [ ] Action proposals display with confirm/cancel buttons
- [ ] Confirming an action creates the record
- [ ] Canceling an action does not create the record
- [ ] User cannot access other users' data through assistant
- [ ] App works without Ollama (shows helpful banner)

### UI/UX
- [ ] Responsive design on mobile/tablet
- [ ] Loading states during operations
- [ ] Error handling with user-friendly messages
- [ ] Form validation works correctly
- [ ] Navigation works properly
- [ ] Empty states show helpful messages

### Data Integrity
- [ ] Users can only see their own records
- [ ] Deleting companies cascades properly
- [ ] Required fields are enforced
- [ ] Deal stages progress logically

## Troubleshooting

### Ollama Not Detected

If the assistant shows "Local Model Not Detected":

1. **Check if Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Start Ollama:**
   ```bash
   ollama serve
   ```

3. **Verify models are installed:**
   ```bash
   ollama list
   ```

4. **Pull required models:**
   ```bash
   ollama pull llama3.1
   ollama pull nomic-embed-text
   ```

### Port Conflicts (PostgreSQL on port 5432)

If you see "Bind for 0.0.0.0:5432 failed: port is already allocated":

**Solution 1: Use Alternative Port (Recommended)**
```bash
# Use the alternative startup script (port 5434)
./start-alt.sh

# Or with npm
npm run startup:alt
```

**Solution 2: Stop Conflicting Containers**
```bash
# Find what's using port 5432
docker ps | grep 5432

# Stop the conflicting container
docker stop <container-name>

# Then run the normal startup
./start.sh
```

**Solution 3: Change Default Port**
Edit `docker-compose.yml` and change `5432:5432` to `5433:5432`, then update `.env.local` accordingly.

### Database Connection Issues

If you encounter database connection issues:

1. **Check if Docker containers are running:**
   ```bash
   docker ps
   ```

2. **Restart the database:**
   ```bash
   docker compose down
   docker compose up -d
   ```

3. **Reset the database (WARNING: This will delete all data):**
   ```bash
   npm run db:migrate -- --force-reset
   npm run db:seed
   ```

### Environment Variable Issues

If you see "Environment variable not found: DATABASE_URL":

1. **Check if .env.local exists:**
   ```bash
   ls -la .env*
   ```

2. **Recreate the environment file:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database URL
   ```

3. **Verify DATABASE_URL format:**
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/crm_mvp?schema=public"
   ```

4. **For alternative port (5434):**
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5434/crm_mvp?schema=public"
   ```

### Port Conflicts

If port 3000 or 5432 is already in use:

1. **Kill processes using the ports:**
   ```bash
   # Find process using port 3000
   lsof -ti:3000 | xargs kill -9

   # Find process using port 5432
   lsof -ti:5432 | xargs kill -9
   ```

2. **Or change ports in configuration files**

### Permission Issues

If you get permission errors with the startup script:

```bash
chmod +x start.sh
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all lint checks pass

## License

MIT
