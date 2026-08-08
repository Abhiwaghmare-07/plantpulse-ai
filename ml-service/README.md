# 🤖 PlantPulse AI — ML Service

The `ml-service/` directory is the **Python machine-learning microservice** for PlantPulse AI.
It exposes a REST API (FastAPI + Uvicorn) that serves trained predictive-maintenance models,
and contains all data science artefacts — notebooks, trained models, and evaluation outputs.

---

## 📁 Directory Structure

```
ml-service/
├── notebooks/
│   ├── 01_eda.ipynb          ← Exploratory Data Analysis
│   └── 02_model_training.ipynb ← Model Training & Serialization
├── outputs/                  ← Saved plots from notebooks
├── models/                   ← Trained model artefacts (preprocessor & models)
├── requirements.txt          ← Python dependencies
├── venv/                     ← Virtual environment (gitignored)
└── README.md                 ← This file
```


---

## ⚙️ Environment Setup

### Prerequisites
- Python 3.9 or higher
- `pip` available on your PATH

### 1 · Create the virtual environment

```bash
cd ml-service
python -m venv venv
```

### 2 · Activate the virtual environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 3 · Install dependencies

```bash
pip install -r requirements.txt
```

> **Note (Windows / corporate network):** If you hit SSL certificate errors, run:
> ```bash
> pip install -r requirements.txt --trusted-host pypi.org --trusted-host files.pythonhosted.org
> ```

---

## 📓 Running the Notebooks

### Option A — Jupyter Lab (recommended)

```bash
# From ml-service/ with venv active
jupyter lab
```

Navigate to:
- `notebooks/01_eda.ipynb` (Exploratory Data Analysis)
- `notebooks/02_model_training.ipynb` (Model Training & Serialization)

### Option B — Execute headlessly (CI / scripted)

```bash
# Run EDA Notebook
jupyter nbconvert --to notebook --execute notebooks/01_eda.ipynb --inplace

# Run Model Training Notebook
jupyter nbconvert --to notebook --execute notebooks/02_model_training.ipynb --inplace
```


---

## 🚀 Running the FastAPI Service

To start the ML prediction microservice locally, run:

```bash
# Make sure your virtual environment is active
cd ml-service
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running, the interactive Swagger documentation will be available at:  
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

### 📡 API Endpoints

#### 1 · Check Health status (`GET /health`)
Verifies that the microservice is running and that all model binaries are correctly loaded into memory.
```bash
curl http://127.0.0.1:8000/health
```
**Response:**
```json
{
  "status": "ok",
  "models_loaded": true
}
```

#### 2 · Get Prediction (`POST /predict`)
Submits current machine sensor metrics to get failure risk predictions.
```bash
curl -X POST http://127.0.0.1:8000/predict \
     -H "Content-Type: application/json" \
     -d '{
       "Air_temperature": 302.5,
       "Process_temperature": 310.1,
       "Rotational_speed": 1310.0,
       "Torque": 54.0,
       "Tool_wear": 190.0,
       "Type": "L"
     }'
```
**Response:**
```json
{
  "status": "Critical",
  "failure_probability": 0.9947,
  "predicted_failure_type": "HDF",
  "confidence": 0.996
}
```

---

## 🧪 Validating with Test Script

A test validation script is included in `ml-service/test_api.py`. It submits healthy, borderline, and critical telemetry readings to the API and checks the output predictions.

To execute the verification script (while the FastAPI server is running):
```bash
python test_api.py
```


---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `pandas` / `numpy` | Data manipulation and numerical computing |
| `scikit-learn` | Classical ML algorithms and preprocessing |
| `xgboost` | Gradient boosted trees (primary model candidate) |
| `imbalanced-learn` | SMOTE and other resampling strategies for class imbalance |
| `shap` | Model explainability and feature importance |
| `matplotlib` / `seaborn` | Data visualisation |
| `jupyter` | Interactive notebook environment |
| `fastapi` / `uvicorn` | REST API framework and ASGI server |
| `joblib` | Serialise and load trained models |

---

## 📈 Modeling Approach & Performance Metrics

We train two models for comparison:
1. **Logistic Regression (Baseline)**: A simple linear model to establish baseline performance.
2. **XGBoost Classifier**: A high-performance gradient boosting tree model designed to capture complex non-linear relationships.

### Preprocessing & Handling Imbalance
- **Features Dropped**: `UDI`, `Product ID` (non-predictive identifiers).
- **Encoding**: One-Hot Encoding applied to `Type` (machine quality type L, M, H).
- **Scaling**: Numeric features standardized (`StandardScaler`).
- **Class Imbalance**: Handled via SMOTE (Synthetic Minority Over-sampling Technique) applied **strictly to the training data** to avoid data leakage.

### Final Results on Untouched Test Set

#### 🛡️ Binary Failure Prediction (`failure_model.pkl`)
- **Accuracy**: 98.00%
- **Precision**: 67.07%
- **Recall**: 80.88%
- **F1-Score**: 73.33%
*(Note: Recall and F1-score on the failure class are the primary evaluation metrics since catching failures is critical).*

#### 🔬 Multi-Class Failure Root Cause Diagnostic (`failure_type_model.pkl`)
Trained on failed instances (`Machine failure == 1`) to diagnose the specific type of failure:
- **Overall Accuracy**: 86.76%

**Per-Class Metrics:**
- **Heat Dissipation Failure (HDF)**: Precision 85.19% | Recall 100.00% | F1 92.00%
- **Power Failure (PWF)**: Precision 94.74% | Recall 100.00% | F1 97.30%
- **Tool Wear Failure (TWF)**: Precision 85.71% | Recall 66.67% | F1 75.00%
- **Overstrain Failure (OSF)**: Precision 76.92% | Recall 62.50% | F1 68.97%
- **Other/Random Failure (Other)**: Precision 100.00% | Recall 100.00% | F1 100.00%


---

## 🗂️ Dataset

The raw dataset (`ai4i2020.csv`) is stored in the top-level `data/` directory.
It is the **AI4I 2020 Predictive Maintenance Dataset** — a synthetic dataset
modelling industrial machine failures across five failure types
(Tool Wear, Heat Dissipation, Power, Overstrain, and Random Failure).

- **Source:** [UCI ML Repository — AI4I 2020](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset)
- **Rows:** 10,000 | **Features:** 14 | **Target:** `Machine failure` (binary)
