import os
import asyncio
import datetime
import uuid
from typing import List, Dict, Any, Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build
from app.db import get_db
from app.config import settings

# Timezone configuration
TIMEZONE = "Asia/Kolkata"

class CalendarAgent:
    def __init__(self):
        self.calendar_id = settings.GOOGLE_CALENDAR_ID
        self.service = self._get_service()
        self.is_real = self.service is not None

    def _get_service(self):
        """
        Initializes the Google Calendar service if credentials and ID are available.
        """
        if not self.calendar_id:
            return None
            
        creds_path = settings.GOOGLE_SA_KEY_PATH or settings.GOOGLE_APPLICATION_CREDENTIALS
        if not creds_path or not os.path.exists(creds_path):
            return None
            
        try:
            scopes = ["https://www.googleapis.com/auth/calendar"]
            creds = service_account.Credentials.from_service_account_file(creds_path, scopes=scopes)
            return build("calendar", "v3", credentials=creds)
        except Exception as e:
            print(f"Calendar Service Initialization Error: {e}")
            return None

    async def create_event(self, title: str, date: str, time: str, duration_minutes: int = 60, 
                           description: str = "", linked_task_id: str = "") -> dict:
        """
        Creates a calendar event. Uses Google Calendar if configured, otherwise Firestore.
        """
        # Prepare start and end times
        # date: YYYY-MM-DD, time: HH:MM
        start_dt_str = f"{date}T{time}:00"
        start_dt = datetime.datetime.fromisoformat(start_dt_str)
        end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)
        
        event_data = {
            "title": title,
            "date": date,
            "time": time,
            "duration_minutes": duration_minutes,
            "description": description,
            "linked_task_id": linked_task_id,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        if self.is_real:
            loop = asyncio.get_event_loop()
            gcal_body = {
                "summary": title,
                "description": f"{description}\nLinked Task: {linked_task_id}" if linked_task_id else description,
                "start": {
                    "dateTime": start_dt.isoformat(),
                    "timeZone": TIMEZONE,
                },
                "end": {
                    "dateTime": end_dt.isoformat(),
                    "timeZone": TIMEZONE,
                },
            }
            
            def _insert():
                return self.service.events().insert(calendarId=self.calendar_id, body=gcal_body).execute()
            
            try:
                gcal_event = await loop.run_in_executor(None, _insert)
                event_data["id"] = gcal_event.get("id")
                event_data["gcal_event_id"] = gcal_event.get("id")
            except Exception as e:
                print(f"GCal Insert Error: {e}")
                # Fallback to mock behavior if API fails
                event_data["id"] = str(uuid.uuid4())
                event_data["gcal_event_id"] = "error_fallback"
        else:
            # Mock Mode: Save to Firestore
            db = await get_db()
            event_id = str(uuid.uuid4())
            event_data["id"] = event_id
            event_data["gcal_event_id"] = "mock_calendar_id"
            await db.collection("schedules").document(event_id).set(event_data)
            
        return event_data

    async def list_upcoming_events(self, days: int = 7) -> List[dict]:
        """
        Lists upcoming events for the next N days.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        time_min = now.isoformat()
        time_max = (now + datetime.timedelta(days=days)).isoformat()
        
        if self.is_real:
            loop = asyncio.get_event_loop()
            def _list():
                return self.service.events().list(
                    calendarId=self.calendar_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=10,
                    singleEvents=True,
                    orderBy="startTime"
                ).execute()
            
            try:
                result = await loop.run_in_executor(None, _list)
                events = []
                for item in result.get("items", []):
                    start = item["start"].get("dateTime", item["start"].get("date"))
                    # Parse start to get date and time
                    dt = datetime.datetime.fromisoformat(start.replace("Z", "+00:00"))
                    events.append({
                        "id": item["id"],
                        "title": item.get("summary"),
                        "date": dt.date().isoformat(),
                        "time": dt.time().strftime("%H:%M"),
                        "gcal_event_id": item["id"]
                    })
                return events
            except Exception as e:
                print(f"GCal List Error: {e}")
                return []
        else:
            # Mock Mode: Query Firestore
            db = await get_db()
            today_str = datetime.date.today().isoformat()
            query = db.collection("schedules") \
                      .where("date", ">=", today_str) \
                      .order_by("date") \
                      .limit(10)
            
            docs = query.stream()
            events = []
            async for doc in docs:
                events.append(doc.to_dict())
            return events

    async def delete_event(self, event_id: str) -> str:
        """
        Deletes an event by ID.
        """
        if self.is_real:
            loop = asyncio.get_event_loop()
            def _delete():
                self.service.events().delete(calendarId=self.calendar_id, eventId=event_id).execute()
            
            try:
                await loop.run_in_executor(None, _delete)
                return f"Event {event_id} deleted"
            except Exception as e:
                return f"Error deleting GCal event: {e}"
        else:
            db = await get_db()
            doc_ref = db.collection("schedules").document(event_id)
            doc = await doc_ref.get()
            if not doc.exists:
                return f"Error: Event {event_id} not found."
            await doc_ref.delete()
            return f"Event {event_id} deleted"

    async def get_todays_schedule(self) -> List[dict]:
        """
        Returns events scheduled for today.
        """
        today_str = datetime.date.today().isoformat()
        
        if self.is_real:
            loop = asyncio.get_event_loop()
            time_min = f"{today_str}T00:00:00Z"
            time_max = f"{today_str}T23:59:59Z"
            
            def _list_today():
                return self.service.events().list(
                    calendarId=self.calendar_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    singleEvents=True,
                    orderBy="startTime"
                ).execute()
                
            try:
                result = await loop.run_in_executor(None, _list_today)
                events = []
                for item in result.get("items", []):
                    start = item["start"].get("dateTime", item["start"].get("date"))
                    dt = datetime.datetime.fromisoformat(start.replace("Z", "+00:00"))
                    events.append({
                        "id": item["id"],
                        "title": item.get("summary"),
                        "date": dt.date().isoformat(),
                        "time": dt.time().strftime("%H:%M"),
                        "gcal_event_id": item["id"]
                    })
                return events
            except Exception as e:
                print(f"GCal Today List Error: {e}")
                return []
        else:
            db = await get_db()
            query = db.collection("schedules").where("date", "==", today_str)
            docs = query.stream()
            events = []
            async for doc in docs:
                events.append(doc.to_dict())
            return events

# Singleton instance
calendar_agent = CalendarAgent()

# Exportable functions for MCP
async def create_event(title, date, time, duration_minutes=60, description="", linked_task_id=""):
    return await calendar_agent.create_event(title, date, time, duration_minutes, description, linked_task_id)

async def list_upcoming_events(days=7):
    return await calendar_agent.list_upcoming_events(days)

async def delete_event(event_id):
    return await calendar_agent.delete_event(event_id)

async def get_todays_schedule():
    return await calendar_agent.get_todays_schedule()
