from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Mini-UFO 4 Backend is running"}

# Placeholder for the main endpoint
@app.post("/generate")
async def generate_code(prompt: str):
    # This is where the magic will happen
    return {"status": "received", "prompt": prompt}
