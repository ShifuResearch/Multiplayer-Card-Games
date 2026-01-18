"use client";

import { useState } from "react";
import clsx from "clsx";

interface BiddingControlsProps {
    currentBid: number;
    onBid: (amount: number) => void;
    onAction: (action: 'PASS' | 'DONE') => void;
    myBid?: number;
    isActive: boolean; // Can this player bid?
    isReady: boolean; // Has this player said done?
}

export default function BiddingControls({ currentBid, onBid, onAction, myBid, isActive, isReady }: BiddingControlsProps) {
    const minBid = Math.max(currentBid + 5, 150); // Minimum bid is current + 5, or 150 start
    const [bidAmount, setBidAmount] = useState(minBid);

    // Sync internal state if currentBid increases externally
    if (bidAmount <= currentBid) {
        setBidAmount(currentBid + 5);
    }

    const handleBidSubmit = () => {
        onBid(bidAmount);
    };

    if (!isActive) {
        return (
            <div className="glass-panel p-6 rounded-2xl w-full max-w-sm mx-auto text-white">
                <div className="text-gray-400 text-center">You have passed. Waiting for bidding to finish.</div>
                <div className="mt-2 text-center text-xl font-bold text-amber-500">Current Bid: {currentBid}</div>
            </div>
        );
    }

    if (isReady) {
        return (
            <div className="glass-panel p-6 rounded-2xl w-full max-w-sm mx-auto text-white bg-green-900/20 border-green-500/30">
                <div className="text-green-400 text-center font-bold mb-2">You are ready!</div>
                <div className="text-gray-400 text-center text-sm">Waiting for others...</div>
                <div className="mt-4 flex gap-2 justify-center">
                    {/* Option to change mind and bid again? Usually yes. */}
                    <button
                        onClick={() => onBid(minBid)} // Start bidding again?
                        className="px-4 py-1 bg-amber-600 rounded text-sm hover:bg-amber-500"
                    >
                        Raise Bid
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 rounded-2xl w-full max-w-sm mx-auto text-white animate-in zoom-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold mb-4 text-amber-500 text-center">Place Your Bid</h3>

            <div className="flex flex-col items-center gap-4">
                <div className="text-sm text-gray-400">Current Highest: <span className="text-white font-mono text-lg">{currentBid}</span></div>

                <div className="flex items-center gap-4 w-full">
                    <button
                        onClick={() => setBidAmount(Math.max(bidAmount - 5, minBid))}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl font-bold"
                    >
                        -
                    </button>

                    <div className="flex-1 text-center bg-black/40 py-2 rounded-lg border border-white/10">
                        <span className="text-3xl font-mono font-bold text-amber-400">{bidAmount}</span>
                    </div>

                    <button
                        onClick={() => setBidAmount(Math.min(bidAmount + 5, 250))}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl font-bold"
                    >
                        +
                    </button>
                </div>

                <div className="text-xs text-gray-500">Max Bid: 250</div>

                <div className="flex gap-3 w-full mt-2">
                    <button
                        onClick={() => onAction('PASS')}
                        className="flex-1 bg-red-900/50 hover:bg-red-900 border border-red-500/30 text-red-200 py-3 rounded-xl font-bold transition-all"
                    >
                        PASS
                    </button>
                    <button
                        onClick={() => onAction('DONE')}
                        className="flex-1 bg-blue-900/50 hover:bg-blue-900 border border-blue-500/30 text-blue-200 py-3 rounded-xl font-bold transition-all"
                    >
                        DONE
                    </button>
                </div>
                <button
                    onClick={handleBidSubmit}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-[1.02] text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-900/20 transition-all"
                >
                    BID {bidAmount}
                </button>
            </div>
        </div>
    );
}
