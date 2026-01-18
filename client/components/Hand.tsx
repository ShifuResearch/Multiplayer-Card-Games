"use client";

import { Card } from "@/types"; // We will need to define shared types or just use any
import clsx from "clsx";

interface HandProps {
    cards: Card[]; // Todo: Type
    onPlayCard?: (cardId: string) => void;
    disabled?: boolean;
}

const suitIcons: Record<string, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

export default function Hand({ cards, onPlayCard, disabled }: HandProps) {
    return (
        <div className="flex justify-center -space-x-12 hover:-space-x-8 transition-all py-4 overflow-x-auto min-h-[160px]">
            {cards.map((card, index) => {
                const isRed = card.suit === 'H' || card.suit === 'D';
                return (
                    <div
                        key={card.id}
                        onClick={() => !disabled && onPlayCard?.(card.id)}
                        className={clsx(
                            "relative w-24 h-36 rounded-xl shadow-xl border-2 border-white/20 flex flex-col items-center justify-between p-2 select-none transition-transform hover:-translate-y-4 hover:z-10 bg-white",
                            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                            isRed ? "text-red-600" : "text-slate-900"
                        )}
                        style={{ zIndex: index }}
                    >
                        <div className="self-start text-xl font-bold">{card.rank}{suitIcons[card.suit]}</div>
                        <div className="text-4xl">{suitIcons[card.suit]}</div>
                        <div className="self-end text-xl font-bold rotate-180">{card.rank}{suitIcons[card.suit]}</div>
                    </div>
                );
            })}
        </div>
    );
}
