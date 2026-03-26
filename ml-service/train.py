# train.py — Generate sample data and train Isolation Forest model
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Generate synthetic transaction data
np.random.seed(42)
n = 1000

data = pd.DataFrame({
    'amount': np.concatenate([
        np.random.normal(100, 50, 950),   # normal transactions
        np.random.normal(5000, 500, 50)   # anomalous (high amount)
    ]),
    'time': np.random.randint(0, 86400, n),  # seconds in a day
})

# Train Isolation Forest
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(data[['amount', 'time']])

# Save model
joblib.dump(model, 'fraud_model.pkl')
print("Model trained and saved as fraud_model.pkl")
