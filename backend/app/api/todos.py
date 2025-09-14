from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, models
from ..database import get_db

router = APIRouter()

@router.get("/todos", response_model=List[models.TodoResponse])
def get_todos(
    skip: int = Query(0, ge=0, description="Skip number of records"),
    limit: int = Query(100, ge=1, le=500, description="Limit number of records"),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high)"),
    db: Session = Depends(get_db)
):
    """Get all todos with optional filtering"""
    todos = crud.get_todos(
        db=db,
        skip=skip,
        limit=limit,
        completed=completed,
        priority=priority
    )
    return todos

@router.get("/todos/{todo_id}", response_model=models.TodoResponse)
def get_todo(
    todo_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific todo by ID"""
    todo = crud.get_todo(db=db, todo_id=todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo

@router.post("/todos", response_model=models.TodoResponse, status_code=201)
def create_todo(
    todo: models.TodoCreate,
    db: Session = Depends(get_db)
):
    """Create a new todo"""
    return crud.create_todo(db=db, todo=todo)

@router.put("/todos/{todo_id}", response_model=models.TodoResponse)
def update_todo(
    todo_id: int,
    todo_update: models.TodoUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing todo"""
    updated_todo = crud.update_todo(
        db=db,
        todo_id=todo_id,
        todo_update=todo_update
    )
    if not updated_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return updated_todo

@router.delete("/todos/{todo_id}", status_code=204)
def delete_todo(
    todo_id: int,
    db: Session = Depends(get_db)
):
    """Delete a todo"""
    success = crud.delete_todo(db=db, todo_id=todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")

@router.get("/todos/stats/summary")
def get_todo_stats(
    db: Session = Depends(get_db)
):
    """Get todo statistics"""
    return crud.get_todo_stats(db=db)

@router.patch("/todos/{todo_id}/toggle", response_model=models.TodoResponse)
def toggle_todo_completion(
    todo_id: int,
    db: Session = Depends(get_db)
):
    """Toggle todo completion status"""
    todo = crud.get_todo(db=db, todo_id=todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    todo_update = models.TodoUpdate(completed=not todo.completed)
    return crud.update_todo(db=db, todo_id=todo_id, todo_update=todo_update)