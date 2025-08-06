from fastapi import APIRouter

from routes.agenda.routes import agenda_router

api_router = APIRouter()

api_router.include_router(agenda_router)
