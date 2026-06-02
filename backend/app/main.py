from pathlib import Path
import shutil

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from .inference import get_predictor

# We are using fastapi for communication of frontend with backend
app = FastAPI(
    title="Deepfake Detection API",
    version="1.0.0"
)

# CORS: they are middlewares, so tht communication will not be block 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# jo video upload karon ga, wo upload folder me jaye gi (temporarily)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# We are loading model are once -> fast requests
predictor = get_predictor("artifacts")
print("Model loaded successfully.")

# ROUTES
@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Deepfake Detection Backend"
    }


@app.post("/predict")
async def predict_video(
    video: UploadFile = File(...)
):
    try:

        video_path = UPLOAD_DIR / video.filename

        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        result = predictor.predict_video(
            str(video_path),
            num_frames=10
        )
        video_path.unlink(missing_ok=True) #I am deleting video after perdiction, because we will do a lot of perdictions

        return result

    except Exception as e:
        return {
            "error": str(e)
        }