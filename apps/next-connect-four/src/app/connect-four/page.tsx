import {
  ConnectFour,
  type GameState,
  type Color,
  GameStateSchema,
  QualitySchema,
} from "@connect-four/utils/src/ConnectFour";
import Link from "next/link";
import JSONCrush from "jsoncrush";
import { z } from "zod";
import { memoize } from "lodash-es";

const ExtendedGameStateSchema = GameStateSchema.extend({
  newestPieceColumn: z.number().nullable(),
  newestComputerPieceColumn: z.number().nullable(),
  minimaxQuality: QualitySchema,
});

type ExtendedGameState = z.infer<typeof ExtendedGameStateSchema>;

function convertTsToWasmGameState(tsState: ExtendedGameState) {
  return {
    board: tsState.board.map((column) =>
      column.map((cell) =>
        cell === null
          ? "Empty"
          : {
              Filled: (cell.charAt(0).toUpperCase() + cell.slice(1)) as
                | "Red"
                | "Yellow",
            },
      ),
    ),
    current_player: (tsState.currentPlayer.charAt(0).toUpperCase() +
      tsState.currentPlayer.slice(1)) as "Red" | "Yellow",
    is_game_over: tsState.isGameOver,
    winner: tsState.winner
      ? ((tsState.winner.charAt(0).toUpperCase() + tsState.winner.slice(1)) as
          | "Red"
          | "Yellow")
      : null,
    newestPieceColumn: tsState.newestPieceColumn,
    newestComputerPieceColumn: tsState.newestComputerPieceColumn,
    minimaxQuality: tsState.minimaxQuality,
  };
}

export default async function ConnectFourGame(props: {
  searchParams: Promise<{ state?: string }>;
}) {
  const timeStart = Date.now();
  const searchParams = await props.searchParams;
  const initialState: ExtendedGameState = {
    ...ConnectFour.createInitialState(),
    newestPieceColumn: null,
    newestComputerPieceColumn: null,
    minimaxQuality: "best",
  };

  let gameState: ExtendedGameState;

  try {
    if (searchParams.state) {
      const parsedState = JSON.parse(
        JSONCrush.uncrush(searchParams.state),
      ) as unknown;
      gameState = ExtendedGameStateSchema.parse(parsedState);
    } else {
      gameState = initialState;
    }
  } catch (error) {
    console.error("Invalid game state:", error);
    gameState = initialState;
  }

  // Compute the computer's move if it's the computer's turn
  let computerMoveTime = 0;
  if (!gameState.isGameOver && gameState.currentPlayer === "yellow") {
    const computerMoveStart = Date.now();
    const computerMove = ConnectFour.getComputerMove(
      gameState,
      gameState.minimaxQuality,
    );
    computerMoveTime = Date.now() - computerMoveStart;
    const computerState: GameState = ConnectFour.placePiece(
      gameState,
      computerMove,
    );
    gameState = {
      ...computerState,
      newestPieceColumn: gameState.newestPieceColumn,
      minimaxQuality: gameState.minimaxQuality,
      newestComputerPieceColumn: computerMove,
    };
  }

  const {
    board,
    currentPlayer,
    isGameOver,
    winner,
    newestPieceColumn,
    newestComputerPieceColumn,
  } = gameState;

  const getNextState = memoize((column: number): ExtendedGameState => {
    if (isGameOver) return gameState;

    // Player's move (red)
    const playerState: GameState = ConnectFour.placePiece(gameState, column);
    const playerExtendedState: ExtendedGameState = {
      ...playerState,
      minimaxQuality: gameState.minimaxQuality,
      newestPieceColumn: column,
      newestComputerPieceColumn: null, // Reset the computer's newest piece
    };

    return playerExtendedState;
  });

  function renderCell(cell: Color | null, rowIndex: number, colIndex: number) {
    const cellColor =
      cell === "red"
        ? "bg-red-500"
        : cell === "yellow"
          ? "bg-yellow-500"
          : "bg-white";

    let animationClass = "";
    if (newestPieceColumn != null) {
      const pieceRow = board[newestPieceColumn]?.findIndex(
        (cell) => cell !== null,
      );
      if (pieceRow != null) {
        const isNewColumn = colIndex === newestPieceColumn;
        const isNewPiece = isNewColumn && rowIndex === 5 - pieceRow;
        if (isNewPiece) {
          animationClass = "animate-slide-down";
        }
      }
    }

    if (newestComputerPieceColumn != null) {
      const computerPieceRow = board[newestComputerPieceColumn]?.findIndex(
        (cell) => cell !== null,
      );
      if (computerPieceRow != null) {
        const isNewComputerColumn = colIndex === newestComputerPieceColumn;
        const isNewComputerPiece =
          isNewComputerColumn && rowIndex === 5 - computerPieceRow;
        if (isNewComputerPiece) {
          animationClass = "animate-computer-slide-down";
        }
      }
    }

    const cellContent = (
      <div
        className={`absolute inset-0 rounded-full border-2 border-gray-300 ${cellColor} ${animationClass}`}
      ></div>
    );

    if (cell === null && !isGameOver) {
      const nextState = getNextState(colIndex);
      const compressedState = JSONCrush.crush(JSON.stringify(nextState));
      return (
        <Link href={`/connect-four?state=${compressedState}`}>
          <div className="relative h-12 w-12 cursor-pointer rounded-full">
            <div className="absolute inset-0 rounded-full bg-white"></div>
            {cellContent}
          </div>
        </Link>
      );
    }

    return (
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-white"></div>
        {cellContent}
      </div>
    );
  }

  function renderQualityLink(quality: "bad" | "medium" | "best") {
    const newState: ExtendedGameState = {
      ...gameState,
      minimaxQuality: quality,
    };
    const compressedState = JSONCrush.crush(JSON.stringify(newState));
    const isActive = gameState.minimaxQuality === quality;

    return (
      <Link
        href={`/connect-four?state=${compressedState}`}
        className={`mx-1 rounded px-3 py-1 text-sm font-medium ${
          isActive
            ? "bg-blue-500 text-white"
            : "bg-white text-blue-500 hover:bg-blue-100"
        }`}
      >
        {quality.charAt(0).toUpperCase() + quality.slice(1)}
      </Link>
    );
  }

  function renderEngineToggle() {
    const wasmState = convertTsToWasmGameState(gameState);
    const compressedTsState = JSONCrush.crush(JSON.stringify(gameState));
    const compressedWasmState = JSONCrush.crush(JSON.stringify(wasmState));

    return (
      <div className="mt-4 flex items-center">
        <span className="mr-2">Engine:</span>
        <Link
          href={`/connect-four?state=${compressedTsState}`}
          className="mx-1 rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white"
        >
          TypeScript
        </Link>
        <Link
          href={`/connect-four-wasm?state=${compressedWasmState}`}
          className="mx-1 rounded bg-white px-3 py-1 text-sm font-medium text-blue-500 hover:bg-blue-100"
        >
          WASM
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-8 text-4xl font-bold">Connect Four</h1>
      <div className="rounded-lg bg-blue-500 p-4">
        <div className="grid grid-cols-7 gap-1">
          {board.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col hover:opacity-50">
              {column.map((cell, rowIndex) => (
                <div key={`${colIndex}-${rowIndex}`}>
                  {renderCell(cell, 5 - rowIndex, colIndex)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {isGameOver && (
        <div className="mt-4 text-xl font-semibold">
          {winner ? `${winner.toUpperCase()} wins!` : "It's a draw!"}
        </div>
      )}
      {!isGameOver && (
        <div className="mt-4 text-xl font-semibold">
          Current player: {currentPlayer.toUpperCase()}
        </div>
      )}
      <small>Page constructed in {Date.now() - timeStart}ms</small>
      <small>Computer move calculated in {computerMoveTime}ms</small>
      <div className="mt-4">
        <span className="mr-2">CPU Quality:</span>
        {renderQualityLink("bad")}
        {renderQualityLink("medium")}
        {renderQualityLink("best")}
      </div>
      {renderEngineToggle()}
      <Link
        href="/connect-four"
        className="mt-8 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        New Game
      </Link>
    </div>
  );
}

export const runtime = "edge";
