import json
import os

HISTORY_DIR = "chat_histories"

class HistoryManager:
    def __init__(self, chat_name):
        self.chat_name = chat_name
        # Ensure history directory exists
        os.makedirs(HISTORY_DIR, exist_ok=True)
        self.history_file = os.path.join(HISTORY_DIR, f"history_{self.sanitize_filename(chat_name)}.json")
    
    @staticmethod
    def sanitize_filename(name):
        """Convert chat name to valid filename"""
        return "".join(c if c.isalnum() else "_" for c in name).lower()
    
    def save_history(self, history_list):
        """Save conversation history to file"""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(history_list, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving history: {e}")
    
    def load_history(self):
        """Load conversation history from file"""
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading history: {e}")
                return []
        return []
    
    def delete_history(self):
        """Delete history file"""
        try:
            if os.path.exists(self.history_file):
                os.remove(self.history_file)
                return True
        except Exception as e:
            print(f"Error deleting history: {e}")
        return False
