from pydantic import BaseModel, Field
from typing import Literal, Optional

class PredictionRequest(BaseModel):
    Air_temperature: float = Field(..., gt=200.0, lt=400.0, description="Ambient air temperature in Kelvin", examples=[300.0])
    Process_temperature: float = Field(..., gt=200.0, lt=400.0, description="Process temperature in Kelvin", examples=[310.0])
    Rotational_speed: float = Field(..., gt=0.0, lt=5000.0, description="Rotational speed in rpm", examples=[1400.0])
    Torque: float = Field(..., ge=0.0, lt=500.0, description="Torque in Nm (must be non-negative)", examples=[45.0])
    Tool_wear: float = Field(..., ge=0.0, lt=1000.0, description="Tool wear in minutes", examples=[150.0])
    Type: Literal['L', 'M', 'H'] = Field(..., description="Machine quality variant (L/M/H)", examples=['L'])

class PredictionResponse(BaseModel):
    status: Literal["Healthy", "Warning", "Critical"]
    failure_probability: float = Field(..., description="Probability of failure (0.0 to 1.0)")
    predicted_failure_type: Optional[str] = Field(None, description="Root cause failure type if failure is predicted")
    confidence: float = Field(..., description="Confidence of the prediction or failure type prediction")
