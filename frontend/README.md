# LLM Context Management - Frontend

Beautiful Next.js frontend with dual-panel visualization for context management.

## Features

- **Dual Panel Layout**: Context window vs Full history
- **Real-time Updates**: See context change as you chat
- **Visual Similarity Scores**: Color-coded relevance indicators
- **Chat Management**: Create and switch between multiple chats
- **Responsive Design**: Beautiful gradient UI with Tailwind CSS

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Components

- **ChatSelector**: Initial screen for selecting/creating chats
- **ContextPanel**: Left panel showing active context sent to LLM
- **HistoryPanel**: Right panel showing complete conversation
- **ChatInput**: Message input with send functionality

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Hooks
