from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
from datetime import datetime
import asyncio
import os

from memory import MainHistory, LLMContext
from pinecone_utils import upsert_message, query_similar_turns, set_namespace
from llm import ask_llm, ask_llm_stream
from chat_manager import ChatManager
from history_manager import HistoryManager

app = FastAPI(title="LLM Context Management API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active sessions
active_sessions: Dict[str, dict] = {}

class ChatListResponse(BaseModel):
    chats: Dict[str, dict]

class ChatCreateRequest(BaseModel):
    chat_name: str
    system_instructions: Optional[str] = None

class ChatResponse(BaseModel):
    chat_name: str
    namespace: str
    message_count: int
    history: List[dict]
    system_instructions: Optional[str] = None

class MessageRequest(BaseModel):
    chat_name: str
    message: str
    use_full_context: bool = False

class MessageResponse(BaseModel):
    turn_id: int
    user_message: str
    assistant_message: str
    context_turns: List[dict]
    relevant_turn_ids: List[int]
    similarity_scores: Dict[int, float]  # Map turn_id to similarity score

@app.get("/")
def read_root():
    return {"message": "LLM Context Management API", "version": "1.0"}

@app.get("/chats", response_model=ChatListResponse)
def list_chats():
    """List all available chats"""
    chat_manager = ChatManager()
    return {"chats": chat_manager.list_chats()}

@app.post("/chats", response_model=ChatResponse)
def create_or_open_chat(request: ChatCreateRequest):
    """Create a new chat or open existing one"""
    chat_manager = ChatManager()
    chat_name = request.chat_name.strip()
    
    if not chat_name:
        raise HTTPException(status_code=400, detail="Chat name cannot be empty")
    
    # Create or get existing chat
    if chat_manager.chat_exists(chat_name):
        namespace = chat_manager.get_namespace(chat_name)
        is_new = False
        # Get existing system instructions
        system_instructions = chat_manager.get_system_instructions(chat_name)
    else:
        namespace = chat_manager.create_chat(chat_name)
        is_new = True
        system_instructions = request.system_instructions
        # Save system instructions for new chat
        if system_instructions:
            chat_manager.set_system_instructions(chat_name, system_instructions)
    
    # Initialize session
    history = MainHistory()
    history_manager = HistoryManager(chat_name)
    
    # Load existing history
    saved_history = history_manager.load_history()
    if saved_history:
        history.history = saved_history
    
    # Store in active sessions
    active_sessions[chat_name] = {
        "history": history,
        "history_manager": history_manager,
        "namespace": namespace,
        "chat_manager": chat_manager,
        "system_instructions": system_instructions,
        "last_similarity_scores": {}  # Store similarity scores for visualization
    }
    
    set_namespace(namespace)
    
    chat_info = chat_manager.chats.get(chat_name, {})
    
    return {
        "chat_name": chat_name,
        "namespace": namespace,
        "message_count": chat_info.get("message_count", 0),
        "history": history.history,
        "system_instructions": system_instructions
    }

@app.post("/message", response_model=MessageResponse)
def send_message(request: MessageRequest):
    """Send a message and get response"""
    chat_name = request.chat_name
    user_input = request.message.strip()
    use_full_context = request.use_full_context
    
    if not user_input:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Get or create session
    if chat_name not in active_sessions:
        # Initialize session
        chat_manager = ChatManager()
        if not chat_manager.chat_exists(chat_name):
            raise HTTPException(status_code=404, detail="Chat not found")
        
        namespace = chat_manager.get_namespace(chat_name)
        system_instructions = chat_manager.get_system_instructions(chat_name)
        history = MainHistory()
        history_manager = HistoryManager(chat_name)
        saved_history = history_manager.load_history()
        if saved_history:
            history.history = saved_history
        
        active_sessions[chat_name] = {
            "history": history,
            "history_manager": history_manager,
            "namespace": namespace,
            "chat_manager": chat_manager,
            "system_instructions": system_instructions
        }
        set_namespace(namespace)
    
    session = active_sessions[chat_name]
    history = session["history"]
    history_manager = session["history_manager"]
    chat_manager = session["chat_manager"]
    system_instructions = session.get("system_instructions")
    
    set_namespace(session["namespace"])
    
    # Build context
    context = LLMContext()
    context_turns_list = []
    relevant_turn_ids = []
    similarity_scores = {}
    
    if use_full_context:
        # Use all history
        for turn in history.history:
            context.add(turn)
            context_turns_list.append(turn)
            relevant_turn_ids.append(turn["id"])
    else:
        # Query similar turns - get ALL similarity scores with no threshold filtering
        relevant_turn_ids, similarity_scores = query_similar_turns(user_input, threshold=0.0, top_k=len(history.history) if len(history.history) > 0 else 10)
        
        # Store ALL similarity scores for visualization
        session["last_similarity_scores"] = similarity_scores.copy()
        
        # Always include the immediate last turn if history exists
        if len(history.history) > 0:
            last_turn_id = history.history[-1]["id"]
            if last_turn_id not in similarity_scores:
                similarity_scores[last_turn_id] = 0.0
        
        # Filter by threshold for context building
        threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.15"))
        filtered_turn_ids = [tid for tid in similarity_scores.keys() if similarity_scores[tid] >= threshold or tid == (history.history[-1]["id"] if len(history.history) > 0 else -1)]
        
        # Deduplicate and sort
        unique_turn_ids = list(dict.fromkeys(filtered_turn_ids))
        unique_turn_ids.sort()
        
        for tid in unique_turn_ids:
            # Handle both 0-based (old) and 1-based (new) turn IDs
            if tid == 0:
                # Old 0-based system
                if tid < len(history.history):
                    turn = history.history[tid]
                    context.add(turn)
                    context_turns_list.append(turn)
            else:
                # New 1-based system
                if tid <= len(history.history):
                    turn = history.history[tid - 1]
                    context.add(turn)
                    context_turns_list.append(turn)
    
    # Generate prompt and get response
    history_prompt = context.to_prompt()
    
    # Add system instructions if present
    if system_instructions:
        full_prompt = f"System Instructions: {system_instructions}\n\n{history_prompt}User: {user_input}\nAssistant: "
    else:
        full_prompt = history_prompt + f"User: {user_input}\nAssistant: "
    
    reply = ask_llm(full_prompt)
    
    # Save turn
    current_turn_id = history.add_turn(user_input, reply)
    chat_manager.update_message_count(chat_name)
    
    # Upsert to Pinecone
    upsert_message(f"{current_turn_id}_u", user_input, current_turn_id, "user")
    upsert_message(f"{current_turn_id}_l", reply, current_turn_id, "llm")
    
    # Save history
    history_manager.save_history(history.history)
    
    return {
        "turn_id": current_turn_id,
        "user_message": user_input,
        "assistant_message": reply,
        "context_turns": context_turns_list,
        "relevant_turn_ids": list(similarity_scores.keys()) if not use_full_context else relevant_turn_ids,
        "similarity_scores": similarity_scores if not use_full_context else {}
    }

@app.post("/message/stream")
async def send_message_stream(request: MessageRequest):
    """Send a message and get streaming response"""
    chat_name = request.chat_name
    user_input = request.message.strip()
    use_full_context = request.use_full_context
    
    if not user_input:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Get or create session
    if chat_name not in active_sessions:
        chat_manager = ChatManager()
        if not chat_manager.chat_exists(chat_name):
            raise HTTPException(status_code=404, detail="Chat not found")
        
        namespace = chat_manager.get_namespace(chat_name)
        system_instructions = chat_manager.get_system_instructions(chat_name)
        history = MainHistory()
        history_manager = HistoryManager(chat_name)
        saved_history = history_manager.load_history()
        if saved_history:
            history.history = saved_history
        
        active_sessions[chat_name] = {
            "history": history,
            "history_manager": history_manager,
            "namespace": namespace,
            "chat_manager": chat_manager,
            "system_instructions": system_instructions
        }
        set_namespace(namespace)
    
    session = active_sessions[chat_name]
    history = session["history"]
    history_manager = session["history_manager"]
    chat_manager = session["chat_manager"]
    system_instructions = session.get("system_instructions")
    
    set_namespace(session["namespace"])
    
    # Build context
    context = LLMContext()
    context_turns_list = []
    relevant_turn_ids = []
    similarity_scores = {}
    
    if use_full_context:
        for turn in history.history:
            context.add(turn)
            context_turns_list.append(turn)
            relevant_turn_ids.append(turn["id"])
    else:
        # Query similar turns - get ALL similarity scores with no threshold filtering
        relevant_turn_ids, similarity_scores = query_similar_turns(user_input, threshold=0.0, top_k=len(history.history) if len(history.history) > 0 else 10)
        
        # Store ALL similarity scores for visualization
        session["last_similarity_scores"] = similarity_scores.copy()
        
        # Always include the immediate last turn if history exists
        if len(history.history) > 0:
            last_turn_id = history.history[-1]["id"]
            if last_turn_id not in similarity_scores:
                similarity_scores[last_turn_id] = 0.0
        
        # Filter by threshold for context building
        threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.15"))
        filtered_turn_ids = [tid for tid in similarity_scores.keys() if similarity_scores[tid] >= threshold or tid == (history.history[-1]["id"] if len(history.history) > 0 else -1)]
        
        # Deduplicate and sort
        unique_turn_ids = list(dict.fromkeys(filtered_turn_ids))
        unique_turn_ids.sort()
        
        for tid in unique_turn_ids:
            if tid <= len(history.history):
                turn = history.history[tid - 1]
                context.add(turn)
                context_turns_list.append(turn)
    
    # Generate prompt
    history_prompt = context.to_prompt()
    if system_instructions:
        full_prompt = f"System Instructions: {system_instructions}\n\n{history_prompt}User: {user_input}\nAssistant: "
    else:
        full_prompt = history_prompt + f"User: {user_input}\nAssistant: "
    
    # Stream response
    async def generate():
        full_response = ""
        
        # Send metadata first
        metadata = {
            "type": "metadata",
            "context_turns": [{"id": t["id"], "user": t["user"]["text"], "assistant": t["llm"]["text"]} for t in context_turns_list],
            "relevant_turn_ids": list(similarity_scores.keys()) if not use_full_context else relevant_turn_ids,
            "similarity_scores": similarity_scores if not use_full_context else {}
        }
        yield f"data: {json.dumps(metadata)}\n\n"
        
        # Stream LLM response
        for chunk in ask_llm_stream(full_prompt):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
            await asyncio.sleep(0)  # Allow other tasks to run
        
        # Save turn after streaming completes
        current_turn_id = history.add_turn(user_input, full_response)
        chat_manager.update_message_count(chat_name)
        
        # Upsert to Pinecone
        upsert_message(f"{current_turn_id}_u", user_input, current_turn_id, "user")
        upsert_message(f"{current_turn_id}_l", full_response, current_turn_id, "llm")
        
        # Save history
        history_manager.save_history(history.history)
        
        # Send completion
        yield f"data: {json.dumps({'type': 'done', 'turn_id': current_turn_id})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/chat/{chat_name}/history")
def get_chat_history(chat_name: str):
    """Get full conversation history for a chat"""
    if chat_name in active_sessions:
        history = active_sessions[chat_name]["history"]
        return {"history": history.history}
    
    # Load from file
    history_manager = HistoryManager(chat_name)
    saved_history = history_manager.load_history()
    return {"history": saved_history}

@app.get("/chat/{chat_name}/last_similarities")
def get_last_similarities(chat_name: str):
    """Get similarity scores from the last query for visualization"""
    if chat_name not in active_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found. Send a message first.")
    
    similarity_scores = active_sessions[chat_name].get("last_similarity_scores", {})
    
    return {"similarity_scores": similarity_scores}

@app.delete("/chat/{chat_name}")
def delete_chat(chat_name: str):
    """Delete a chat"""
    chat_manager = ChatManager()
    
    if not chat_manager.chat_exists(chat_name):
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete history file
    history_manager = HistoryManager(chat_name)
    history_manager.delete_history()
    
    # Delete from chat manager
    chat_manager.delete_chat(chat_name)
    
    # Remove from active sessions
    if chat_name in active_sessions:
        del active_sessions[chat_name]
    
    return {"message": f"Chat '{chat_name}' deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
