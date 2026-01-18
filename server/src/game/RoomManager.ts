import { Server, Socket } from 'socket.io';
import { KaaliTilliGame, Suit } from './KaaliTilliGame';

const DEV_NAMES = ["Matts", "Pandey", "Sarvesh", "Avi", "DJ", "Baba", "Sid"];

interface Room {
    id: string;
    gameId: string;
    players: string[];
    playerNames: Map<string, string>;
    game?: KaaliTilliGame;
}

export class RoomManager {
    private io: Server;
    private rooms: Map<string, Room> = new Map();

    constructor(io: Server) {
        this.io = io;
    }

    public handleConnection(socket: Socket) {
        socket.on('create-room', (data) => this.createRoom(socket, data));
        socket.on('join-room', (data) => this.joinRoom(socket, data));
        socket.on('sync-room-state', (data) => this.syncRoomState(socket, data));

        // Game Actions
        socket.on('start-game', (data) => this.startGame(socket, data));
        socket.on('game-action', (data) => this.handleGameAction(socket, data));
    }

    private handleGameAction(socket: Socket, data: { roomCode: string, action: string, payload: any }) {
        const { roomCode, action, payload } = data;
        const room = this.rooms.get(roomCode);

        if (!room || !room.game) return;

        switch (action) {
            case 'BID':
                // payload: { amount: number | 'PASS' }
                if (room.game.handleBid(socket.id, payload.amount)) {
                    this.broadcastGameState(roomCode);
                }
                break;
            case 'FINISH_BIDDING':
                room.game.finalizeBidding();
                this.broadcastGameState(roomCode);
                break;
            case 'PICK_PARTNERS':
                // payload: { cards: string[], trump: Suit }
                room.game.setPartners(socket.id, payload.cards, payload.trump);
                this.broadcastGameState(roomCode);
                break;
            case 'PLAY_CARD':
                // payload: { cardId: string }
                const result = room.game.playCard(socket.id, payload.cardId);
                if (result.success) {
                    this.broadcastGameState(roomCode);
                } else {
                    socket.emit('error', { message: result.message });
                }
                break;
        }
    }

    private startGame(socket: Socket, data: { roomCode: string }) {
        const room = this.rooms.get(data.roomCode);
        if (room) {
            if (room.players[0] !== socket.id) {
                this.io.to(socket.id).emit('error', { message: 'Only the host can start the game.' });
                return;
            }
            // Check player count constraints (5-7)
            if (room.players.length < 5 || room.players.length > 7) {
                this.io.to(socket.id).emit('error', { message: 'Game requires 5 to 7 players to start.' });
                return;
            }

            room.game = new KaaliTilliGame(room.players, room.playerNames, (winnerId, points) => {
                // Determine winner name
                const winnerName = room.playerNames.get(winnerId) || 'Unknown';
                this.io.to(data.roomCode).emit('trick-winner', { winnerId, winnerName, points });

                this.broadcastGameState(data.roomCode);
            });
            room.game.startGame();

            this.broadcastGameState(data.roomCode);
        }
    }

    private broadcastGameState(roomCode: string) {
        const room = this.rooms.get(roomCode);
        if (!room || !room.game) return;

        // Find bidder name
        const bidderName = room.game.bidderId ? room.game.players.get(room.game.bidderId)?.name : null;

        // Calculate points for all players to display on table
        const playerPoints = Array.from(room.game.players.values()).map(p => ({
            playerId: p.id,
            points: p.pointsReceived
        }));

        room.players.forEach(playerId => {
            const playerState = room.game!.players.get(playerId);
            this.io.to(playerId).emit('game-state', {
                phase: room.game!.phase,
                hand: playerState?.hand || [],
                myBid: playerState?.bid,
                currentBid: room.game!.currentBid,
                bidderId: room.game!.bidderId,
                bidderName: bidderName,
                trump: room.game!.trumpSuit,
                partners: room.game!.partners, // Array of card IDs
                revealedPartners: Array.from(room.game!.players.values())
                    .filter(p => p.team === 'PARTNER')
                    .map(p => p.id),
                currentTrick: room.game!.currentTrick,
                playerOrder: room.game!.playerOrder,
                trickStarterIndex: room.game!.trickStarterIndex,
                biddingState: {
                    activePlayers: Array.from(room.game!.activeBidders),
                    readyPlayers: Array.from(room.game!.readyPlayers)
                },
                playerPoints: playerPoints, // Broadcast everyone's points
                trickPoints: room.game!.players.get(playerId)?.pointsReceived || 0, // Deprecated/Redundant but kept for safety
                scores: room.game!.phase === 'FINISHED' ? Array.from(room.game!.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    team: p.team,
                    points: p.pointsReceived
                })) : undefined,
            });
        });
    }

    private syncRoomState(socket: Socket, data: { roomCode: string }) {
        const { roomCode } = data;
        const room = this.rooms.get(roomCode);
        if (room) {
            // Send full player objects with names
            const playersList = room.players.map(id => ({ id, name: room.playerNames.get(id) || 'Unknown' }));
            socket.emit('update-players', playersList);

            if (room.game) {
                const playerState = room.game.players.get(socket.id);
                socket.emit('game-state', {
                    phase: room.game.phase,
                    hand: playerState?.hand || [],
                    // ... other state
                });
            }
        }
    }

    public handleDisconnect(socket: Socket) {
        // Find room where player is present and remove them
        for (const [code, room] of this.rooms.entries()) {
            const index = room.players.indexOf(socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                room.playerNames.delete(socket.id);

                // Broadcast new state to room
                const playersList = room.players.map(id => ({ id, name: room.playerNames.get(id) || 'Unknown' }));
                this.io.to(code).emit('update-players', playersList);

                // Cleanup empty room
                if (room.players.length === 0) {
                    this.rooms.delete(code);
                }
                break;
            }
        }
    }

    private createRoom(socket: Socket, data: { gameId: string, playerName?: string }) {
        const roomCode = this.generateRoomCode();

        const playerNames = new Map<string, string>();
        const name = data.playerName || DEV_NAMES[0];
        playerNames.set(socket.id, name);

        this.rooms.set(roomCode, {
            id: roomCode,
            gameId: data.gameId || 'generic',
            players: [socket.id],
            playerNames
        });

        socket.join(roomCode); // Critical: Creator must join the room channel!

        console.log(`Room created: ${roomCode} by ${name} (${socket.id})`);
        console.log(`Total rooms: ${this.rooms.size}`);

        socket.emit('room-created', { roomCode });
        // Also emit initial player list
        socket.emit('update-players', [{ id: socket.id, name }]);
    }

    private joinRoom(socket: Socket, data: { roomCode: string, playerName?: string }) {
        const { roomCode, playerName } = data;
        console.log(`Attempting to join room: ${roomCode} by ${playerName} (${socket.id})`);
        console.log(`Available rooms: ${Array.from(this.rooms.keys()).join(', ')}`);

        const room = this.rooms.get(roomCode);

        if (room) {
            if (!room.players.includes(socket.id)) {
                room.players.push(socket.id);
                // Use provided name or assign next available DEV_NAME
                const usedNames = Array.from(room.playerNames.values());
                const name = playerName || DEV_NAMES.find(n => !usedNames.includes(n)) || `Player ${room.players.length}`;
                room.playerNames.set(socket.id, name);
            }
            socket.join(roomCode);

            console.log(`Player ${playerName} joined room ${roomCode}`);
            socket.emit('room-joined', { roomCode });

            // BROADCAST full list to everyone in room (including sender)
            const playersList = room.players.map(id => ({ id, name: room.playerNames.get(id) || 'Unknown' }));
            this.io.to(roomCode).emit('update-players', playersList);
        } else {
            console.log(`Room ${roomCode} not found!`);
            socket.emit('error', { message: 'Room not found' });
        }
    }

    private generateRoomCode(): string {
        let code = '';
        do {
            code = Math.random().toString(36).substring(2, 6).toUpperCase();
        } while (this.rooms.has(code));
        return code;
    }
}
