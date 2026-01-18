export type Suit = 'H' | 'D' | 'C' | 'S';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    id: string; // e.g. "H-A", "D-10"
    suit: Suit;
    rank: Rank;
    points: number;
}
