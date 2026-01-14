from memory import MainHistory, LLMContext
from pinecone_utils import upsert_message, query_similar_turns, set_namespace
from llm import ask_llm
from chat_manager import ChatManager
from history_manager import HistoryManager
import os
from dotenv import load_dotenv

load_dotenv()

EXIT_COMMANDS = set(os.getenv("EXIT_COMMANDS", "exit,quit,q").split(","))
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

def select_or_create_chat():
    """Let user select existing chat or create new one"""
    chat_manager = ChatManager()
    
    print("=" * 50)
    print("LLM Context Management Chat")
    print("=" * 50)
    
    chats = chat_manager.list_chats()
    
    if chats:
        print("\nExisting chats:")
        for i, (name, info) in enumerate(chats.items(), 1):
            msg_count = info.get('message_count', 0)
            last_accessed = info.get('last_accessed', 'Unknown')[:10]
            print(f"  {i}. {name} ({msg_count} messages, last: {last_accessed})")
        print()
    
    while True:
        chat_name = input("Enter chat name (or 'list' to see chats again): ").strip()
        
        if chat_name.lower() == 'list':
            chats = chat_manager.list_chats()
            if chats:
                print("\nExisting chats:")
                for i, (name, info) in enumerate(chats.items(), 1):
                    msg_count = info.get('message_count', 0)
                    last_accessed = info.get('last_accessed', 'Unknown')[:10]
                    print(f"  {i}. {name} ({msg_count} messages, last: {last_accessed})")
            else:
                print("No existing chats.")
            continue
        
        if not chat_name:
            print("Chat name cannot be empty.")
            continue
        
        if chat_manager.chat_exists(chat_name):
            namespace = chat_manager.get_namespace(chat_name)
            print(f"\nOpening existing chat: '{chat_name}'")
            return chat_name, namespace, chat_manager
        else:
            namespace = chat_manager.create_chat(chat_name)
            print(f"\nCreated new chat: '{chat_name}'")
            return chat_name, namespace, chat_manager

def main():
    # Select or create chat
    chat_name, namespace, chat_manager = select_or_create_chat()
    set_namespace(namespace)
    
    # Initialize history
    history = MainHistory()
    history_manager = HistoryManager(chat_name)
    
    # Load existing history if available
    saved_history = history_manager.load_history()
    if saved_history:
        history.history = saved_history
        print(f"Loaded {len(saved_history)} previous turns.\n")
    
    context = LLMContext()
    
    print(f"Chat started. Type your message or 'exit' to quit.\n")

    while True:
        try:
            user_input = input("You: ").strip()

            if user_input.lower() in EXIT_COMMANDS:
                history_manager.save_history(history.history)
                print("Chat saved. Exiting...")
                break

            relevant_turn_ids = query_similar_turns(user_input)
            
            context.clear()
            added_turns = set()

            for tid in relevant_turn_ids:
                if tid < len(history.history):
                    context.add(history.history[tid])
                    added_turns.add(tid)

            last_idx = len(history.history) - 1
            if last_idx >= 0 and last_idx not in added_turns:
                context.add(history.history[last_idx])

            history_prompt = context.to_prompt()
            full_prompt = history_prompt + f"User: {user_input}\nAssistant: "
            
            reply = ask_llm(full_prompt)
            print("LLM:", reply)

            current_turn_id = history.add_turn(user_input, reply)
            chat_manager.update_message_count(chat_name)

            upsert_message(f"{current_turn_id}_u", user_input, current_turn_id, "user")
            upsert_message(f"{current_turn_id}_l", reply, current_turn_id, "llm")

            if DEBUG_MODE:
                print("\n---prompt sent---")
                print(full_prompt)
                print("---end prompt---\n")
        
        except KeyboardInterrupt:
            history_manager.save_history(history.history)
            print("\n\nChat interrupted. History saved. Exiting...")
            break
        except EOFError:
            history_manager.save_history(history.history)
            print("\n\nInput stream closed. History saved. Exiting...")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
            print("Continuing chat...\n")

if __name__ == "__main__":
    main()