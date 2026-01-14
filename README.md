# LLM Context Management System

An intelligent context management system for LLM conversations using semantic search and vector embeddings. This educational project demonstrates how to maintain relevant context in long conversations by retrieving semantically similar past interactions.

## 🎯 Project Overview

This system solves the problem of context window limitations in LLMs by:
- **Semantic Search**: Uses Pinecone vector database to find relevant past conversations
- **Dynamic Context**: Only sends relevant turns to the model, not the entire history
- **Multi-Chat Support**: Maintains separate namespaces for different conversation topics
- **Real-time Visualization**: Shows both active context and full history side-by-side

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │   Context Panel      │  │    History Panel         │    │
│  │  (Relevant Turns)    │  │  (Full Conversation)     │    │
│  └──────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Chat       │  │   History    │  │   Memory     │     │
│  │   Manager    │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │   Pinecone   │        │    Gemini    │
        │   (Vectors)  │        │     (LLM)    │
        └──────────────┘        └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- Pinecone API key
- Google Gemini API key

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

Create `backend/.env`:
```env
PINECONE_API_KEY=your_pinecone_key
GEMINI_API_KEY=your_gemini_key
LLM_MODEL=models/gemini-flash-latest
PINECONE_INDEX_NAME=llm-context-index
PINECONE_EMBED_MODEL=llama-text-embed-v2
SIMILARITY_THRESHOLD=0.40
TOP_K_RESULTS=10
```

Run backend:
```bash
python api.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📊 How It Works

### 1. **Message Flow**
```
User Input → Semantic Search → Context Retrieval → LLM → Response
                    ↓
              Pinecone Query
                    ↓
            Similar Past Turns
```

### 2. **Context Selection**
- User sends a message
- System embeds the message using Pinecone's embedding model
- Queries vector database for similar past turns (threshold: 0.40)
- Builds context from relevant turns + last turn
- Sends context + new message to Gemini

### 3. **Dual Panel Visualization**

**Left Panel (Context Window)**
- Shows only the turns sent to the model
- Color-coded by relevance (green = high, yellow = medium, blue = low)
- Displays similarity scores
- This is what the LLM "sees"

**Right Panel (Full History)**
- Complete chronological conversation
- All user messages and assistant responses
- No filtering or selection
- This is the actual conversation flow

## 🎨 Features

### For Students/Professors
- **Visual Learning**: See exactly what context the model receives
- **Similarity Scores**: Understand how semantic search works
- **Real-time Updates**: Watch context change with each message
- **Multiple Chats**: Experiment with different conversation topics

### Technical Features
- FastAPI backend with async support
- Next.js 14 with App Router
- Tailwind CSS for styling
- TypeScript for type safety
- Pinecone for vector storage
- Google Gemini for LLM inference

## 📁 Project Structure

```
.
├── backend/
│   ├── api.py              # FastAPI application
│   ├── chat_manager.py     # Chat session management
│   ├── history_manager.py  # Conversation persistence
│   ├── memory.py           # In-memory data structures
│   ├── pinecone_utils.py   # Vector operations
│   ├── llm.py              # Gemini API wrapper
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx        # Main application
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── ChatSelector.tsx    # Chat selection UI
│   │   ├── ContextPanel.tsx    # Active context display
│   │   ├── HistoryPanel.tsx    # Full history display
│   │   └── ChatInput.tsx       # Message input
│   └── types/
│       └── index.ts        # TypeScript definitions
│
└── README.md
```

## 🔧 Configuration

### Similarity Threshold
Adjust `SIMILARITY_THRESHOLD` in `.env`:
- `0.3-0.4`: More permissive (retrieves more turns)
- `0.5-0.7`: Balanced
- `0.7-0.9`: Strict (only highly similar turns)

### Top K Results
Adjust `TOP_K_RESULTS` to control max retrieved turns:
- Lower (5-10): Faster, less context
- Higher (15-20): More context, slower

## 🎓 Educational Value

This project demonstrates:
1. **Vector Embeddings**: How text is converted to numerical representations
2. **Semantic Search**: Finding similar content by meaning, not keywords
3. **Context Management**: Handling limited context windows in LLMs
4. **Full-stack Development**: React frontend + Python backend
5. **API Design**: RESTful endpoints with FastAPI
6. **Real-time UI**: Dynamic updates and state management

## 📝 API Endpoints

- `GET /chats` - List all chat sessions
- `POST /chats` - Create or open a chat
- `POST /message` - Send a message and get response
- `GET /chat/{name}/history` - Get full conversation history
- `DELETE /chat/{name}` - Delete a chat session

## 🐛 Troubleshooting

**Backend won't start:**
- Check API keys in `.env`
- Ensure Pinecone index exists
- Verify Python dependencies installed

**Frontend can't connect:**
- Ensure backend is running on port 8000
- Check CORS settings in `api.py`
- Verify `http://localhost:8000` is accessible

**No context retrieved:**
- Lower `SIMILARITY_THRESHOLD`
- Check if embeddings are being stored
- Verify Pinecone namespace is correct

## 📄 License

MIT License - Educational Project

## 👥 Authors

Created as an educational demonstration of LLM context management techniques.
