from fastapi import FastAPI
from pydantic import BaseModel
import os
import uuid

# Assuming docker_manager.py is in the same directory
import docker_manager

# Define the base path for generated projects
PROJECTS_DIR = os.path.abspath("../generated_projects")
if not os.path.exists(PROJECTS_DIR):
    os.makedirs(PROJECTS_DIR)

app = FastAPI()

class GenerateRequest(BaseModel):
    prompt: str
    session_id: str | None = None

class GenerateResponse(BaseModel):
    session_id: str
    status: str
    stdout: str | None = None
    stderr: str | None = None
    code: str # Will be added later

@app.get("/")
async def root():
    return {"message": "Mini-UFO 4 Backend is running"}

@app.post("/generate", response_model=GenerateResponse)
async def generate_code(req: GenerateRequest):
    """
    Handles code generation and execution request.
    """
    session_id = req.session_id or str(uuid.uuid4())
    project_path = os.path.join(PROJECTS_DIR, session_id)
    log_path = os.path.join(project_path, "context.log")

    # Create project directory if it doesn't exist
    if not os.path.exists(project_path):
        os.makedirs(project_path)

    # --- This is the temporary part for testing ---
    # We're treating the prompt directly as code to test execution
    code_to_execute = req.prompt
    # --- End of temporary part ---

    # Log the prompt
    with open(log_path, "a") as log_file:
        log_file.write(f"--- PROMPT ---\n{req.prompt}\n\n")

    # Execute the code
    stdout, stderr = docker_manager.execute_code_in_container(
        code_string=code_to_execute,
        language="python",
        project_path=project_path
    )

    # Log the output
    with open(log_path, "a") as log_file:
        log_file.write(f"--- LLM/EXECUTION OUTPUT ---\n")
        if stdout:
            log_file.write(f"STDOUT:\n{stdout}\n")
        if stderr:
            log_file.write(f"STDERR:\n{stderr}\n")
        log_file.write("\n")


    status = "error" if stderr else "success"

    return GenerateResponse(
        session_id=session_id,
        status=status,
        stdout=stdout,
        stderr=stderr,
        code=code_to_execute
    )