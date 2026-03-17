import requests
import json
from core.config import settings

class SerperClient:
    def __init__(self):
        self.api_key = settings.SERPER_API_KEY
        self.url = "https://google.serper.dev/search"
        
    def search(self, query: str, num_results: int = 3) -> str:
        if not self.api_key:
            return "Web search is currently unavailable (No API Key)."
            
        payload = json.dumps({
            "q": query,
            "num": num_results
        })
        headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.request("POST", self.url, headers=headers, data=payload)
            response.raise_for_status()
            data = response.json()
            
            # Format results into a concise context string for the LLM
            context = "Web Search Results:\n"
            if 'organic' in data:
                for idx, result in enumerate(data['organic'][:num_results]):
                    context += f"{idx+1}. {result.get('title', '')} - {result.get('snippet', '')}\n"
                    
            if 'answerBox' in data:
                context = f"Quick Answer: {data['answerBox'].get('snippet', data['answerBox'].get('answer', ''))}\n" + context
                
            return context
        except Exception as e:
            return f"Error performing web search: {str(e)}"
