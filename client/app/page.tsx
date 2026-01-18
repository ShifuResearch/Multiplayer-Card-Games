import Link from "next/link";

const GAMES = [
  {
    id: "kaali-tilli",
    name: "Kaali-Tilli",
    description: "The classic 5-7 player trick-taking game.",
    status: "Available",
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "poker",
    name: "Texas Hold'em",
    description: "Classic poker with chips and betting.",
    status: "Coming Soon",
    color: "from-red-500 to-pink-500",
  },
  {
    id: "blackjack",
    name: "Blackjack",
    description: "Beat the dealer to 21.",
    status: "Coming Soon",
    color: "from-blue-400 to-indigo-500",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-6xl font-bold mb-4 tracking-tighter">
        <span className="text-gradient">Card</span>Arcade
      </h1>
      <p className="text-xl text-gray-300 mb-12 max-w-lg mx-auto">
        The ultimate multiplayer card platform. Create a room, invite friends, and play.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {GAMES.map((game) => (
          <Link
            href={game.status === "Available" ? `/game/${game.id}` : "#"}
            key={game.id}
            className={`group relative overflow-hidden rounded-2xl glass-panel p-8 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 ${game.status !== "Available" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
          >
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${game.color}`} />
            <h2 className="text-3xl font-bold mb-2">{game.name}</h2>
            <p className="text-sm text-gray-400 mb-6">{game.description}</p>

            <div className="mt-4">
              <span
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${game.status === "Available"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-gray-700/50 text-gray-500"
                  }`}
              >
                {game.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
