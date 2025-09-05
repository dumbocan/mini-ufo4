from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_main():
    """
    Tests that the root endpoint returns a 200 OK status and the expected JSON response.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Mini-UFO 4 Backend is running and ready for WebSocket connections."}
