from pydantic import BaseModel
from typing import Optional, List

class ItemCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    completed: bool

    class Config:
        from_attributes = True

class RagQueryRequest(BaseModel):
    query: str