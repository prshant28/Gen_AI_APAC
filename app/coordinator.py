import os
import asyncio
from typing import List, Dict, Any
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types as genai_types

from app.config import settings
from app.capture_agent import capture
from app.task_agent import create_task, list_tasks
from app.calendar_agent import create_event, list_upcoming_events
from app.recall_agent import recall

# 1. Define Tool Wrappers
async def capture_knowledge_tool(source_type: str, url: str = "", content: str = "") -> dict:
    """Save content from YouTube URLs, web articles, or notes."""
    return await capture(source_type=source_type, url=url, content=content)

async def create_task_tool(title: str, due_date: str = "", priority: str = "medium", linked_memory_id: str = "") -> dict:
    """Create a new task (optionally linked to a memory)."""
    return await create_task(title=title, due_date=due_date, priority=priority, linked_memory_id=linked_memory_id)

async def schedule_event_tool(title: str, date: str, time: str, duration_minutes: int = 60, linked_task_id: str = "") -> dict:
    """Schedule a study session or event on the calendar."""
    return await create_event(title=title, date=date, time=time, duration_minutes=duration_minutes, linked_task_id=linked_task_id)

async def recall_knowledge_tool(query: str) -> dict:
    """Search and answer questions from saved knowledge."""
    return await recall(query=query)

async def list_tasks_tool(status: str = "pending") -> List[dict]:
    """Show pending or completed tasks."""
    return await list_tasks(status=status)

async def list_schedule_tool() -> List[dict]:
    """Show upcoming calendar events."""
    return await list_upcoming_events()

# 2. Create FunctionTool instances
tools = [
    FunctionTool.from_function(capture_knowledge_tool),
    FunctionTool.from_function(create_task_tool),
    FunctionTool.from_function(schedule_event_tool),
    FunctionTool.from_function(recall_knowledge_tool),
    FunctionTool.from_function(list_tasks_tool),
    FunctionTool.from_function(list_schedule_tool),
]

# 3. Define the LLM Agent
system_instruction = """You are Recall X247, an AI-powered second brain and productivity assistant.
You help users capture knowledge, manage tasks, and schedule their time.

You have access to these tools:
- capture_knowledge_tool: Save content from YouTube URLs, web articles, or notes
- recall_knowledge_tool: Search and answer questions from saved knowledge  
- create_task_tool: Create a new task (optionally linked to a memory)
- list_tasks_tool: Show pending or completed tasks
- schedule_event_tool: Schedule a study session or event on the calendar
- list_schedule_tool: Show upcoming calendar events

MULTI-STEP WORKFLOW RULES:
1. If user shares a URL + asks to "remember" or "save" → use capture_knowledge_tool
2. If user asks a question about something they've learned → use recall_knowledge_tool
3. If user says "create a task" or "remind me to" → use create_task_tool
4. If user says "schedule" or "book time" → use schedule_event_tool
5. COMPLEX: "Save this AND create a review task" → capture THEN create_task (linked)
6. COMPLEX: "Save this AND schedule study time" → capture THEN schedule_event
7. Always confirm what was done at the end: "✅ Done! I [summary of actions]"

Never make up information. Only answer recall questions from saved memories.
If no relevant memory is found, say so clearly and offer to capture new info.
"""

agent = LlmAgent(
    model=settings.GEMINI_MODEL,
    system_instruction=system_instruction,
    tools=tools,
)

# 4. Set up Runner and Session Service
session_service = InMemorySessionService()
runner = Runner(
    app_name="recall-x247",
    agent=agent,
    session_service=session_service,
)

async def run_coordinator(message: str, session_id: str) -> dict:
    """
    Main coordinator function that processes user messages using the ADK Runner.
    Tracks tool calls by monitoring the event stream.
    """
    # Check for API key
    if not settings.GEMINI_API_KEY:
        return {
            "reply": "AI Service is not configured. Please set GEMINI_API_KEY in the environment or Settings menu.",
            "agents_called": [],
            "session_id": session_id,
            "error": "Unauthorized"
        }

    agents_called = []
    reply = ""

    try:
        # Run the agent and iterate through events
        async for event in runner.run(message, session_id=session_id):
            # Track tool calls (author is usually the tool name in ADK events)
            if event.author and event.author != "assistant" and event.author != "user":
                if event.author not in agents_called:
                    agents_called.append(event.author)
            
            # Collect the final response
            if event.content:
                reply = event.content

        return {
            "reply": reply,
            "agents_called": agents_called,
            "session_id": session_id
        }
    except Exception as e:
        print(f"Coordinator Error: {e}")
        return {
            "reply": f"I encountered an error: {str(e)}",
            "agents_called": agents_called,
            "session_id": session_id
        }
