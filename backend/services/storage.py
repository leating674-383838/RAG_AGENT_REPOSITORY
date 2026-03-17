from supabase import create_client, Client
from qdrant_client import QdrantClient
from core.config import settings

class StorageService:
    def __init__(self):
        # Initialize Supabase
        self.supabase: Client | None = None
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            except Exception as e:
                print(f"Error initializing Supabase: {e}")
                
        # Initialize Qdrant
        self.qdrant: QdrantClient | None = None
        if settings.QDRANT_URL and settings.QDRANT_API_KEY:
            try:
                self.qdrant = QdrantClient(
                    url=settings.QDRANT_URL, 
                    api_key=settings.QDRANT_API_KEY
                )
            except Exception as e:
                print(f"Error initializing Qdrant: {e}")

    def create_session(self, title: str, project_id: str | None = None):
        if not self.supabase:
            return None
        payload = {"title": title}
        if project_id:
            payload["project_id"] = project_id
        data = self.supabase.table("sessions").insert(payload).execute()
        return data.data[0] if data.data else None

    def get_sessions(self, project_id: str | None = None):
        if not self.supabase:
            return []
        query = self.supabase.table("sessions").select("*")
        if project_id:
            query = query.eq("project_id", project_id)
        else:
            query = query.is_("project_id", "null")
        data = query.order("created_at", desc=True).execute()
        return data.data

    def create_project(self, name: str, description: str | None = None):
        if not self.supabase:
            return None
        data = self.supabase.table("projects").insert({"name": name, "description": description}).execute()
        return data.data[0] if data.data else None

    def get_projects(self):
        if not self.supabase:
            return []
        data = self.supabase.table("projects").select("*").order("created_at", desc=True).execute()
        return data.data

    def delete_project(self, project_id: str):
        if not self.supabase:
            return False
        self.supabase.table("projects").delete().eq("id", project_id).execute()
        return True

    def move_session_to_project(self, session_id: str, project_id: str):
        if not self.supabase:
            return False
        self.supabase.table("sessions").update({"project_id": project_id}).eq("id", session_id).execute()
        return True

    def clear_messages(self, session_id: str):
        if not self.supabase:
            return False
        self.supabase.table("messages").delete().eq("session_id", session_id).execute()
        return True

    def save_feedback(self, session_id: str, message_content: str, rating: str, comment: str | None = None):
        if not self.supabase:
            return None
        data = self.supabase.table("feedback").insert({
            "session_id": session_id,
            "message_content": message_content,
            "rating": rating,
            "comment": comment
        }).execute()
        return data.data[0] if data.data else None

    async def delete_session(self, session_id: str):
        # Cascading delete is handled by DB if configured, but let's be explicit if needed
        # Actually in Supabase/Postgres, if foreign keys have ON DELETE CASCADE, deleting session is enough.
        self.supabase.table("sessions").delete().eq("id", session_id).execute()

    def add_message(self, session_id: str, role: str, content: str):
        if not self.supabase:
            return None
        data = self.supabase.table("messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content
        }).execute()
        return data.data[0] if data.data else None
        
    def get_messages(self, session_id: str):
        if not self.supabase:
            return []
        data = self.supabase.table("messages").select("*").eq("session_id", session_id).order("created_at").execute()
        return data.data

    def search_documents(self, collection_name: str, query_vector: list, limit: int = 3):
        if not self.qdrant:
            return []
        try:
            search_result = self.qdrant.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit
            )
            return [hit.payload for hit in search_result]
        except Exception as e:
            print(f"Error searching Qdrant: {e}")
            return []

    def ensure_collection(self, collection_name: str, vector_size: int = 1280):
        if not self.qdrant:
            return False
        try:
            from qdrant_client.http import models as rest
            collections = self.qdrant.get_collections().collections
            exists = any(c.name == collection_name for c in collections)
            if not exists:
                self.qdrant.create_collection(
                    collection_name=collection_name,
                    vectors_config=rest.VectorParams(size=vector_size, distance=rest.Distance.COSINE),
                )
                print(f"Created collection: {collection_name}")
            return True
        except Exception as e:
            print(f"Error ensuring Qdrant collection: {e}")
            return False

    def upsert_documents(self, collection_name: str, ids: list, vectors: list, payloads: list):
        if not self.qdrant:
            return False
        try:
            from qdrant_client.http import models as rest
            points = [
                rest.PointStruct(id=idx, vector=vec, payload=payload)
                for idx, vec, payload in zip(ids, vectors, payloads)
            ]
            self.qdrant.upsert(collection_name=collection_name, points=points)
            return True
        except Exception as e:
            print(f"Error upserting to Qdrant: {e}")
            return False

storage = StorageService()
