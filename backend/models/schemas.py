from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    session_id: str
    message: str
    use_search: bool = True
    use_rag: bool = False

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Project(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: str

class SessionCreate(BaseModel):
    title: str
    project_id: Optional[str] = None
    device_id: Optional[str] = None

class FeedbackRequest(BaseModel):
    session_id: str
    message_id: Optional[str] = None
    rating: int  # 1 for up, -1 for down
