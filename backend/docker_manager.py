
import docker
import os
import uuid

def execute_code_in_container(code_string: str, language: str = "python", project_path: str = None):
    """
    Executes a string of code in a temporary, isolated Docker container.

    Args:
        code_string: The code to execute.
        language: The programming language (determines Docker image).
        project_path: The absolute path on the host to mount into the container.

    Returns:
        A tuple containing (stdout, stderr).
    """
    if project_path is None:
        return None, "Error: project_path is required to provide a context for execution."

    client = docker.from_env()

    # Simple mapping for now, can be expanded
    image_map = {
        "python": "python:3.10-slim"
    }
    image = image_map.get(language)
    if not image:
        return None, f"Error: Language '{language}' is not supported."

    # Ensure the image is available locally
    try:
        client.images.get(image)
    except docker.errors.ImageNotFound:
        print(f"Pulling Docker image: {image}...")
        client.images.pull(image)

    # Create a temporary file for the script
    script_name = f"temp_script_{uuid.uuid4()}.py"
    script_path_host = os.path.join(project_path, script_name)
    
    with open(script_path_host, 'w') as f:
        f.write(code_string)

    # Define container settings
    container_config = {
        "image": image,
        "command": [ "python", script_name ],
        "volumes": {
            project_path: {
                "bind": "/app",
                "mode": "rw"
            }
        },
        "working_dir": "/app",
        "remove": True, # Remove container on exit
    }

    stdout = ""
    stderr = ""

    try:
        container = client.containers.run(**container_config, detach=False, stdout=True, stderr=True)
        stdout = container.decode('utf-8')
    except docker.errors.ContainerError as e:
        stdout = e.stdout.decode('utf-8') if e.stdout else ""
        stderr = e.stderr.decode('utf-8') if e.stderr else ""
    except Exception as e:
        stderr = str(e)
    finally:
        # Clean up the temporary script file
        if os.path.exists(script_path_host):
            os.remove(script_path_host)

    return stdout, stderr

