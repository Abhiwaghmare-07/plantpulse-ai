# 🤖 PlantPulse AI — ML Service

The `ml-service/` directory is the **Python machine-learning microservice** for PlantPulse AI.
It exposes a REST API (FastAPI + Uvicorn) that serves trained predictive-maintenance models,
and contains all data science artefacts — notebooks, trained models, and evaluation outputs.

---

## 📁 Directory Structure

```
ml-service/
├── notebooks/
│   └── 01_eda.ipynb          ← Exploratory Data Analysis
├── outputs/                  ← Saved plots from notebooks
├── models/                   ← Trained model artefacts (gitignored *.pkl / *.joblib)
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

## 📓 Running the EDA Notebook

### Option A — Jupyter Lab (recommended)

```bash
# From ml-service/ with venv active
jupyter lab
```

Then navigate to `notebooks/01_eda.ipynb` and run all cells.

### Option B — Execute headlessly (CI / scripted)

```bash
jupyter nbconvert --to notebook --execute notebooks/01_eda.ipynb \
    --output notebooks/01_eda_executed.ipynb
```

---

## 🚀 Running the FastAPI Service

> *The API will be scaffolded in a later development phase.*

```bash
# Placeholder — to be implemented
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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

## 🗂️ Dataset

The raw dataset (`ai4i2020.csv`) is stored in the top-level `data/` directory.
It is the **AI4I 2020 Predictive Maintenance Dataset** — a synthetic dataset
modelling industrial machine failures across five failure types
(Tool Wear, Heat Dissipation, Power, Overstrain, and Random Failure).

- **Source:** [UCI ML Repository — AI4I 2020](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset)
- **Rows:** 10,000 | **Features:** 14 | **Target:** `Machine failure` (binary)
