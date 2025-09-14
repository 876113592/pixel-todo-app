from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from . import models
from typing import List, Optional

def get_todo(db: Session, todo_id: int) -> Optional[models.Todo]:
    """Get a single todo by ID"""
    return db.query(models.Todo).filter(models.Todo.id == todo_id).first()

def get_todos(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    completed: Optional[bool] = None,
    priority: Optional[str] = None
) -> List[models.Todo]:
    """Get todos with optional filtering"""
    query = db.query(models.Todo)

    # Apply filters
    if completed is not None:
        query = query.filter(models.Todo.completed == completed)
    if priority:
        query = query.filter(models.Todo.priority == priority)

    # Order by created_at descending (newest first)
    query = query.order_by(desc(models.Todo.created_at))

    return query.offset(skip).limit(limit).all()

def create_todo(db: Session, todo: models.TodoCreate) -> models.Todo:
    """Create a new todo"""
    db_todo = models.Todo(**todo.dict())
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

def update_todo(
    db: Session,
    todo_id: int,
    todo_update: models.TodoUpdate
) -> Optional[models.Todo]:
    """Update an existing todo"""
    db_todo = get_todo(db, todo_id)
    if not db_todo:
        return None

    # Update only provided fields
    update_data = todo_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_todo, field, value)

    db.commit()
    db.refresh(db_todo)
    return db_todo

def delete_todo(db: Session, todo_id: int) -> bool:
    """Delete a todo"""
    db_todo = get_todo(db, todo_id)
    if not db_todo:
        return False

    db.delete(db_todo)
    db.commit()
    return True

def get_todo_stats(db: Session) -> dict:
    """Get statistics about todos"""
    total = db.query(models.Todo).count()
    completed = db.query(models.Todo).filter(models.Todo.completed == True).count()
    pending = total - completed

    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 1)
    }