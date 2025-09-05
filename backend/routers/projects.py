import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from datetime import datetime

router = APIRouter()

PROJECTS_DIR = "generated_projects"

# Ensure the projects directory exists
if not os.path.exists(PROJECTS_DIR):
    os.makedirs(PROJECTS_DIR)

class Project(BaseModel):
    id: str
    name: str
    created_at: datetime

class ProjectContent(BaseModel):
    prompt: str
    code: str
    console_output: str

@router.get("/", response_model=List[Project])
async def list_projects():
    """List all available projects."""
    projects = []
    for project_id in os.listdir(PROJECTS_DIR):
        project_path = os.path.join(PROJECTS_DIR, project_id)
        if os.path.isdir(project_path):
            try:
                with open(os.path.join(project_path, "metadata.json"), "r") as f:
                    metadata = json.load(f)
                projects.append(Project(id=project_id, name=metadata.get("name", project_id), created_at=datetime.fromisoformat(metadata["created_at"]))) # type: ignore
            except (FileNotFoundError, json.JSONDecodeError, KeyError):
                # If metadata is missing or malformed, still list the project but with default values
                projects.append(Project(id=project_id, name=project_id, created_at=datetime.now()))
    return projects

@router.get("/{project_id}", response_model=ProjectContent)
async def get_project(project_id: str):
    """Get the content of a specific project."""
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        with open(os.path.join(project_path, "prompt.txt"), "r") as f:
            prompt = f.read()
        with open(os.path.join(project_path, "code.py"), "r") as f:
            code = f.read()
        with open(os.path.join(project_path, "console_output.txt"), "r") as f:
            console_output = f.read()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Project content missing: {e}")
    
    return ProjectContent(prompt=prompt, code=code, console_output=console_output)

@router.post("/", response_model=Project)
async def create_project(content: ProjectContent, project_name: Optional[str] = None):
    """Create a new project from the current session content."""
    timestamp = datetime.now().isoformat(timespec='seconds').replace(':', '-')
    if project_name:
        project_id = f"{project_name.replace(' ', '-')}-{timestamp}"
    else:
        project_id = f"session-{timestamp}"
    
    project_path = os.path.join(PROJECTS_DIR, project_id)
    os.makedirs(project_path, exist_ok=True)

    with open(os.path.join(project_path, "prompt.txt"), "w") as f:
        f.write(content.prompt)
    with open(os.path.join(project_path, "code.py"), "w") as f:
        f.write(content.code)
    with open(os.path.join(project_path, "console_output.txt"), "w") as f:
        f.write(content.console_output)
    
    metadata = {
        "name": project_name if project_name else project_id,
        "created_at": datetime.now().isoformat()
    }
    with open(os.path.join(project_path, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    return Project(id=project_id, name=metadata["name"], created_at=datetime.fromisoformat(metadata["created_at"])) # type: ignore

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    shutil.rmtree(project_path)
    return {"message": "Project deleted successfully"}
