import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "llm-context-index")
EMBED_MODEL = os.getenv("PINECONE_EMBED_MODEL", "llama-text-embed-v2")

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

# Global namespace variable - set by main.py
current_namespace = "default"

def set_namespace(namespace):
    """Set the current namespace for all operations"""
    global current_namespace
    current_namespace = namespace

def embed_text(text, input_type):
    try:
        response = pc.inference.embed(
            model=EMBED_MODEL,
            inputs=[text],
            parameters={"input_type": input_type}
        )
        return response.data[0].values
    except Exception as e:
        print(f"Error embedding text: {e}")
        return None

def upsert_message(msg_id, text, turn_id, role):
    try:
        vector = embed_text(text, input_type="passage")
        if vector is None:
            return False
        
        index.upsert(
            vectors=[{
                "id": str(msg_id),
                "values": vector,
                "metadata": {
                    "turn_id": turn_id, 
                    "role": role
                }
            }],
            namespace=current_namespace
        )
        return True
    except Exception as e:
        print(f"Error upserting message: {e}")
        return False

def query_similar_turns(text, threshold=None, top_k=None):
    try:
        if threshold is None:
            threshold = float(os.getenv("SIMILARITY_THRESHOLD", "0.40"))
        if top_k is None:
            top_k = int(os.getenv("TOP_K_RESULTS", "10"))
        
        query_vector = embed_text(text, input_type="query")
        if query_vector is None:
            return [], {}
        
        result = index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
            namespace=current_namespace
        )

        if not result or not result.matches:
            return [], {}

        turn_ids = []
        similarity_scores = {}
        
        for match in result.matches:
            if match.score >= threshold:
                turn_id = int(match.metadata["turn_id"])
                turn_ids.append(turn_id)
                # Keep the highest score for each turn_id
                if turn_id not in similarity_scores or match.score > similarity_scores[turn_id]:
                    similarity_scores[turn_id] = match.score
        
        return turn_ids, similarity_scores
    except Exception as e:
        print(f"Error querying similar turns: {e}")
        return [], {}

def delete_namespace(namespace):
    """Delete all vectors in a namespace"""
    try:
        index.delete(delete_all=True, namespace=namespace)
        return True
    except Exception as e:
        print(f"Error deleting namespace: {e}")
        return False