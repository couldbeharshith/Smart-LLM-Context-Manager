class MainHistory: 
    def __init__(self):
        self.history = []  

    def add_turn(self, user_text, llm_text):
        turn_id = len(self.history) + 1  # Start from 1 instead of 0
        turn = {
            "id": turn_id,
            "user": {"role": "user", "text": user_text},
            "llm": {"role": "llm", "text": llm_text}
        }
        self.history.append(turn)
        return turn_id

class Node:
    def __init__(self, turn):
        self.turn = turn
        self.next = None

class LLMContext:
    def __init__(self):
        self.head = None
        self.tail = None

    def clear(self):
        self.head = None
        self.tail = None

    def add(self, turn):
        node = Node(turn)
        if not self.head:
            self.head = node
            self.tail = node
        else:
            self.tail.next = node
            self.tail = node

    def to_prompt(self):
        prompt = ""
        curr = self.head
        while curr:
            prompt += f"User: {curr.turn['user']['text']}\n"
            if curr.turn.get('llm'):
                prompt += f"Assistant: {curr.turn['llm']['text']}\n"
            curr = curr.next
        return prompt