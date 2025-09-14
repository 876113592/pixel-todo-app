from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from .database import Base
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# SQLAlchemy ORM Model
class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    priority = Column(String(10), default="medium", nullable=False)  # low, medium, high
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

# Pydantic Models for API
class TodoBase(BaseModel):
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: str = "medium"
    due_date: Optional[datetime] = None

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None

class TodoResponse(TodoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True