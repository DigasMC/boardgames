'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Game {
  _id: string;
  name: string;
  description: string;
  min_players: number;
  max_players: number;
  avg_duration: number;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [filters, setFilters] = useState({
    players: '',
    maxDuration: '',
  });
  const [loading, setLoading] = useState(true);
  const [randomGame, setRandomGame] = useState<Game | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.players) queryParams.append('players', filters.players);
      if (filters.maxDuration) queryParams.append('maxDuration', filters.maxDuration);

      const response = await fetch(`/api/games?${queryParams.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setGames(Array.isArray(data) ? data : []);
      } else {
        console.error('Error fetching games:', data.error);
        setGames([]);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const getRandomGame = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.players) queryParams.append('players', filters.players);
      if (filters.maxDuration) queryParams.append('maxDuration', filters.maxDuration);

      const response = await fetch(`/api/games/random?${queryParams.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setRandomGame(data);
      } else {
        console.error('Error fetching random game:', data.error);
        setRandomGame(null);
      }
    } catch (error) {
      console.error('Error fetching random game:', error);
      setRandomGame(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          Seletor de Jogos de Tabuleiro
        </h1>
        
        {/* Filters */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-purple-400">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Número de Jogadores</label>
              <input
                type="number"
                value={filters.players}
                onChange={(e) => setFilters({ ...filters, players: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Número de jogadores"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duração Máxima (minutos)</label>
              <input
                type="number"
                value={filters.maxDuration}
                onChange={(e) => setFilters({ ...filters, maxDuration: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Duração máxima"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Random Game Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-purple-400">Jogo Aleatório</h2>
            <button
              onClick={getRandomGame}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Obter Jogo Aleatório
            </button>
          </div>
          {randomGame && (
            <div className="bg-gray-700 p-6 rounded-lg border border-gray-600">
              <h3 className="text-xl font-medium text-white mb-2">{randomGame.name}</h3>
              <p className="text-gray-300 mb-4">{randomGame.description}</p>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 bg-gray-600 px-3 py-1 rounded-full text-gray-200">
                  <UserGroupIcon className="h-4 w-4" />
                  {randomGame.min_players === randomGame.max_players 
                    ? `${randomGame.min_players} Jogadores`
                    : `${randomGame.min_players}-${randomGame.max_players} Jogadores`}
                </span>
                <span className="flex items-center gap-1 bg-gray-600 px-3 py-1 rounded-full text-gray-200">
                  <ClockIcon className="h-4 w-4" />
                  {randomGame.avg_duration}m
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Games List */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-6 text-purple-400">Jogos Disponíveis</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">A carregar jogos...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <div 
                  key={game._id} 
                  className="bg-gray-700 rounded-lg p-6 border border-gray-600 hover:border-purple-500 transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/10"
                >
                  <h3 className="text-xl font-medium text-white mb-3">{game.name}</h3>
                  <p className="text-gray-300 text-sm mb-4">{game.description}</p>
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1 bg-gray-600 px-3 py-1 rounded-full text-gray-200">
                      <UserGroupIcon className="h-4 w-4" />
                      {game.min_players === game.max_players 
                        ? `${game.min_players} Jogadores`
                        : `${game.min_players}-${game.max_players} Jogadores`}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-600 px-3 py-1 rounded-full text-gray-200">
                      <ClockIcon className="h-4 w-4" />
                      {game.avg_duration}m
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
