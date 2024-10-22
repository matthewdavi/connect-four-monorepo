/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { ConnectFourWasm } from "../../wasm";
import Link from "next/link";
import JSONCrush from "jsoncrush";
import { z } from "zod";
import { memoize } from "lodash-es";
import { headers } from "next/headers";
import { cache } from "react";

const CellSchema = z.union([
  z.literal("Empty"),
  z.object({ Filled: z.enum(["Red", "Yellow"]) }),
]);

const GameStateSchema = z.object({
  board: z.array(z.array(CellSchema)),
  current_player: z.enum(["Red", "Yellow"]),
  is_game_over: z.boolean(),
  winner: z.enum(["Red", "Yellow"]).nullable().optional(),
});

const ExtendedGameStateSchema = GameStateSchema.extend({
  newestPieceColumn: z.number().nullable(),
  newestComputerPieceColumn: z.number().nullable(),
  minimaxQuality: z.enum(["bad", "medium", "best"]),
});

async function getEdgeSafeTime() {
  try {
    const time = Date.now();
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/time?time=${time}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    await response.text();

    return time;
  } catch (error) {
    console.error("Error in getEdgeSafeTime:", error);
    return Date.now();
  }
}

function convertWasmStateToTypescriptState(wasmState: ExtendedGameState) {
  return {
    board: wasmState.board.map((column) =>
      column.map((cell) =>
        cell === "Empty" ? null : cell.Filled === "Red" ? "red" : "yellow",
      ),
    ),
    currentPlayer: wasmState.current_player.toLowerCase() as "red" | "yellow",
    isGameOver: wasmState.is_game_over,
    winner: wasmState.winner
      ? (wasmState.winner.toLowerCase() as "red" | "yellow")
      : null,
    newestPieceColumn: wasmState.newestPieceColumn,
    newestComputerPieceColumn: wasmState.newestComputerPieceColumn,
    minimaxQuality: wasmState.minimaxQuality,
  };
}

type ExtendedGameState = z.infer<typeof ExtendedGameStateSchema>;

const getConnectFour = cache(async (baseUrl: string) => {
  await ConnectFourWasm.init(baseUrl);

  return ConnectFourWasm;
});

async function ConnectFourGame(props: {
  searchParams: Promise<{ state?: string }>;
}) {
  const timeStart = await getEdgeSafeTime();

  const searchParams = await props.searchParams;

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const startLoadingWasm = await getEdgeSafeTime();
  const connectFour = await getConnectFour(baseUrl);
  const wasmLoadTime = ((await getEdgeSafeTime()) - startLoadingWasm).toFixed(
    2,
  );

  if (!connectFour) {
    throw new Error("ConnectFourWasm module not initialized");
  }

  const initialState: ExtendedGameState = {
    ...connectFour.create_initial_state(),
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

  let computerMoveTime = 0;
  // Compute the computer's move if it's the computer's turn
  if (!gameState.is_game_over && gameState.current_player === "Yellow") {
    const startComputerMove = await getEdgeSafeTime();
    const computerMove = connectFour.get_computer_move(
      gameState,
      gameState.minimaxQuality,
    );
    computerMoveTime = (await getEdgeSafeTime()) - startComputerMove;

    const computerState = connectFour.place_piece(gameState, computerMove);
    gameState = {
      ...computerState,
      newestPieceColumn: gameState.newestPieceColumn,
      minimaxQuality: gameState.minimaxQuality,
      newestComputerPieceColumn: computerMove,
    };
  }

  const {
    board,
    current_player,
    is_game_over,
    winner,
    newestPieceColumn,
    newestComputerPieceColumn,
  } = gameState;

  const getNextState = memoize((column: number): ExtendedGameState => {
    if (is_game_over) return gameState;

    // Player's move (red)
    const playerState = connectFour.place_piece(gameState, column);
    const playerExtendedState: ExtendedGameState = {
      ...playerState,
      minimaxQuality: gameState.minimaxQuality,
      newestPieceColumn: column,
      newestComputerPieceColumn: null, // Reset the computer's newest piece
    };

    return playerExtendedState;
  });

  function renderCell(
    cell: z.infer<typeof CellSchema>,
    rowIndex: number,
    colIndex: number,
  ) {
    const cellColor =
      cell === "Empty"
        ? "bg-white"
        : cell.Filled === "Red"
          ? "bg-red-500"
          : "bg-yellow-500";

    let animationClass = "";
    if (newestPieceColumn != null) {
      const pieceRow = board[newestPieceColumn]?.findIndex(
        (cell) => cell !== "Empty",
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
        (cell) => cell !== "Empty",
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

    if (cell === "Empty" && !is_game_over) {
      const nextState = getNextState(colIndex);
      const compressedState = JSONCrush.crush(JSON.stringify(nextState));
      return (
        <Link href={`/connect-four-wasm?state=${compressedState}`}>
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
        href={`/connect-four-wasm?state=${compressedState}`}
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
    const tsState = convertWasmStateToTypescriptState(gameState);
    const compressedTsState = JSONCrush.crush(JSON.stringify(tsState));
    const compressedWasmState = JSONCrush.crush(JSON.stringify(gameState));

    return (
      <div className="mt-4 flex items-center">
        <span className="mr-2">Engine:</span>
        <Link
          href={`/connect-four?state=${compressedTsState}`}
          className="mx-1 rounded bg-white px-3 py-1 text-sm font-medium text-blue-500 hover:bg-blue-100"
        >
          TypeScript
        </Link>
        <Link
          href={`/connect-four-wasm?state=${compressedWasmState}`}
          className="mx-1 rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white"
        >
          WASM
        </Link>
      </div>
    );
  }

  const endTime = await getEdgeSafeTime();
  const totalTime = endTime - timeStart;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="mb-8 text-4xl font-bold">Connect Four (WASM)</h1>
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
      {is_game_over && (
        <div className="mt-4 text-xl font-semibold">
          {winner ? `${winner.toUpperCase()} wins!` : "It's a draw!"}
        </div>
      )}
      {!is_game_over && (
        <div className="mt-4 text-xl font-semibold">
          Current player: {current_player.toUpperCase()}
        </div>
      )}
      <small>Page constructed in {totalTime.toFixed(0)}ms</small>
      <small>Computer move calculated in {computerMoveTime.toFixed(0)}ms</small>
      <small>Wasm load time: {wasmLoadTime}ms</small>
      <div className="mt-4">
        <span className="mr-2">CPU Quality:</span>
        {renderQualityLink("bad")}
        {renderQualityLink("medium")}
        {renderQualityLink("best")}
      </div>
      {renderEngineToggle()}
      <Link
        href="/connect-four-wasm"
        className="mt-8 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        New Game
      </Link>
    </div>
  );
}

export { ConnectFourGame as default };

export const runtime = "edge";
