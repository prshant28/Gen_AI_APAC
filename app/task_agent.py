import uuid
import datetime
from typing import List, Dict, Any, Optional
from app.db import get_db

async def create_task(title: str, due_date: str = "", priority: str = "medium", linked_memory_id: str = "") -> dict:
    """
    Creates a new task with a unique UUID and saves it to Firestore.
    """
    db = await get_db()
    task_id = str(uuid.uuid4())
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    task_doc = {
        "id": task_id,
        "title": title,
        "linked_memory_id": linked_memory_id,
        "due_date": due_date,
        "priority": priority,
        "status": "pending",
        "created_at": now
    }
    
    await db.collection("tasks").document(task_id).set(task_doc)
    return task_doc

async def list_tasks(status: str = "pending", limit: int = 10) -> List[dict]:
    """
    Queries Firestore for tasks with a specific status, ordered by creation date.
    """
    db = await get_db()
    # Note: This query requires a composite index in Firestore for 'status' and 'created_at'.
    # If the index is not created, Firestore will return an error with a link to create it.
    query = db.collection("tasks") \
              .where("status", "==", status) \
              .order_by("created_at", direction="DESCENDING") \
              .limit(limit)
    
    docs = query.stream()
    tasks = []
    async for doc in docs:
        tasks.append(doc.to_dict())
    return tasks

async def update_task(task_id: str, title: str = "", due_date: str = "", priority: str = "", status: str = "") -> dict:
    """
    Updates an existing task. Only non-empty fields provided will be updated.
    """
    db = await get_db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = await doc_ref.get()
    
    if not doc.exists:
        raise ValueError(f"Firestore Error: Task with ID '{task_id}' not found.")
    
    updates = {}
    if title: updates["title"] = title
    if due_date: updates["due_date"] = due_date
    if priority: updates["priority"] = priority
    if status: updates["status"] = status
    
    if updates:
        await doc_ref.update(updates)
    
    updated_doc = await doc_ref.get()
    return updated_doc.to_dict()

async def complete_task(task_id: str) -> dict:
    """
    Marks a task as 'completed' and sets the completion timestamp.
    """
    db = await get_db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = await doc_ref.get()
    
    if not doc.exists:
        raise ValueError(f"Firestore Error: Task with ID '{task_id}' not found.")
    
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    updates = {
        "status": "completed",
        "completed_at": now
    }
    
    await doc_ref.update(updates)
    updated_doc = await doc_ref.get()
    return updated_doc.to_dict()

async def delete_task(task_id: str) -> str:
    """
    Deletes a task from Firestore.
    """
    db = await get_db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = await doc_ref.get()
    
    if not doc.exists:
        return f"Error: Task {task_id} not found."
    
    await doc_ref.delete()
    return f"Task {task_id} deleted"

async def get_tasks_summary() -> dict:
    """
    Returns a summary of task statistics, including overdue pending tasks.
    """
    db = await get_db()
    docs = db.collection("tasks").stream()
    
    total = 0
    pending = 0
    completed = 0
    overdue = 0
    today = datetime.date.today().isoformat()
    
    async for doc in docs:
        data = doc.to_dict()
        total += 1
        status = data.get("status")
        
        if status == "completed":
            completed += 1
        elif status == "pending":
            pending += 1
            due_date = data.get("due_date")
            # Simple string comparison for ISO dates works for overdue check
            if due_date and due_date < today:
                overdue += 1
                
    return {
        "total": total,
        "pending": pending,
        "completed": completed,
        "overdue": overdue
    }
