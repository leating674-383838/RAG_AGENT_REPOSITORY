import openai
import os
from core.config import settings
from services.serper import SerperClient

# Clients are initialized lazily or with fallbacks
def get_chat_client():
    key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    base = settings.GROQ_API_BASE or "https://api.groq.com/openai/v1"
    return openai.OpenAI(api_key=key, base_url=base)

def get_embed_client():
    key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    base = settings.OPENAI_API_BASE or "https://api.openai.com/v1"
    return openai.OpenAI(api_key=key, base_url=base)

serper_client = SerperClient()

class AgentService:
    @staticmethod
    def chat(messages, use_search=False, use_rag=False):
        system_prompt = (
            "你是一个高度智能的问答助手。"
            "回答问题时请遵循以下规则：\n"
            "1. 如果提供了知识库上下文，优先使用知识库内容回答，并在回答中使用 [来源X] 标注引用。\n"
            "2. 如果知识库中没有相关信息，如实告知用户，不要编造答案。\n"
            "3. 回答需准确、简洁、有条理。"
        )
        
        # 1. Web Search Context
        if use_search and messages:
            last_msg = messages[-1].get("content", "")
            search_context = serper_client.search(last_msg)
            system_prompt += f"\n\n以下是实时网络搜索结果，可用于辅助回答：\n{search_context}"
        
        # 2. Local RAG Context (Excel/Docs)
        if use_rag and messages:
            from services.storage import storage
            last_msg = messages[-1].get("content", "")
            
            try:
                # Use OpenAI for embeddings
                e_client = get_embed_client()
                if e_client.api_key:
                    res = e_client.embeddings.create(
                        model="text-embedding-3-small",
                        input=[last_msg]
                    )
                    query_vector = res.data[0].embedding
                    
                    docs = storage.search_documents("knowledge_base", query_vector, limit=5)
                    if docs:
                        rag_parts = []
                        for idx, d in enumerate(docs, 1):
                            src = d.get('source', '未知来源')
                            text = d.get('text', '')
                            rag_parts.append(f"[来源{idx}] (文件: {src})\n{text}")
                        rag_context = "\n\n".join(rag_parts)
                        system_prompt += f"\n\n以下是从本地知识库检索到的相关内容，请优先引用：\n{rag_context}"
                else:
                    print("Skipping RAG: No OpenAI API Key found.")
            except Exception as e:
                print(f"Error during RAG retrieval: {e}")
            
        try:
            full_msgs = [{"role": "system", "content": system_prompt}] + messages
            
            c_client = get_chat_client()
            if not c_client.api_key:
                return "抱歉，未检测到 GROQ_API_KEY，请在 Render 环境变量中配置。"

            # Use Groq for chat
            response = c_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=full_msgs,
                temperature=0.3,
                timeout=30.0
            )
            return response.choices[0].message.content
        except Exception as e:
            import socket
            hostname = "api.groq.com"
            try:
                ip = socket.gethostbyname(hostname)
                dns_status = f"DNS OK ({ip})"
            except Exception as dns_e:
                dns_status = f"DNS FAIL ({str(dns_e)})"
            
            error_detail = f"Type: {type(e).__name__}, Msg: {str(e)}, DNS: {dns_status}, URL: {settings.GROQ_API_BASE}"
            print(f"Error during Groq chat completion: {error_detail}")
            return f"控制台报错: {type(e).__name__}. 详情: {str(e)}. {dns_status}. 请检查 GROQ_API_KEY 是否正确。"

    @staticmethod
    def summarize_title(message: str) -> str:
        try:
            c_client = get_chat_client()
            if not c_client.api_key:
                return "新对话"
                
            prompt = f"Please provide a very short, concise title (max 4-5 words) summarizing this message: {message}"
            response = c_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
            )
            return response.choices[0].message.content.strip('"').strip()
        except Exception as e:
            print(f"Error during title summarization: {e}")
            return "新对话"
