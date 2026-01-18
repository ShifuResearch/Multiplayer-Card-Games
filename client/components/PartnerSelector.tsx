"use client";

import { useState } from "react";
import { Suit, Rank } from "@/types";
import clsx from 'clsx'; // Assuming clsx is available or needs to be imported

interface PartnerSelectorProps {
    onSelect: (partners: string[], trump: Suit) => void;
}

const suitNames: Record<Suit, string> = { H: "Hearts", D: "Diamonds", C: "Clubs", S: "Spades" };

export default function PartnerSelector({ onSelect }: PartnerSelectorProps) {
    const [card1, setCard1] = useState<{ rank: Rank, suit: Suit }>({ rank: 'A', suit: 'H' });
    const [card2, setCard2] = useState<{ rank: Rank, suit: Suit }>({ rank: 'K', suit: 'S' });
    const [trump, setTrump] = useState<Suit>('H');

    const handleSubmit = () => {
        onSelect([`${card1.suit}-${card1.rank}`, `${card2.suit}-${card2.rank}`], trump);
    };

    return (
        <div className="glass-panel p-6 rounded-2xl w-full max-w-lg mx-auto text-white animate-in zoom-in">
            <h3 className="text-2xl font-bold mb-6 text-amber-500 text-center">Select Partners & Trump</h3>

            <div className="space-y-6">
                {/* Partner 1 */}
                <div className="flex items-center gap-4">
                    <label className="w-24 font-bold text-gray-300">Partner 1:</label>
                    <select
                        value={card1.rank}
                        onChange={e => setCard1({ ...card1, rank: e.target.value as Rank })}
                        className="bg-black/40 border border-gray-600 rounded px-3 py-2"
                    >
                        {['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                        value={card1.suit}
                        onChange={e => setCard1({ ...card1, suit: e.target.value as Suit })}
                        className="bg-black/40 border border-gray-600 rounded px-3 py-2 flex-1"
                    >
                        {Object.entries(suitNames).map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                        ))}
                    </select>
                </div>

                {/* Partner 2 */}
                <div className="flex items-center gap-4">
                    <label className="w-24 font-bold text-gray-300">Partner 2:</label>
                    <select
                        value={card2.rank}
                        onChange={e => setCard2({ ...card2, rank: e.target.value as Rank })}
                        className="bg-black/40 border border-gray-600 rounded px-3 py-2"
                    >
                        {['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                        value={card2.suit}
                        onChange={e => setCard2({ ...card2, suit: e.target.value as Suit })}
                        className="bg-black/40 border border-gray-600 rounded px-3 py-2 flex-1"
                    >
                        {Object.entries(suitNames).map(([code, name]) => (
                            <option key={code} value={code}>{name}</option>
                        ))}
                    </select>
                </div>

                {/* Trump Selection */}
                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                    <label className="w-24 font-bold text-amber-500">Trump Suit:</label>
                    <div className="flex flex-1 gap-2">
                        {Object.entries(suitNames).map(([code, name]) => (
                            <button
                                key={code}
                                onClick={() => setTrump(code as Suit)}
                                className={clsx(
                                    "flex-1 py-2 rounded text-sm font-bold transition-all border",
                                    trump === code
                                        ? "bg-amber-600 border-amber-400 text-white shadow-lg scale-105"
                                        : "bg-black/40 border-gray-700 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 transition-all"
                >
                    Confirm Selection
                </button>
            </div>
        </div>
    );
}
