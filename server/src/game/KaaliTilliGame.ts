export type Suit = 'H' | 'D' | 'C' | 'S';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    id: string; // e.g. "H-A", "D-10"
    suit: Suit;
    rank: Rank;
    points: number;
}

export type GamePhase = 'WAITING' | 'BIDDING' | 'PARTNER_SELECT' | 'PLAYING' | 'FINISHED';

export interface Player {
    id: string;
    name: string;
    hand: Card[];
    pointsReceived: number;
    bid: number | null;
    team: 'BIDDER' | 'DEFENDER' | 'PARTNER' | null;
}

export class KaaliTilliGame {
    public phase: GamePhase = 'WAITING';
    public players: Map<string, Player> = new Map();
    public playerOrder: string[] = [];

    public deck: Card[] = [];
    public trumpSuit: Suit | null = null;
    public bidderId: string | null = null;
    public currentBid: number = 150;

    // Bidding State
    public activeBidders: Set<string> = new Set(); // Players who haven't passed
    public readyPlayers: Set<string> = new Set();  // Players who said "Done" for current bid

    public partners: string[] = []; // Card IDs (e.g. "H-A")

    public currentTrick: { playerId: string; card: Card }[] = [];
    public trickStarterIndex: number = 0; // Index in playerOrder
    public onTrickComplete?: (winnerId: string, points: number) => void;

    constructor(playerIds: string[], playerNames: Map<string, string>, onTrickComplete?: (winnerId: string, points: number) => void) {
        this.onTrickComplete = onTrickComplete;
        playerIds.forEach(id => {
            this.players.set(id, {
                id,
                name: playerNames.get(id) || `Player ${id.substring(0, 4)}`,
                hand: [],
                pointsReceived: 0,
                bid: null,
                team: null
            });
        });
        this.playerOrder = [...playerIds];
        this.activeBidders = new Set(playerIds); // Everyone starts active
    }

    public startGame() {
        this.generateDeck();
        this.dealCards();
        this.phase = 'BIDDING';
        this.currentBid = 150;
        this.activeBidders = new Set(this.playerOrder);
        this.readyPlayers.clear();
    }

    // ... generateDeck, dealCards, sortCards ...

    public handleBid(playerId: string, amount: number | 'PASS' | 'DONE') {
        if (this.phase !== 'BIDDING') return false;

        // If player already passed, they can't do anything (unless we allow re-entry? Standard No)
        if (!this.activeBidders.has(playerId)) return false;

        if (amount === 'PASS') {
            this.activeBidders.delete(playerId);
            // If everyone passed except one? Or check if everyone is ready
            this.checkBiddingComplete();
            return true;
        }

        if (amount === 'DONE') {
            this.readyPlayers.add(playerId);
            this.checkBiddingComplete();
            return true;
        }

        if (typeof amount === 'number' && amount > this.currentBid && amount <= 250) {
            this.currentBid = amount;
            this.bidderId = playerId;

            // Should the bidder be considered 'ready'? Usually yes.
            this.readyPlayers.clear();
            this.readyPlayers.add(playerId);

            // Update player bid info
            const player = this.players.get(playerId);
            if (player) player.bid = amount;

            return true;
        }
        return false;
    }

    private checkBiddingComplete() {
        // Condition: All ACTIVE bidders must be in READY set
        // Also need at least one bid? Or default 150?
        // If 0 active bidders left (all passed), handle that?
        if (this.activeBidders.size === 0) {
            this.finalizeBidding();
            return;
        }

        const allReady = Array.from(this.activeBidders).every(id => this.readyPlayers.has(id));
        if (allReady) {
            this.finalizeBidding();
        }
    }

    // Call this when bidding is done
    public finalizeBidding() {
        if (this.bidderId) {
            this.phase = 'PARTNER_SELECT';
            const bidder = this.players.get(this.bidderId);
            if (bidder) bidder.team = 'BIDDER';
        } else {
            // No one bid? Force P1 at 150?
            this.bidderId = this.playerOrder[0];
            this.phase = 'PARTNER_SELECT';
        }
    }

    private generateDeck() {
        const suits: Suit[] = ['H', 'D', 'C', 'S'];
        const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const playerCount = this.players.size;

        this.deck = [];

        // Filter rules
        // 5 players: 50 cards (Remove 2D, 2C)
        // 6 players: 48 cards (Remove all 2s)
        // 7 players: 49 cards (Remove 2D, 2C, 2H; Keep 2S)

        for (const suit of suits) {
            for (const rank of ranks) {
                // Skip logic
                if (rank === '2') {
                    if (playerCount === 6) continue; // Remove all 2s
                    if (playerCount === 5 && (suit === 'D' || suit === 'C')) continue;
                    if (playerCount === 7 && suit !== 'S') continue; // Only keep 2S
                }

                // Point calculation
                let points = 0;
                if (['10', 'J', 'Q', 'K', 'A'].includes(rank)) points = 10;
                if (rank === '5') points = 5;
                if (rank === '3' && suit === 'S') points = 30;

                this.deck.push({
                    id: `${suit}-${rank}`,
                    suit,
                    rank,
                    points
                });
            }
        }

        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    private dealCards() {
        const playerIds = Array.from(this.players.keys());
        const cardsPerPlayer = this.deck.length / playerIds.length;

        playerIds.forEach((pid, index) => {
            const start = index * cardsPerPlayer;
            const end = start + cardsPerPlayer;
            const player = this.players.get(pid);
            if (player) {
                player.hand = this.deck.slice(start, end).sort(this.sortCards);
            }
        });
    }

    private sortCards(a: Card, b: Card): number {
        // Sort by Suit then Rank
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        // Rank needs custom order
        const rankOrder: Record<string, number> = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return rankOrder[a.rank] - rankOrder[b.rank];
    }



    public setPartners(playerId: string, partnerCardIds: string[], trump: Suit) {
        if (this.phase !== 'PARTNER_SELECT' || playerId !== this.bidderId) return false;
        if (partnerCardIds.length !== 2) return false;

        this.partners = partnerCardIds;
        this.trumpSuit = trump;

        // Determine teams? No, we don't know who holds the cards yet (except the bidder, maybe).
        // Team assignment happens implicitly when cards are revealed?
        // Actually, we can assign 'PARTNER' role now if we look at hands, but usually it's hidden.
        // user said: "He will announce 2 cards... Who these players are not revealed yet."
        // So internally we can know, but we shouldn't broadcast it as "Player X is partner" yet.

        this.phase = 'PLAYING';

        // Bidder starts the first trick
        this.trickStarterIndex = this.playerOrder.indexOf(playerId);

        return true;
        return true;
    }

    public playCard(playerId: string, cardId: string): { success: boolean, message?: string } {
        if (this.phase !== 'PLAYING') return { success: false, message: 'Not playing phase' };

        // Check turn
        const expectedPlayer = this.playerOrder[this.trickStarterIndex];
        // Logic for calculating current turn based on trick length
        const currentTurnIndex = (this.trickStarterIndex + this.currentTrick.length) % this.playerOrder.length;
        const turnPlayerId = this.playerOrder[currentTurnIndex];

        if (playerId !== turnPlayerId) return { success: false, message: 'Not your turn' };

        const player = this.players.get(playerId);
        if (!player) return { success: false, message: 'Player not found' };

        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return { success: false, message: 'Card not in hand' };
        const card = player.hand[cardIndex];

        // Validate Move
        if (!this.validateMove(player.hand, card)) {
            return { success: false, message: 'Invalid move: Must follow suit or cut' };
        }

        // Execute Move
        player.hand.splice(cardIndex, 1);
        this.currentTrick.push({ playerId, card });

        // Check if this card is a partner card
        if (this.partners.includes(card.id)) {
            // If player isn't bidder, they are a partner
            if (player.team !== 'BIDDER') {
                player.team = 'PARTNER';
                // Allow multiple partners? Game usually has 2.
            }
        }

        // Check if trick complete
        if (this.currentTrick.length === this.players.size) {
            setTimeout(() => this.resolveTrick(), 2000); // Delay for visual
        }

        return { success: true };
    }

    private validateMove(hand: Card[], cardToPlay: Card): boolean {
        if (this.currentTrick.length === 0) return true; // Lead card

        const leadCard = this.currentTrick[0].card;
        const leadSuit = leadCard.suit;

        // Rule 1: Must follow suit
        if (cardToPlay.suit === leadSuit) return true;

        // If not following suit, check if player HAS that suit
        const hasLeadSuit = hand.some(c => c.suit === leadSuit);
        if (hasLeadSuit) return false; // Must play lead suit if you have it

        // Rule 2: If void, MUST play Trump (if available) - "Cut"
        if (this.trumpSuit && cardToPlay.suit !== this.trumpSuit) {
            const hasTrump = hand.some(c => c.suit === this.trumpSuit);
            // Standard Kaali-Tilli/Spades rule: You must trump if you can? 
            // User said: "He has to play a card of the trump suit... You cannot save trump suit cards as well."
            if (hasTrump) return false;
        }

        return true;
    }

    private resolveTrick() {
        if (this.currentTrick.length === 0) return;

        let winnerIndex = 0;
        let highestCard = this.currentTrick[0].card;
        const leadSuit = highestCard.suit;

        for (let i = 1; i < this.currentTrick.length; i++) {
            const played = this.currentTrick[i];
            const card = played.card;

            // If current winner is Trump
            if (highestCard.suit === this.trumpSuit) {
                if (card.suit === this.trumpSuit && this.compareRank(card, highestCard) > 0) {
                    highestCard = card;
                    winnerIndex = i;
                }
            }
            // If current winner is Lead Suit
            else {
                if (card.suit === this.trumpSuit) {
                    // Trump always beats non-trump
                    highestCard = card;
                    winnerIndex = i;
                } else if (card.suit === leadSuit && this.compareRank(card, highestCard) > 0) {
                    highestCard = card;
                    winnerIndex = i;
                }
            }
        }

        const winnerPlayerId = this.currentTrick[winnerIndex].playerId;
        const winner = this.players.get(winnerPlayerId);

        // Calculate Points
        let trickPoints = 0;
        this.currentTrick.forEach(play => {
            trickPoints += play.card.points;
        });

        if (winner) {
            winner.pointsReceived += trickPoints;
        }

        // Reset for next trick
        // Winner starts next trick
        this.trickStarterIndex = this.playerOrder.indexOf(winnerPlayerId);
        this.currentTrick = [];

        // Check for Game End
        const totalCards = this.deck.length; // 50, 48, etc.
        // Or check if hands are empty
        const allEmpty = Array.from(this.players.values()).every(p => p.hand.length === 0);
        if (allEmpty) {
            this.endGame();
        }

        // Notify Listeners (RoomManager) to broadcast update
        if (this.onTrickComplete) {
            this.onTrickComplete(winnerPlayerId, trickPoints);
        }
    }

    private compareRank(a: Card, b: Card): number {
        const rankOrder: Record<string, number> = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return rankOrder[a.rank] - rankOrder[b.rank];
    }

    private endGame() {
        this.phase = 'FINISHED';

        // Calculate Scores
        // 1. Identify Bidder's Team
        const bidderId = this.bidderId;
        if (!bidderId) return;

        const bidderTeamIds = new Set<string>([bidderId]);

        // Logic to find partners: Players who originally held the partner cards
        // NOTE: In the physical game, partners are revealed when the card is played. 
        // Since we have the full deck history/hands, we can just look up who HAD them at start?
        // Or who played them? 
        // Actually, "Partner is the one who HOLDS the card".
        // So we need to track who was dealt those cards, OR who played them.
        // Since we track hands, we can just search all players to see who held them initially?
        // But we sort hand.
        // Better: When `setPartners` was called, we have Card IDs.
        // We can scan the `players` map to see who held those cards at the START (if we kept a copy)
        // OR better, since it's digital, we assign the role 'PARTNER' to the player who holds the card 
        // at the moment of 'PARTNER_SELECT' (or when game starts).
        // Wait, usually deck is dealt, THEN bidding.
        // So the cards are already in someone's hand.

        // Let's iterate all players and check if they HELD the partner cards.
        // But they might have played them during the game.
        // So we can check who played the partner cards in the trick history?
        // We don't have full history here, just current trick.

        // Solution: Store `partnerIds` when found?
        // Or just iterate `this.players` and check if their initial hand had it? 
        // We didn't save initial hand. 
        // Valid approach: When 'setPartners' is called, scan hands to find who owns them NOW.

        // Let's fix `setPartners` to find the players.
        // For now, let's assume we implement that in `setPartners` or here.
        // But `setPartners` might not reveal it publicly.

        // We can re-scan all players. Even if they played it, the `hand` array removes it.
        // We need to store who played what card?
        // Let's add `playedCards` to Player interface or `history`?
        // OR simpler: When a card is played, if it matches partner card, mark that player as PARTNER.

        // Assuming we marked them during play (Logic needed in playCard).
        // For now, let's just create a mock scoring based on pointsReceived.

        let bidderTeamPoints = 0;
        let defenderTeamPoints = 0;

        this.players.forEach(player => {
            if (player.team === 'BIDDER' || player.team === 'PARTNER') {
                bidderTeamPoints += player.pointsReceived;
            } else {
                defenderTeamPoints += player.pointsReceived;
            }
        });

        const bid = this.currentBid || 150;
        const won = bidderTeamPoints >= bid;

        console.log(`Game Over. Bid: ${bid}, Bidder Team: ${bidderTeamPoints}, Defender: ${defenderTeamPoints}`);
        // Broadcast result? Handled by GameState view update where Phase = FINISHED
    }
}
