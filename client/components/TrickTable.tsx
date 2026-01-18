"use client";

import { Card } from "@/types";
import clsx from "clsx";

interface TrickTableProps {
    trick: { playerId: string, card: Card }[];
    players: { id: string, name: string }[];
    myId: string;
    activePlayerId?: string;
    playerPoints?: { playerId: string, points: number }[];
}

const suitIcons: Record<string, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

export default function TrickTable({ trick, players, myId, activePlayerId, playerPoints }: TrickTableProps) {
    // 1. Sort players so "Me" is at index 0 (bottom), others follow clockwise
    const myIndex = players.findIndex(p => p.id === myId);
    const rotatedPlayers = myIndex !== -1
        ? [...players.slice(myIndex), ...players.slice(0, myIndex)]
        : players;

    return (
        <div className="relative w-[500px] h-[500px] flex items-center justify-center rounded-full border-2 border-white/5 bg-white/5 backdrop-blur-sm">
            {/* Center Table Decoration */}
            <div className="absolute inset-0 rounded-full border border-white/10 opacity-50 m-20"></div>

            {rotatedPlayers.map((player, index) => {
                const total = rotatedPlayers.length;
                // Index 0 is ME (Bottom).
                // CSS Positioning: 0 deg is Right. We want index 0 at 90 deg (Bottom).
                // Angle = 90 + (index * 360 / total)

                const angleDeg = 90 + (index * 360 / total);
                const angleRad = (angleDeg * Math.PI) / 180;

                const radius = 220; // Radius for Seats
                const x = Math.cos(angleRad) * radius;
                const y = Math.sin(angleRad) * radius;

                const isActive = player.id === activePlayerId;

                // Find if this player played a card in the current trick
                const playedAction = trick.find(t => t.playerId === player.id);
                const playedCard = playedAction?.card;
                const isRed = playedCard && (playedCard.suit === 'H' || playedCard.suit === 'D');

                return (
                    <div key={player.id} className="absolute flex flex-col items-center" style={{
                        transform: `translate(${x}px, ${y}px)`
                    }}>
                        {/* Player Seat Avatar */}
                        <div className={clsx(
                            "relative flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 transition-all duration-300",
                            isActive ? "border-amber-400 bg-amber-900/80 shadow-[0_0_20px_rgba(251,191,36,0.5)] scale-110" : "border-white/10 bg-black/40 text-gray-400",
                            player.id === myId ? "opacity-50 scale-75" : ""
                        )}>
                            <div className="text-xs font-bold text-center px-1 truncate max-w-full text-white">
                                {player.id === myId ? "You" : player.name}
                            </div>
                            {/* Status Indicator */}
                            {isActive && <div className="absolute -top-3 animate-bounce text-amber-400 text-[10px] font-black tracking-widest bg-black/80 px-1 rounded">TURN</div>}
                        </div>

                        {/* Played Card - Positioned towards center */}
                        {playedCard && (
                            <div
                                className={clsx(
                                    "absolute w-14 h-20 rounded shadow-xl border border-gray-300 bg-white flex flex-col items-center justify-between p-0.5 select-none transition-all duration-500 animate-in zoom-in slide-in-from-bottom-4 z-10",
                                    isRed ? "text-red-600" : "text-slate-900"
                                )}
                                style={{
                                    // Make card appear "in front" of the player, moving towards center
                                    // Center of table is relative (distance ~220px away).
                                    // We want card at ~130px from center (so ~90px from player).
                                    // Invert angle to point to center.
                                    transform: `translate(${Math.cos(angleRad + Math.PI) * 90}px, ${Math.sin(angleRad + Math.PI) * 90}px)`
                                }}
                            >
                                <div className="self-start text-[10px] font-bold leading-none">{playedCard.rank}{suitIcons[playedCard.suit]}</div>
                                <div className="text-lg leading-none">{suitIcons[playedCard.suit]}</div>
                                <div className="self-end text-[10px] font-bold leading-none rotate-180">{playedCard.rank}{suitIcons[playedCard.suit]}</div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
