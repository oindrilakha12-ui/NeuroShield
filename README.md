# AI-Powered Fraud

A full-stack fraud detection system using Node.js/Express, Python/FastAPI (Isolation Forest ML), React, MongoDB, JWT Auth, and Socket.io real-time alerts.

## Run Instructions

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

### 2. ML Service
```bash
cd ml-service
pip install -r requirements.txt
python train.py          # train and save model (run once)
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /health | Server health check |
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| POST | /api/transactions | Create transaction (calls ML) |
| GET | /api/transactions | Get user transactions |
| POST | /api/transactions/:id/feedback | Submit fraud feedback |
| POST | /predict (ML) | Get fraud score |
