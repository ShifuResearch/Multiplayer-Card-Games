"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket;

export const getSocket = () => {
    if (!socket) {
        // Connect to the same hostname as the browser (handles localhost or network IP)
        // OR use the environment variable if provided (for production)
        const url = process.env.NEXT_PUBLIC_SERVER_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:4000` : "http://localhost:4000");
        socket = io(url, {
            transports: ["websocket"],
            autoConnect: false, // Connect manually when needed/user logs in
        });
    }
    return socket;
};
