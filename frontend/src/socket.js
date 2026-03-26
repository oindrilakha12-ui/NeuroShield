// Socket.io client — connects to backend for real-time alerts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL);

export default socket;
