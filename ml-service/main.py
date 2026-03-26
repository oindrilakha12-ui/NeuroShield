# main.py — FastAPI ML service for fraud prediction
from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI()

# Load trained model
model = joblib.load('fraud_model.pkl')

class TransactionInput(BaseModel):
    amount: float
    time: float
    location: str = ""
    device: str = ""

@app.get("/health")
def health():
    return {"status": "ok", "message": "ML service running"}

@app.post("/predict")
def predict(data: TransactionInput):
    # Use amount and time as features
    features = np.array([[data.amount, data.time]])
    
    # Isolation Forest: -1 = anomaly, 1 = normal
    prediction = model.predict(features)[0]
    score = model.decision_function(features)[0]
    
    # Normalize score to 0-1 range (higher = more fraudulent)
    fraud_score = round(float(1 - (score + 0.5)), 4)
    fraud_score = max(0.0, min(1.0, fraud_score))
    is_fraud = prediction == -1

    return {
        "fraud_score": fraud_score,
        "is_fraud": is_fraud
    }
