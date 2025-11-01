# backend/ai_service.py

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class AIService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')

    def summarize(self, text: str) -> str:
        try:
            response = self.model.generate_content(f"Summarize the following:\n{text}")
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"

    def rewrite(self, text: str) -> str:
        try:
            response = self.model.generate_content(f"Rewrite and improve the following:\n{text}")
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"
