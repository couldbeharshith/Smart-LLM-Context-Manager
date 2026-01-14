import json
import os
from datetime import datetime

CHATS_FILE = "chat_data/chats.json"

class ChatManager:
    def __init__(self):
        # Ensure chat data directory exists
        os.makedirs("chat_data", exist_ok=True)
        self.chats = self.load_chats()
    
    def load_chats(self):
        """Load chat metadata from file"""
        if os.path.exists(CHATS_FILE):
            try:
                with open(CHATS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading chats: {e}")
                return {}
        return {}
    
    def save_chats(self):
        """Save chat metadata to file"""
        try:
            with open(CHATS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.chats, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving chats: {e}")
    
    def list_chats(self):
        """Return list of chat names with metadata"""
        return self.chats
    
    def chat_exists(self, chat_name):
        """Check if a chat exists"""
        return chat_name in self.chats
    
    def create_chat(self, chat_name):
        """Create a new chat session"""
        namespace = self.sanitize_namespace(chat_name)
        self.chats[chat_name] = {
            "namespace": namespace,
            "created_at": datetime.now().isoformat(),
            "last_accessed": datetime.now().isoformat(),
            "message_count": 0,
            "system_instructions": None
        }
        self.save_chats()
        return namespace
    
    def set_system_instructions(self, chat_name, instructions):
        """Set system instructions for a chat"""
        if chat_name in self.chats:
            self.chats[chat_name]["system_instructions"] = instructions
            self.save_chats()
    
    def get_system_instructions(self, chat_name):
        """Get system instructions for a chat"""
        if chat_name in self.chats:
            return self.chats[chat_name].get("system_instructions")
        return None
    
    def get_namespace(self, chat_name):
        """Get namespace for a chat"""
        if chat_name in self.chats:
            self.chats[chat_name]["last_accessed"] = datetime.now().isoformat()
            self.save_chats()
            return self.chats[chat_name]["namespace"]
        return None
    
    def update_message_count(self, chat_name):
        """Increment message count for a chat"""
        if chat_name in self.chats:
            self.chats[chat_name]["message_count"] += 1
            self.save_chats()
    
    def delete_chat(self, chat_name):
        """Delete a chat session"""
        if chat_name in self.chats:
            del self.chats[chat_name]
            self.save_chats()
            return True
        return False
    
    @staticmethod
    def sanitize_namespace(chat_name):
        """Convert chat name to valid namespace"""
        # Replace spaces and special chars with underscores
        namespace = "".join(c if c.isalnum() else "_" for c in chat_name)
        namespace = namespace.lower().strip("_")
        return namespace[:63]  # Pinecone namespace max length
