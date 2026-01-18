"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSocket } from "@/lib/socket";

export default function GameSelect() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.gameId as string;
    const [joinCode, setJoinCode] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [isJoining, setIsJoining] = useState(false);

    // Connect socket on mount (or here)
    const socket = getSocket();

    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            alert("Please enter your name");
            return;
        }
        setIsJoining(true);
        socket.connect();
        socket.emit("create-room", { gameId, playerName: playerName.trim() });

        socket.once("room-created", ({ roomCode }) => {
            // Use the gameId from params, which will now be 'kaali-tilli'
            router.push(`/room/${roomCode}?game=${gameId}`);
        });
    };

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.length !== 4) return;
        if (!playerName.trim()) {
            alert("Please enter your name");
            return;
        }

        setIsJoining(true);
        socket.connect();
        socket.emit("join-room", { roomCode: joinCode.toUpperCase(), playerName: playerName.trim() });

        socket.once("room-joined", ({ roomCode }) => {
            router.push(`/room/${roomCode}?game=${gameId}`);
        });

        socket.once("error", ({ message }) => {
            alert(message);
            setIsJoining(false);
        });
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <button
                onClick={() => router.push("/")}
                className="absolute top-8 left-8 text-gray-400 hover:text-white transition-colors"
            >
                ← Back to Arcade
            </button>

            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-2 text-gradient capitalize">{gameId.replace('-', ' ')}</h1>
                    <p className="text-gray-400">Start a new table or join friends.</p>
                </div>

                {/* Player Name Input */}
                <div className="glass-panel p-6 rounded-2xl">
                    <label className="block text-sm font-bold text-gray-300 mb-2">Your Name</label>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        maxLength={20}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                </div>

                <div className="grid gap-6">
                    {/* Create Room */}
                    <button
                        onClick={handleCreateRoom}
                        disabled={isJoining || !playerName.trim()}
                        className="glass-panel p-8 rounded-2xl hover:bg-white/10 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <h3 className="text-2xl font-bold mb-2 group-hover:text-amber-400 transition-colors">Create Room</h3>
                        <p className="text-gray-400 text-sm">Host a new game and invite others.</p>
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink mx-4 text-gray-600">OR</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>

                    {/* Join Room */}
                    <form onSubmit={handleJoinRoom} className="glass-panel p-8 rounded-2xl space-y-4">
                        <h3 className="text-2xl font-bold mb-2">Join Room</h3>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="CODE"
                                maxLength={4}
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-widest uppercase focus:outline-none focus:border-amber-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={joinCode.length !== 4 || isJoining || !playerName.trim()}
                                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold transition-all"
                            >
                                GO
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
