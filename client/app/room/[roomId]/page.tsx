"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import Hand from "@/components/Hand";
import PartnerSelector from "@/components/PartnerSelector";
import TrickTable from "@/components/TrickTable";
import BiddingControls from "@/components/BiddingControls";
import { Suit } from "@/types";
import clsx from "clsx";

export default function RoomPage() {
    const { roomId } = useParams();
    const searchParams = useSearchParams();
    const gameType = searchParams.get('game');
    const router = useRouter();

    const [players, setPlayers] = useState<{ id: string, name: string }[]>([]);
    const [messages, setMessages] = useState<string[]>([]);

    // Game State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [gameState, setGameState] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastTrickMessage, setLastTrickMessage] = useState<string | null>(null);

    const socket = getSocket();

    useEffect(() => {
        // Always request latest state on mount, in case we missed the event during navigation
        if (socket.connected) {
            socket.emit('sync-room-state', { roomCode: roomId });
        } else {
            socket.connect();
            socket.emit('join-room', { roomCode: roomId });
        }

        socket.on('connect', () => {
            // Handle reconnection
            socket.emit('join-room', { roomCode: roomId });
        });

        socket.on('room-joined', () => {
            addLog('Joined room successfully');
            // Also sync state
            socket.emit('sync-room-state', { roomCode: roomId });
        });

        // Authoritative state update
        socket.on('update-players', (currentPlayers: { id: string, name: string }[]) => {
            setPlayers(currentPlayers);
            addLog(`Player count updated: ${currentPlayers.length}`);
        });

        socket.on('game-state', (state) => {
            setGameState(state);
            console.log('Game State:', state);
        });

        socket.on('trick-winner', (data: { winnerId: string, winnerName: string, points: number }) => {
            setLastTrickMessage(`${data.winnerName} won ${data.points} points!`);
            // Clear message after 3 seconds
            setTimeout(() => setLastTrickMessage(null), 3000);
        });

        socket.on('error', ({ message }) => {
            if (message === 'Room not found') {
                alert(message);
                router.push('/');
            } else {
                setErrorMessage(message);
                setTimeout(() => setErrorMessage(null), 3000);
            }
        });

        return () => {
            socket.off('room-joined');
            socket.off('update-players');
            socket.off('game-state');
            socket.off('trick-winner');
            socket.off('error');
        };
    }, [roomId, socket, router]);

    const addLog = (msg: string) => {
        setMessages(prev => [...prev, msg].slice(-5));
    };

    const handleStartGame = () => {
        socket.emit('start-game', { roomCode: roomId });
    };

    const handleBid = (amount: number) => {
        socket.emit('game-action', { roomCode: roomId, action: 'BID', payload: { amount } });
    };

    const handleBidAction = (action: 'PASS' | 'DONE') => {
        // Reuse BID action or separate? Server handles 'PASS'/'DONE' in handleBid method
        // So we can send it as amount?
        socket.emit('game-action', { roomCode: roomId, action: 'BID', payload: { amount: action } });
    };

    const handleFinishBidding = () => {
        // Debug/Force finish
        socket.emit('game-action', { roomCode: roomId, action: 'FINISH_BIDDING', payload: {} });
    };

    const handlePickPartners = (cards: string[], trump: Suit) => {
        socket.emit('game-action', { roomCode: roomId, action: 'PICK_PARTNERS', payload: { cards, trump } });
    };

    const handlePlayCard = (cardId: string) => {
        socket.emit('game-action', { roomCode: roomId, action: 'PLAY_CARD', payload: { cardId } });
    };

    return (
        <main className="flex min-h-screen bg-[#1a1a2e] text-white">
            {/* Sidebar - Players */}
            <aside className="w-64 glass-panel border-r border-white/10 p-4 flex flex-col">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-amber-500">Room Code</h2>
                    <div className="text-4xl font-mono tracking-widest mt-1 text-white">{roomId}</div>
                </div>

                <div className="flex-1">
                    <h3 className="text-sm uppercase text-gray-400 font-bold mb-3">Players ({players.length})</h3>
                    <ul className="space-y-2">
                        {players.map(p => (
                            <li key={p.id} className="flex items-center gap-2 p-2 rounded bg-white/5">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="font-mono text-sm">
                                    {p.id === socket.id ? `${p.name} (You)` : p.name}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Admin Controls */}
                <div className="mt-4 pt-4 border-t border-white/10">
                    {players.length > 0 && players[0].id === socket.id ? (
                        <>
                            <button
                                onClick={handleStartGame}
                                disabled={players.length < 5 || players.length > 7 || (gameState?.phase && gameState.phase !== 'WAITING' && gameState.phase !== 'FINISHED')}
                                className={clsx(
                                    "w-full py-2 rounded font-bold mb-2 transition-colors",
                                    (players.length < 5 || players.length > 7 || (gameState?.phase && gameState.phase !== 'WAITING' && gameState.phase !== 'FINISHED'))
                                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                        : "bg-green-600 hover:bg-green-500 text-white"
                                )}
                            >
                                {gameState?.phase && gameState.phase !== 'WAITING' && gameState.phase !== 'FINISHED' ? 'Game in Progress' : `Start Game (${players.length}/7)`}
                            </button>
                            {(players.length < 5) && <p className="text-xs text-center text-red-400 mb-2">Need at least 5 players</p>}

                            {/* Debug/Admin Force End */}
                            {gameState?.phase === 'BIDDING' && (
                                <button onClick={handleFinishBidding} className="w-full bg-gray-800/50 hover:bg-gray-700 text-gray-500 py-1 text-xs rounded mt-4">
                                    (Debug) Force End Bid
                                </button>
                            )}
                        </>
                    ) : (
                        // Only show waiting message if game hasn't started
                        gameState?.phase === 'WAITING' ? (
                            <div className="text-center text-gray-400 text-sm py-2">
                                <p>Waiting for host to start...</p>
                                <p className="text-xs text-gray-500 mt-1">Host: {players[0]?.name}</p>
                            </div>

                        ) : null
                    )}
                </div>
            </aside>

            {/* Notification Toast for Trick Winner */}
            {
                lastTrickMessage && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-500">
                        <div className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center gap-2 border-2 border-white/50">
                            <span className="text-xl">🏆</span>
                            <span>{lastTrickMessage}</span>
                        </div>
                    </div>
                )
            }

            {/* Main Game Area */}
            <section className="flex-1 flex flex-col">
                {/* Top Bar */}
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-30">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold capitalize leading-none text-white/90">{gameType || 'Game Room'}</h1>
                            <span className="text-xs text-amber-500 font-mono">{gameState?.phase || 'LOBBY'}</span>
                        </div>

                        {/* Bid Info Loop */}
                        {gameState?.currentBid > 150 && (
                            <div className="flex items-center gap-3 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Bid</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-amber-400 font-bold text-xl">{gameState.currentBid}</span>
                                    {gameState.bidderName && (
                                        <span className="text-xs text-gray-300">
                                            by <span className="text-white font-bold">{gameState.bidderName}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Remaining Points */}
                        {gameState?.phase === 'PLAYING' && (
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Remaining</span>
                                <span className="text-white font-bold text-xl">
                                    {250 - (gameState.playerPoints?.reduce((acc: number, p: any) => acc + (p.points || 0), 0) || 0)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Center Info: Trump & Partners */}
                    {gameState?.trump && (
                        <div className="flex items-center gap-6">
                            {/* Trump Display */}
                            <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">TRUMP</span>
                                <span className={clsx("font-bold text-lg leading-none", (gameState.trump === 'H' || gameState.trump === 'D') ? "text-red-500" : "text-white")}>
                                    {{ H: '♥', D: '♦', C: '♣', S: '♠' }[gameState.trump as string]}
                                    <span className="ml-1 text-sm font-normal text-gray-400">
                                        {{ H: 'Hearts', D: 'Diamonds', C: 'Clubs', S: 'Spades' }[gameState.trump as string]}
                                    </span>
                                </span>
                            </div>

                            {/* Partners Display */}
                            {gameState.partners && (
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2">
                                        {gameState.partners.map((cardId: string) => {
                                            const [suit, rank] = cardId.split('-');
                                            return (
                                                <div key={cardId} className="relative group flex items-center justify-center w-8 h-10 bg-gray-100 rounded text-base font-bold shadow-lg border border-gray-300">
                                                    <span className={(suit === 'H' || suit === 'D') ? "text-red-600" : "text-black"}>
                                                        {suit === 'H' ? '♥' : suit === 'D' ? '♦' : suit === 'C' ? '♣' : '♠'}
                                                    </span>
                                                    <span className={clsx("absolute bottom-0.5 right-1 text-[10px]", (suit === 'H' || suit === 'D') ? "text-red-600" : "text-black")}>{rank}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Revealed Partners Names */}
                                    {gameState.revealedPartners && gameState.revealedPartners.length > 0 ? (
                                        <div className="flex flex-col text-xs">
                                            <span className="text-gray-500 uppercase text-[10px] font-bold">Revealed</span>
                                            <div className="flex gap-1">
                                                {
                                                    gameState.revealedPartners.map((pid: string) => (
                                                        <span key={pid} className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                                                            {players.find(p => p.id === pid)?.name || 'Unknown'}
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col text-xs opacity-50">
                                            <span className="text-gray-600 uppercase text-[10px] font-bold">Revealed</span>
                                            <span className="text-gray-500 italic">None</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button className="text-gray-400 hover:text-red-300 text-xs uppercase tracking-wider font-bold border border-white/10 px-3 py-1.5 rounded hover:bg-white/5 transition-colors" onClick={() => router.push('/')}>Leave Room</button>
                    </div>
                </header>

                {/* Game Content */}
                <div className="flex-1 relative bg-green-900/20 m-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl">

                    {/* Center Table Cloth */}
                    <div className="absolute inset-0 bg-[#0f3d0f] opacity-50 radial-gradient"></div>

                    {/* Info Center / Partner Selection */}
                    <div className="relative z-10 text-center text-white/30 mb-auto mt-20 w-full flex justify-center pointer-events-none">
                        <div className="pointer-events-auto"> {/* Interactive container */}
                            {gameState?.phase === 'WAITING' && (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                                        <span className="text-2xl">⏳</span>
                                    </div>
                                    <p className="text-xl text-gray-300 font-light">Waiting for host to start...</p>
                                </div>
                            )}

                            {gameState?.phase === 'BIDDING' && (
                                <BiddingControls
                                    currentBid={gameState.currentBid}
                                    onBid={handleBid}
                                    onAction={handleBidAction}
                                    myBid={gameState.myBid}
                                    isActive={gameState.biddingState?.activePlayers.includes(socket.id)}
                                    isReady={gameState.biddingState?.readyPlayers.includes(socket.id)}
                                />
                            )}

                            {gameState?.phase === 'PARTNER_SELECT' && (
                                gameState.bidderId === socket.id ? (
                                    <PartnerSelector onSelect={handlePickPartners} />
                                ) : (
                                    <div className="flex flex-col items-center gap-4 p-8 bg-black/40 backdrop-blur rounded-2xl border border-white/10">
                                        <div className="w-12 h-12 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                                        <p className="text-xl text-amber-500">Bidder is choosing partners...</p>
                                    </div>
                                )
                            )}

                            {gameState?.phase === 'FINISHED' && (
                                <div className="min-w-[500px] text-center bg-black/80 backdrop-blur-xl p-8 rounded-3xl border border-white/20 animate-in fade-in zoom-in slide-in-from-bottom-5 shadow-2xl">
                                    <h2 className="text-5xl font-black mb-1 p-2 bg-clip-text text-transparent bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 drop-shadow-sm">
                                        GAME OVER
                                    </h2>

                                    <div className="text-xl font-medium mb-8 text-gray-400">
                                        Target Bid: <span className="text-white font-bold">{gameState.currentBid}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 mb-8">
                                        {/* Bidders Team Card */}
                                        <div className="bg-gradient-to-b from-green-900/30 to-green-900/10 rounded-xl p-4 border border-green-500/30">
                                            <h3 className="text-green-400 font-bold text-lg mb-2 uppercase tracking-wider border-b border-green-500/20 pb-2">Attacking Team</h3>
                                            <div className="text-4xl font-bold text-white mb-2 shadow-green-500/50 drop-shadow-lg">
                                                {gameState.scores?.filter((s: any) => s.team === 'BIDDER' || s.team === 'PARTNER').reduce((a: any, b: any) => a + b.points, 0) || 0}
                                            </div>
                                            <div className="text-xs text-green-300/50 mb-4">Total Points</div>

                                            <ul className="space-y-1 text-left">
                                                {gameState.scores?.filter((s: any) => s.team === 'BIDDER' || s.team === 'PARTNER').map((p: any) => (
                                                    <li key={p.id} className="flex justify-between items-center text-sm p-1.5 rounded bg-green-500/10 mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white">{p.name} {p.team === 'BIDDER' && '👑'}</span>
                                                            {p.team === 'PARTNER' && <span className="text-[10px] bg-green-500/20 text-green-300 px-1 rounded">Partner</span>}
                                                        </div>
                                                        <span className="font-mono text-green-200">{p.points}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Defenders Team Card */}
                                        <div className="bg-gradient-to-b from-red-900/30 to-red-900/10 rounded-xl p-4 border border-red-500/30">
                                            <h3 className="text-red-400 font-bold text-lg mb-2 uppercase tracking-wider border-b border-red-500/20 pb-2">Defending Team</h3>
                                            <div className="text-4xl font-bold text-white mb-2 shadow-red-500/50 drop-shadow-lg">
                                                {gameState.scores?.filter((s: any) => s.team !== 'BIDDER' && s.team !== 'PARTNER').reduce((a: any, b: any) => a + b.points, 0) || 0}
                                            </div>
                                            <div className="text-xs text-red-300/50 mb-4">Total Points</div>

                                            <ul className="space-y-1 text-left">
                                                {gameState.scores?.filter((s: any) => s.team !== 'BIDDER' && s.team !== 'PARTNER').map((p: any) => (
                                                    <li key={p.id} className="flex justify-between items-center text-sm p-1.5 rounded bg-red-500/10 mb-1">
                                                        <span className="font-bold text-white">{p.name}</span>
                                                        <span className="font-mono text-red-200">{p.points}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="text-3xl font-black mb-8">
                                        {(gameState.scores?.filter((s: any) => s.team === 'BIDDER' || s.team === 'PARTNER').reduce((a: any, b: any) => a + b.points, 0) || 0) >= gameState.currentBid
                                            ? <span className="text-green-500 animate-pulse drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">VICTORY FOR BIDDERS!</span>
                                            : <span className="text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">DEFENDERS WIN!</span>}
                                    </div>

                                    {players.length > 0 && players[0].id === socket.id ? (
                                        <button onClick={handleStartGame} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:scale-105 transition-transform shadow-xl">
                                            Play Again
                                        </button>
                                    ) : (
                                        <div className="text-gray-400 italic mt-4 animate-pulse">
                                            Waiting for host to start a new game...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                        {gameState?.phase === 'PLAYING' && (
                            <div className="flex flex-col items-center">
                                {/* Current Turn Indicator - Prominent */}
                                <div className="mb-8 px-6 py-2 bg-gradient-to-r from-amber-600/20 to-amber-900/20 border border-amber-500/30 rounded-full backdrop-blur-sm animate-pulse">
                                    {(gameState.trickStarterIndex !== undefined) && (
                                        <div className="text-lg text-amber-500">
                                            Current Turn: <span className="font-bold text-white text-xl ml-2">
                                                {players.find(p => p.id === gameState.playerOrder?.[(gameState.trickStarterIndex + (gameState.currentTrick?.length || 0)) % gameState.playerOrder.length])?.name || 'Unknown'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <TrickTable
                                    trick={gameState.currentTrick || []}
                                    players={players}
                                    myId={socket.id || ''}
                                    activePlayerId={gameState.playerOrder?.[(gameState.trickStarterIndex + (gameState.currentTrick?.length || 0)) % gameState.playerOrder.length]}
                                    playerPoints={gameState.playerPoints || []}
                                />
                            </div>
                        )}
                    </div>

                    {/* Player Hand */}
                    <div className="relative z-20 w-full px-8 pb-8 mt-auto">
                        {gameState?.hand && (
                            <Hand
                                cards={gameState.hand}
                                onPlayCard={handlePlayCard}
                                disabled={gameState.phase !== 'PLAYING'}
                            />
                        )}
                    </div>
                </div>
            </section>
        </main >
    );
}
