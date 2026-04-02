# main.py — FastAPI ML service for fraud prediction
from fastapi import FastAPI
from pydantic import BaseModel
import random

app = FastAPI()

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
    # simple rule based dummy ML for now
    fraud_score = 0.0
    
    # high amount increases score
    if data.amount > 50000:
        fraud_score += 0.3
    elif data.amount > 20000:
        fraud_score += 0.15
    
    # night time increases score
    hour = int(data.time / 3600) % 24
    if hour >= 22 or hour < 6:
        fraud_score += 0.2
    
    # add some randomness to simulate ML
    fraud_score += random.uniform(0, 0.2)
    fraud_score = min(fraud_score, 1.0)
    
    is_fraud = fraud_score > 0.6

    return {
        "fraud_score": round(fraud_score, 4),
        "is_fraud": is_fraud
    }
