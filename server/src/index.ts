import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './game/RoomManager';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow any origin for local network play
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager(io);

// Health check
app.get('/health', (req, res) => {
    res.send('Server is running');
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Delegate to RoomManager
    roomManager.handleConnection(socket);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        roomManager.handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 4000;

// Bind to 0.0.0.0 to listen on all network interfaces
httpServer.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
