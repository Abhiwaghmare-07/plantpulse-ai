import pandas as pd
import numpy as np
from app.model_loader import model_container
from app.schemas import PredictionRequest, PredictionResponse

def make_prediction(request: PredictionRequest) -> PredictionResponse:
    if not model_container.loaded:
        raise RuntimeError("Models are not loaded.")

    # 1. Map input variables into DataFrame structure expected by preprocessor ColumnTransformer
    input_data = pd.DataFrame([{
        'Type': request.Type,
        'Air temperature [K]': request.Air_temperature,
        'Process temperature [K]': request.Process_temperature,
        'Rotational speed [rpm]': request.Rotational_speed,
        'Torque [Nm]': request.Torque,
        'Tool wear [min]': request.Tool_wear
    }])

    # 2. Preprocess input data
    processed_data = model_container.preprocessor.transform(input_data)

    # 3. Predict failure probability
    failure_prob = float(model_container.failure_model.predict_proba(processed_data)[0][1])

    # 4. Predict failure type if failure is predicted (probability >= 0.5)
    is_failure = failure_prob >= 0.5
    predicted_failure_type = None
    confidence = 1.0 - failure_prob if not is_failure else failure_prob

    if is_failure:
        # Load multi-class xgb model and target names
        fail_type_data = model_container.failure_type_model
        xgb_f = fail_type_data['model']
        classes = fail_type_data['classes']

        # Get failure type probabilities
        type_probs = xgb_f.predict_proba(processed_data)[0]
        type_idx = np.argmax(type_probs)
        predicted_failure_type = str(classes[type_idx])
        # Update confidence to the probability of the diagnostic failure type
        confidence = float(type_probs[type_idx])

    # 5. Determine warning status thresholds
    if failure_prob < 0.3:
        status = "Healthy"
    elif failure_prob <= 0.6:
        status = "Warning"
    else:
        status = "Critical"

    return PredictionResponse(
        status=status,
        failure_probability=round(failure_prob, 4),
        predicted_failure_type=predicted_failure_type,
        confidence=round(confidence, 4)
    )
