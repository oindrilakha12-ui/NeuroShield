# NeuroShield — AI Fraud Detection Project
# Complete Code Explanation (Hinglish)

---

## PROJECT KYA HAI?

Yeh ek AI-powered fraud detection system hai jo:
- Bank transactions monitor karta hai
- Har transaction ka risk score calculate karta hai
- Real-time alerts bhejta hai agar fraud detect ho
- User ke behavior pattern se compare karta hai

---

## PROJECT STRUCTURE

```
NeuroShield/
├── backend/
│   └── src/
│       ├── index.js                  ← Server ka main file
│       ├── db.js                     ← MongoDB connection
│       ├── controllers/
│       │   ├── authController.js     ← Register/Login logic
│       │   └── transactionController.js ← Fraud detection logic
│       ├── middleware/
│       │   └── authMiddleware.js     ← JWT token check
│       ├── models/
│       │   ├── User.js               ← User ka DB structure
│       │   ├── Transaction.js        ← Transaction ka DB structure
│       │   └── FraudLog.js           ← Fraud result ka DB structure
│       ├── routes/
│       │   ├── authRoutes.js         ← Auth URLs
│       │   └── transactionRoutes.js  ← Transaction URLs
│       └── services/
│           └── bankSimulator.js      ← Fake bank transaction generator
├── frontend/
│   └── src/
│       ├── App.jsx                   ← Routing setup
│       ├── main.jsx                  ← React entry point
│       ├── socket.js                 ← Socket.io client
│       ├── api/axios.js              ← API calls setup
│       ├── pages/
│       │   ├── Login.jsx             ← Login/Register page
│       │   ├── Dashboard.jsx         ← Main dashboard
│       │   └── Transactions.jsx      ← Transaction history
│       └── components/
│           └── TransactionForm.jsx   ← Transaction submit form
└── ml-service/
    ├── main.py                       ← FastAPI ML server
    ├── train.py                      ← Model training
    └── requirements.txt              ← Python packages
```

---

## OVERALL FLOW

```
User Login karta hai
        ↓
JWT Token milta hai
        ↓
Transaction submit hoti hai (ya bank simulator generate karta hai)
        ↓
authMiddleware token verify karta hai
        ↓
transactionController transaction save karta hai
        ↓
User profile se compare hota hai (location, device, amount)
        ↓
Risk score calculate hota hai
        ↓
ML service se bhi score aata hai
        ↓
FraudLog DB mein save hota hai
        ↓
Agar FRAUD → Socket.io se frontend ko alert
        ↓
Frontend pe "Suspicious Transaction Detected" dikhta hai
```

---

---

# BACKEND FILES — LINE BY LINE

---

## 1. `index.js` — Server ka Main File

```js
require('dotenv').config();
```
.env file load karta hai. Isse PORT, MONGO_URI, JWT_SECRET available ho jaate hain.

```js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
```
Tools import karna:
- express → web server banane ke liye
- http → HTTP server banane ke liye
- socket.io → real-time connection ke liye
- cors → frontend ko backend se baat karne dene ke liye

```js
const app = express();
const server = http.createServer(app);
```
Pehle Express app banao, phir usse HTTP server mein wrap karo.
Socket.io ko HTTP server chahiye hota hai directly.

```js
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);
```
Socket.io setup. `app.set('io', io)` isliye kiya taaki
controllers mein bhi io use kar sakein fraud alert bhejne ke liye.

```js
app.use(cors());
app.use(express.json());
```
Middleware:
- cors() → frontend (port 5173) ko backend (port 5000) se baat karne deta hai
- express.json() → request ka JSON body read kar sakein

```js
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
```
Routes connect karna — jaise signboard lagana:
- /api/auth wali requests → authRoutes mein jao
- /api/transactions wali requests → transactionRoutes mein jao

```js
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});
```
Simple check — browser mein localhost:5000/health kholo
toh confirm ho jaata hai server chal raha hai.

```js
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});
```
Jab bhi koi frontend connect ya disconnect hota hai terminal mein print hota hai.

```js
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});
```
Koi bhi unknown URL aaye toh 404 return karo.

```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});
```
Koi bhi unexpected error aaye toh 500 return karo.

```js
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startBankSimulator(io, 5);
  });
});
```
Pehle MongoDB connect karo, tab server start karo.
DB connect hone ke baad bank simulator bhi shuru hota hai — har 5 seconds mein transaction.

---

## 2. `db.js` — MongoDB Connection

```js
const mongoose = require('mongoose');
```
Mongoose import karo — MongoDB ke saath kaam karne ka tool.

```js
const connectDB = async () => {
```
Async function — DB connection time leta hai.

```js
await mongoose.connect(process.env.MONGO_URI);
console.log('MongoDB connected');
```
.env se MONGO_URI lo aur connect karo.
Success hone pe "MongoDB connected" print hota hai.

```js
} catch (err) {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
}
```
Connection fail ho toh error print karo aur server band karo.
Server bina DB ke kaam nahi kar sakta.

```js
module.exports = connectDB;
```
Function bahar available karo taaki index.js import kar sake.

---

## 3. `authController.js` — Register aur Login

### REGISTER

```js
const { email, password } = req.body;
```
User ne jo JSON bheja usme se email aur password nikalo.

```js
const existing = await User.findOne({ email });
if (existing) return res.status(400).json({ message: 'User already exists' });
```
DB mein check karo — kya yeh email pehle se hai?
Hai toh error bhejo aur function rok do.

```js
const hashed = await bcrypt.hash(password, 10);
```
Password encrypt karo. 10 = salt rounds (zyada = zyada secure).
"mypassword" → "$2a$10$xK9..." — yeh DB mein save hoga.

```js
const user = await User.create({ email, password: hashed });
```
Naya user DB mein save karo — plain password nahi, hashed password.

```js
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.status(201).json({ token, user: { id: user._id, email: user.email } });
```
Token banao jisme user ki ID encoded hai.
7 din baad expire hoga. Frontend ko token bhejo.

### LOGIN

```js
const user = await User.findOne({ email });
if (!user) return res.status(400).json({ message: 'Invalid credentials' });
```
Email se user dhundo. Nahi mila toh error.
"Invalid credentials" bolte hain "Email not found" nahi — security ke liye.

```js
const match = await bcrypt.compare(password, user.password);
if (!match) return res.status(400).json({ message: 'Invalid credentials' });
```
Password compare karo DB ke hashed password se.
Match nahi hua toh error.

```js
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.json({ token, user: { id: user._id, email: user.email } });
```
Sab theek — token banao aur bhejo.

---

## 4. `authMiddleware.js` — Security Guard

```js
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ message: 'No token provided' });
}
```
Request ke header mein token dhundo.
Format hona chahiye: "Bearer eyJhbGci..."
Nahi mila toh 401 Unauthorized.

```js
const token = authHeader.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
next();
```
"Bearer TOKEN" se sirf TOKEN nikalo.
JWT_SECRET se verify karo — valid hai?
Valid hai toh req.user mein user ID save karo.
next() — aage jaane do controller mein.

```js
} catch (err) {
  return res.status(401).json({ message: 'Invalid token' });
}
```
Token tampered ya expired hai toh 401.

---

## 5. `transactionController.js` — Fraud Detection Brain

### getUserProfile()

```js
async function getUserProfile(userId) {
  const user = await User.findById(userId);
  if (user && user.profile && user.profile.baseLocation) {
    return user.profile;
  }
  return null;
}
```
DB se user ka profile fetch karo.
Profile hai toh return karo, nahi hai toh null.
Profile mein hota hai: baseLocation, baseDevice, avgAmount.

### calculateRisk()

```js
const profile = await getUserProfile(userId);
```
User ka profile lo.

```js
if (location !== profile.baseLocation) {
  risk += 30;
  reasons.push('New location');
}
```
Transaction ki location user ke base location se alag hai?
+30 risk. Reason list mein add karo.

```js
if (device !== profile.baseDevice) {
  risk += 25;
  reasons.push('New device');
}
```
Device alag hai? +25 risk.

```js
if (profile.avgAmount && amount > profile.avgAmount * 3) {
  risk += 35;
  reasons.push('High amount');
}
```
Amount user ke average se 3 guna zyada hai? +35 risk.

```js
let status = 'SAFE';
if (risk >= 70)      status = 'FRAUD';
else if (risk >= 30) status = 'SUSPICIOUS';
```
Final status decide karo:
- 0-29 → SAFE
- 30-69 → SUSPICIOUS
- 70+ → FRAUD

### createTransaction()

```js
const transaction = await Transaction.create({ userId, amount, time, location, device });
```
Transaction DB mein save karo.

```js
const { risk: riskScore, status, reasons } = await calculateRisk(userId, amount, location, device);
```
Risk calculate karo.

```js
const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, { amount, time, location, device });
mlScore = mlRes.data.fraud_score;
```
Python ML service ko call karo score ke liye.
Agar ML service down hai toh rule-based score use karo (fallback).

```js
const combinedScore = parseFloat(((mlScore + riskScore / 100) / 2).toFixed(4));
```
ML score + rule score ka average nikalo.

```js
const fraudLog = await FraudLog.create({
  transactionId: transaction._id,
  score: combinedScore,
  isFraud,
  riskScore,
  status,
  reason: reasons.join(' and ')
});
```
Fraud result DB mein save karo.

```js
if (riskScore >= 70) {
  io.emit('fraud_alert', { ... });
}
```
FRAUD hai toh Socket.io se frontend ko real-time alert bhejo.

```js
res.status(201).json({ transaction, riskScore, status, reasons, fraudLog });
```
Poora result frontend ko bhejo.

---

## 6. `models/User.js`

```js
const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: {
    baseLocation: { type: String, default: null },
    baseDevice:   { type: String, default: null },
    avgAmount:    { type: Number, default: null }
  }
}, { timestamps: true });
```
User ka DB structure:
- email → unique hona chahiye
- password → required (hashed store hoga)
- profile → fraud detection ke liye base behavior
- timestamps → createdAt, updatedAt auto add hota hai

---

## 7. `models/Transaction.js`

```js
const transactionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:   { type: Number, required: true },
  time:     { type: Number, required: true },
  location: { type: String, required: true },
  device:   { type: String, required: true }
});
```
Transaction ka DB structure:
- userId → kis user ka transaction hai (User model se link)
- amount → kitne rupaye
- time → seconds since midnight
- location → kahan se
- device → kis device se

---

## 8. `models/FraudLog.js`

```js
const fraudLogSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  score:         { type: Number },
  isFraud:       { type: Boolean },
  feedback:      { type: String, enum: ['valid', 'fraud', null] },
  riskScore:     { type: Number },
  status:        { type: String, enum: ['SAFE', 'SUSPICIOUS', 'FRAUD'] },
  reason:        { type: String }
});
```
Fraud result ka DB structure:
- transactionId → kis transaction ka result hai
- score → combined ML + rule score (0-1)
- isFraud → true/false
- feedback → user ne confirm kiya valid hai ya fraud
- riskScore → rule-based score (0-100)
- status → SAFE / SUSPICIOUS / FRAUD
- reason → kyun fraud mana — "New location and High amount"

---

## 9. `routes/authRoutes.js`

```js
router.post('/register', register);
router.post('/login', login);
```
Sirf URL ko controller function se connect karta hai.
POST /api/auth/register → register function
POST /api/auth/login → login function

---

## 10. `routes/transactionRoutes.js`

```js
router.post('/', protect, createTransaction);
router.get('/', protect, getTransactions);
router.post('/:id/feedback', protect, submitFeedback);
```
protect middleware pehle chalta hai — token verify karta hai.
Sirf valid token wale users hi in routes ko access kar sakte hain.

---

## 11. `services/bankSimulator.js` — Fake Bank

```js
const nearbyLocations = {
  'Chennai': ['Chennai', 'Bangalore', 'Hyderabad'],
  'Mumbai':  ['Mumbai', 'Pune', 'Surat'],
  ...
};
```
Realistic location map — Chennai se directly New York nahi jaate.
Nearby cities mein hi transaction hoti hai normally.

```js
async function getProfile(user) {
  if (user.profile && user.profile.baseLocation) {
    return user.profile;
  }
  // first time — create profile and save to DB
  await User.findByIdAndUpdate(user._id, { profile: { baseLocation, baseDevice, avgAmount } });
}
```
User ka profile DB se lo. Pehli baar nahi hai toh random assign karo aur save karo.

```js
const isSuspicious = Math.random() < 0.25;
```
25% chance suspicious transaction ka, 75% normal.

```js
if (!isSuspicious) {
  location = pick(nearbyPool);   // nearby city
  device   = profile.baseDevice; // same device
  amount   = normalAmount(profile.avgAmount); // normal amount
} else {
  location = pick(suspiciousLocations); // Dubai, London etc
  device   = pick(otherDevices);        // Unknown Device
  amount   = suspiciousAmount(profile.avgAmount); // 5x-15x amount
}
```
Normal transaction → same behavior
Suspicious → alag location, device, high amount

```js
setInterval(() => simulateTransaction(io), intervalSeconds * 1000);
```
Har 5 seconds mein ek transaction generate karo automatically.

---

---

# VIVA MEIN POOCHE JAANE WALE IMPORTANT QUESTIONS

---

## Basic Questions

**Q: Yeh project kya karta hai?**
A: Yeh ek AI-powered fraud detection system hai jo bank transactions monitor karta hai, user ke behavior se compare karta hai, risk score calculate karta hai aur real-time fraud alerts bhejta hai.

**Q: Kaun si technologies use ki hain?**
A: Backend mein Node.js + Express, Database mein MongoDB + Mongoose, Authentication mein JWT, Frontend mein React + Vite, Real-time mein Socket.io, ML mein Python + FastAPI + Isolation Forest.

**Q: MVC architecture kyun use kiya?**
A: Code organized rehta hai. Model = data, View = frontend, Controller = logic. Ek cheez change karo toh doosri affect nahi hoti. Easy to maintain aur debug karna.

---

## Authentication Questions

**Q: JWT kya hota hai?**
A: JSON Web Token — ek encrypted string jisme user ki ID hoti hai. Login ke baad milta hai. Har request mein bheja jaata hai taaki server pehchane ki kaun hai.

**Q: Password plain text mein kyun nahi store karte?**
A: Security ke liye. Agar DB hack ho toh passwords safe rahein. bcrypt se hash karte hain — one-way encryption, hash se password nahi nikalta.

**Q: bcrypt.hash(password, 10) mein 10 kya hai?**
A: Salt rounds — kitni baar hash karna hai. Zyada = zyada secure lekin thoda slow. 10 industry standard hai.

**Q: authMiddleware kya karta hai?**
A: Security guard ki tarah. Har protected route pe pehle token verify karta hai. Valid token hai toh aage jaane deta hai, nahi toh 401 Unauthorized.

---

## Database Questions

**Q: MongoDB kyun use kiya SQL ki jagah?**
A: Fraud detection mein flexible data hota hai. MongoDB mein schema change karna easy hai. JSON-like documents directly store hote hain. Scalable hai.

**Q: Mongoose kya hai?**
A: MongoDB aur Node.js ke beech bridge. Schema define karne deta hai, validation karta hai, CRUD operations easy banata hai.

**Q: Transaction model mein userId kyun hai?**
A: Har transaction ko ek user se link karna zaroori hai. Isse sirf us user ki transactions fetch kar sakte hain. Data isolation hoti hai.

**Q: FraudLog alag model kyun banaya?**
A: Separation of concerns. Transaction ka kaam sirf transaction data store karna hai. Fraud result alag store karo taaki independently query kar sakein.

---

## Fraud Detection Questions

**Q: Risk score kaise calculate hota hai?**
A: User ke profile se compare karte hain:
- Location alag → +30
- Device alag → +25
- Amount 3x se zyada → +35
- Total 70+ → FRAUD, 30-69 → SUSPICIOUS, 0-29 → SAFE

**Q: User profile kya hota hai?**
A: Har user ka base behavior — baseLocation, baseDevice, avgAmount. Isse pata chalta hai user normally kahan se, kis device se, kitne amount ki transactions karta hai.

**Q: ML service kya karta hai?**
A: Python FastAPI service jo transaction data lekar fraud score return karta hai. Isolation Forest algorithm use karta hai — anomaly detection ke liye. Rule-based score ke saath combine hota hai.

**Q: Agar ML service down ho toh kya hoga?**
A: Fallback hai — rule-based score use hota hai. try/catch se handle kiya hai. Server crash nahi karta.

---

## Real-Time Questions

**Q: Socket.io kyun use kiya?**
A: Real-time alerts ke liye. HTTP mein client ko baar baar request karna padta. Socket.io mein server khud frontend ko message bhej sakta hai jab fraud detect ho.

**Q: io.emit() kya karta hai?**
A: Sabhi connected clients ko ek saath message bhejta hai. Jaise broadcast karna.

**Q: fraud_alert event kab emit hota hai?**
A: Jab riskScore >= 70 ho — FRAUD status pe. Frontend pe "Suspicious Transaction Detected" banner dikhta hai.

---

## Bank Simulator Questions

**Q: Bank simulator kyun banaya?**
A: Real bank API se connect nahi kar sakte. Simulator realistic transactions generate karta hai taaki fraud detection test ho sake without real data.

**Q: Simulator realistic kyun hai?**
A: User profile use karta hai. 75% normal transactions — same location, device, normal amount. 25% suspicious — far location, unknown device, high amount. Chennai se directly New York nahi jaata — nearby cities use karta hai.

**Q: setInterval kya karta hai?**
A: Har X milliseconds mein ek function run karta hai. Yahan har 5 seconds mein ek transaction generate hoti hai automatically.

---

## General Questions

**Q: .env file kyun use karte hain?**
A: Secrets (passwords, API keys) code mein hardcode nahi karte. .gitignore mein add karte hain taaki GitHub pe na jaaye. Different environments ke liye different values.

**Q: CORS kya hai?**
A: Browser security feature. By default browser ek domain se doosre domain pe request block karta hai. cors() middleware se allow karte hain frontend ko backend se baat karne dene ke liye.

**Q: async/await kyun use kiya?**
A: Database operations time lete hain. async/await se code readable rehta hai aur execution block nahi hota. Bina await ke DB result aane se pehle aage chala jaata.

**Q: 404 handler kyun add kiya?**
A: Koi bhi undefined route pe request aaye toh proper error message milna chahiye. Bina iske server crash ho sakta tha ya empty response aata.

**Q: req.user kahan se aata hai?**
A: authMiddleware mein JWT decode hone ke baad `req.user = decoded` set hota hai. Isse controllers mein `req.user.id` se logged-in user ki ID milti hai.

---

## Project Run Karne Ke Steps

```
1. MongoDB service running honi chahiye

2. Backend:
   cd backend
   npm install
   npm run dev
   → "MongoDB connected" aur "Server running on port 5000" dikhna chahiye

3. Frontend:
   cd frontend
   npm install
   npm run dev
   → http://localhost:5173 pe app khulega

4. ML Service (optional):
   cd ml-service
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
```

---

*NeuroShield — AI Fraud Detection System*
