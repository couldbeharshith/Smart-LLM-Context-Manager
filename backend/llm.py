from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
LLM_MODEL = os.getenv("LLM_MODEL", "models/gemini-flash-latest")

def ask_llm(prompt):
    try:
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            )
        )
        return response.text
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return "Sorry, I encountered an error processing your request."

def ask_llm_stream(prompt):
    """Stream LLM response"""
    try:
        response = client.models.generate_content_stream(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            )
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        print(f"Error calling LLM: {e}")
        yield "Sorry, I encountered an error processing your request."
