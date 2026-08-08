import os
import joblib
from pathlib import Path

# Resolve paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

class ModelContainer:
    def __init__(self):
        self.preprocessor = None
        self.failure_model = None
        self.failure_type_model = None
        self.loaded = False

    def load_models(self):
        try:
            preprocessor_path = MODELS_DIR / "preprocessor.pkl"
            failure_model_path = MODELS_DIR / "failure_model.pkl"
            failure_type_model_path = MODELS_DIR / "failure_type_model.pkl"

            assert preprocessor_path.exists(), f"Preprocessor not found at: {preprocessor_path}"
            assert failure_model_path.exists(), f"Failure model not found at: {failure_model_path}"
            assert failure_type_model_path.exists(), f"Failure type model not found at: {failure_type_model_path}"

            self.preprocessor = joblib.load(preprocessor_path)
            self.failure_model = joblib.load(failure_model_path)
            self.failure_type_model = joblib.load(failure_type_model_path)
            self.loaded = True
            print("Models loaded successfully.")
        except Exception as e:
            print(f"Error loading models: {e}")
            raise e

model_container = ModelContainer()
