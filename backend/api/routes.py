from fastapi import APIRouter, HTTPException, UploadFile, File
from models.schemas import ChatRequest, SessionCreate, ProjectCreate, FeedbackRequest
from services.agent import AgentService
import time
from services.storage import storage
import uuid

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.post("/sessions")
def create_session(session: SessionCreate):
    try:
        res = storage.create_session(session.title, session.project_id)
        if res:
            return res
    except Exception as e:
        print(f"Failed to create session in Supabase: {e}")
    # Fallback
    return {"id": str(uuid.uuid4()), "title": session.title, "project_id": session.project_id}

@router.get("/sessions")
def get_sessions(project_id: str | None = None):
    try:
        res = storage.get_sessions(project_id)
        return res
    except Exception as e:
        print(f"Failed to get sessions from Supabase: {e}")
        return []

@router.get("/projects")
def get_projects():
    try:
        return storage.get_projects()
    except Exception as e:
        print(f"Failed to get projects: {e}")
        return []

@router.post("/projects")
def create_project(project: ProjectCreate):
    try:
        return storage.create_project(project.name, project.description)
    except Exception as e:
        print(f"Failed to create project: {e}")
        return None

@router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    return storage.delete_project(project_id)

@router.post("/sessions/{session_id}/move")
def move_session(session_id: str, payload: dict):
    project_id = payload.get("project_id")
    return storage.move_session_to_project(session_id, project_id)

@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: str):
    try:
        res = storage.get_messages(session_id)
        return res
    except Exception as e:
        print(f"Failed to get messages: {e}")
        return []

@router.post("/chat")
def chat(request: ChatRequest):
    try:
        # 1. save user message to DB
        storage.add_message(request.session_id, "user", request.message)
        
        # 2. get history
        history = storage.get_messages(request.session_id)
        
        # Build message array for LLM
        api_messages = []
        for msg in history:
            api_messages.append({"role": msg.get("role"), "content": msg.get("content")})
        
        # Fallback if DB fails
        if not api_messages:
            api_messages = [{"role": "user", "content": request.message}]
            
        # 3. Call agent with timing
        start_time = time.time()
        ai_response = AgentService.chat(api_messages, use_search=request.use_search, use_rag=request.use_rag)
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        # 4. Save AI response
        storage.add_message(request.session_id, "assistant", ai_response)
        
        # 5. Auto-rename session if it's the first message
        if len(history) == 1:
            title = AgentService.summarize_title(request.message)
            if storage.supabase:
                 storage.supabase.table("sessions").update({"title": title}).eq("id", request.session_id).execute()
        
        return {"reply": ai_response, "elapsed_ms": elapsed_ms}
    except Exception as e:
        import traceback
        error_msg = f"Chat Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    from services.parser import process_document
    content = await file.read()
    
    num_chunks = process_document(content, file.filename)
    return {"message": f"Successfully processed {file.filename}", "chunks": num_chunks}

@router.delete("/sessions/{session_id}/messages")
def clear_messages(session_id: str):
    return {"success": storage.clear_messages(session_id)}

@router.post("/feedback")
async def post_feedback(request: FeedbackRequest):
    await storage.save_feedback(request.session_id, request.message_content, request.rating, request.comment)
    return {"status": "ok"}

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    await storage.delete_session(session_id)
    return {"status": "ok"}
