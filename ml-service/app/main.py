from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.model_loader import model_container
from app.schemas import PredictionRequest, PredictionResponse
from app.predict import make_prediction

app = FastAPI(
    title="PlantPulse AI - Machine Learning Microservice",
    description="FastAPI microservice for machine failure prediction and diagnostic root cause classification.",
    version="1.0.0"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Load model binaries
    try:
        model_container.load_models()
    except Exception as e:
        print(f"CRITICAL: Failed to load models at startup: {e}")

@app.get("/", tags=["Info"])
def get_root():
    return {
        "app_name": app.title,
        "version": app.version,
        "description": app.description,
        "endpoints": {
            "GET /": "Basic microservice details (this route)",
            "GET /health": "Liveness/readiness check confirming loaded models",
            "POST /predict": "Run prediction on incoming sensor metrics"
        }
    }

@app.get("/health", tags=["Health"])
def health_check():
    if model_container.loaded:
        return {
            "status": "ok",
            "models_loaded": True
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Microservice is unhealthy: models are not loaded"
        )

@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(request: PredictionRequest):
    try:
        response = make_prediction(request)
        return response
    except Exception as e:
        # Hide internal stack traces and return a clean 500 error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )
