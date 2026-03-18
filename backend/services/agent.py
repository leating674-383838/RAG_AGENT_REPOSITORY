import openai
from core.config import settings
from services.serper import SerperClient

# Initialize Kimi client
client = openai.OpenAI(
    api_key=settings.KIMI_API_KEY,
    base_url="https://api.moonshot.cn/v1",
)
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
                res = client.embeddings.create(
                    model="embedding-2",
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
            except Exception as e:
                print(f"Error during RAG retrieval: {e}")
            
        try:
            full_msgs = [{"role": "system", "content": system_prompt}] + messages
            
            response = client.chat.completions.create(
                model="moonshot-v1-8k",
                messages=full_msgs,
                temperature=0.3,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error during Moonshot chat completion: {e}")
            return f"抱歉，AI 服务暂时不可用。错误详情: {str(e)}"

    @staticmethod
    def summarize_title(message: str) -> str:
        try:
            prompt = f"Please provide a very short, concise title (max 4-5 words) summarizing this message: {message}"
            response = client.chat.completions.create(
                model="moonshot-v1-8k",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
            )
            return response.choices[0].message.content.strip('"').strip()
        except Exception as e:
            print(f"Error during title summarization: {e}")
            return "新对话"
