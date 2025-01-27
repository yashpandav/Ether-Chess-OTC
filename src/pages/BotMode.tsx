import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from '../components/Chessboard';
import { GameStatus } from '../components/GameStatus';
import { BOT_DIFFICULTY_LEVELS } from '../config/constants';
import { Bot } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

type Difficulty = keyof typeof BOT_DIFFICULTY_LEVELS;

export const BotMode: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState(game.fen());
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'white' | 'black' | 'draw' | null>(null);
  const [thinking, setThinking] = useState(false);
  const setCheckedKing = useGameStore((state) => state.setCheckedKing);
    let checkedKing = useGameStore((state) => state.checkedKing); // Retrieve checkedKing from store

  const isInitialSetupRef = useRef(false);

  const determineGameOutcome = useCallback((currentGame: Chess) => {
    let gameWinner: 'white' | 'black' | 'draw' | null = null;

    if (currentGame.isCheckmate()) {
      gameWinner = currentGame.turn() === 'w' ? 'black' : 'white';
    } else if (currentGame.isDraw()) {
      gameWinner = 'draw';
    }

    setGameOver(true);
    setWinner(gameWinner);
  }, []);

  const makeBotMove = useCallback(() => {
    if (game.isGameOver()) {
      determineGameOutcome(game);
      return;
    }

    if (game.turn() === 'b') {
      setThinking(true);
      const gameCopy = new Chess(game.fen());
      const possibleMoves = gameCopy.moves({ verbose: true });

      if (possibleMoves.length === 0) {
        determineGameOutcome(gameCopy);
        return;
      }

      let selectedMove: Move | undefined;
      switch (difficulty) {
        case 'EASY':
          selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          break;
        case 'MEDIUM':
          selectedMove =
            possibleMoves.find(move => move.captured) ||
            possibleMoves.find(move => move.san.includes('+')) ||
            possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          break;
        case 'HARD':
          selectedMove = possibleMoves.sort((a, b) => {
            const scoreMove = (move: Move) => {
              let score = 0;
              if (move.captured) score += 10;
              if (move.san.includes('+')) score += 5;
              if (['n', 'b'].includes(move.piece)) score += 2;
              if (move.promotion) score += 8;
              return score;
            };
            return scoreMove(b) - scoreMove(a);
          })[0];
          break;
      }

      if (selectedMove) {
        gameCopy.move(selectedMove);
        setGame(gameCopy);
        setPosition(gameCopy.fen());
        setThinking(false);

        if (gameCopy.isGameOver()) {
          determineGameOutcome(gameCopy);
        }
      }
    }
  }, [game, difficulty, determineGameOutcome]);

  const handlePlayerMove = useCallback(
    (move: { from: string; to: string }) => {
      if (gameOver) return;

      try {
        const gameCopy = new Chess(game.fen());
        const moveResult = gameCopy.move({ from: move.from, to: move.to });

        if (moveResult) {
          setGame(gameCopy);
          setPosition(gameCopy.fen());

          if (gameCopy.isGameOver()) {
            determineGameOutcome(gameCopy);
            return;
          }

          setTimeout(makeBotMove, 500);
        }
      } catch (error) {
        console.error('Invalid move:', error);
      }
    },
    [game, makeBotMove, gameOver, determineGameOutcome]
  );
  
  useEffect(() => {
    if (!isInitialSetupRef.current) {
      isInitialSetupRef.current = true;
      if (game.turn() === 'b') {
        makeBotMove();
      }
    }
  }, [makeBotMove, game]);

  useEffect(() => {
    if (game.turn() === 'b' && !gameOver) {
      const moveTimer = setTimeout(makeBotMove, 500);
      return () => clearTimeout(moveTimer);
    }
  }, [game, makeBotMove, gameOver]);
  // Determine if the king is in check
  checkedKing = game.inCheck()
  ? game.turn() === 'w' ? 'white' : 'black'
  : null;
  // Update the UI with the checked king (if any)
  setCheckedKing(checkedKing);
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-indigo-950 px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-8 h-full">
          {[...Array(64)].map((_, i) => (
            <div
              key={i}
              className={`aspect-square ${
                (Math.floor(i / 8) + i % 8) % 2 === 0 ? 'bg-white' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-gray-900/90 to-indigo-900/90 p-8 rounded-xl border border-white/10 shadow-xl relative">
            <h2 className="text-2xl font-bold text-white flex items-center gap-4">
              Bot Mode <Bot className="text-blue-400" size={24} />
            </h2>
            <Chessboard position={position} onMove={handlePlayerMove} disabled={thinking || gameOver} gameState={{checkedKing}}/>
            {gameOver && (
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold">
                  {winner === 'draw'
                    ? 'Game is a Draw!'
                    : winner
                    ? `${winner.charAt(0).toUpperCase() + winner.slice(1)} Wins!`
                    : 'Game Over!'}
                </h3>
              </div>
            )}
          </div>
          <div>
            <GameStatus
              status={gameOver ? 'completed' : 'active'}
              currentPlayer={game.turn() === 'w' ? 'white' : 'black'}
            />
            <div className="mt-4 bg-gradient-to-br from-gray-900/90 to-indigo-900/90 p-4 rounded-xl border border-white/10 shadow-lg">
              <h3 className="font-medium text-white mb-2">Bot Settings</h3>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as Difficulty)}
                className="mt-1 block w-full rounded-md bg-gray-800 text-white shadow-sm"
                disabled={gameOver}
              >
                {Object.keys(BOT_DIFFICULTY_LEVELS).map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
