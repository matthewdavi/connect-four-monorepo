import { z } from "zod";
import stateCacheData from "./stateCache.json";

const ColorSchema = z.enum(["red", "yellow"]);
export type Color = z.infer<typeof ColorSchema>;

const CellSchema = ColorSchema.nullable();
export type Cell = z.infer<typeof CellSchema>;

const BoardSchema = z.array(z.array(CellSchema));
export type Board = z.infer<typeof BoardSchema>;

const CoordinateSchema = z.number().int().min(0).max(6);
type Coordinate = z.infer<typeof CoordinateSchema>;

export const QualitySchema = z.enum(["bad", "medium", "best"]);
export type Quality = z.infer<typeof QualitySchema>;

export const GameStateSchema = z.object({
  board: BoardSchema,
  currentPlayer: ColorSchema,
  winner: ColorSchema.nullable(),
  isGameOver: z.boolean(),
});

export type GameState = z.infer<typeof GameStateSchema>;

export class ConnectFour {
  static readonly NUM_COLUMNS = 7;
  static readonly NUM_ROWS = 6;
  static readonly WINNING_LENGTH = 4;
  static readonly MAX_DEPTH = 4;
  static stateCache: Record<string, number> = {};

  /**
   * Creates an empty game board.
   */
  static createBoard(): Board {
    const board = Array.from({ length: ConnectFour.NUM_COLUMNS }, () =>
      Array.from({ length: ConnectFour.NUM_ROWS }, () => null)
    );
    return BoardSchema.parse(board);
  }

  /**
   * Creates an initial game state.
   */
  static createInitialState(): GameState {
    return GameStateSchema.parse({
      board: ConnectFour.createBoard(),
      currentPlayer: "red",
      winner: null,
      isGameOver: false,
    });
  }

  /**
   * Places a piece on the board at the given column for the specified color.
   * Returns a new game state with the piece placed.
   */
  static placePiece(state: GameState, coordinate: Coordinate): GameState {
    CoordinateSchema.parse(coordinate);
    const newBoard = state.board.map((column) => [...column]);

    for (let row = ConnectFour.NUM_ROWS - 1; row >= 0; row--) {
      if (newBoard[coordinate]![row] === null) {
        newBoard[coordinate]![row] = state.currentPlayer;
        const winner = ConnectFour.checkWinner(newBoard, state.currentPlayer)
          ? state.currentPlayer
          : null;
        const isGameOver = !!winner || ConnectFour.isBoardFull(newBoard);

        return GameStateSchema.parse({
          board: newBoard,
          currentPlayer: state.currentPlayer === "red" ? "yellow" : "red",
          winner,
          isGameOver,
        });
      }
    }

    // If the column is full, return the state unchanged
    return state;
  }

  /**
   * Checks if there's a winner on the board for a specific player.
   */
  static checkWinner(board: Board, player: Color): boolean {
    BoardSchema.parse(board);
    const directions = [
      { dc: 1, dr: 0 }, // Horizontal
      { dc: 0, dr: 1 }, // Vertical
      { dc: 1, dr: 1 }, // Diagonal down-right
      { dc: 1, dr: -1 }, // Diagonal up-right
    ];

    for (let c = 0; c < ConnectFour.NUM_COLUMNS; c++) {
      for (let r = 0; r < ConnectFour.NUM_ROWS; r++) {
        if (board[c]?.[r] !== player) continue;

        for (const { dc, dr } of directions) {
          let count = 1;
          let cc = c + dc;
          let rr = r + dr;
          while (
            cc >= 0 &&
            cc < ConnectFour.NUM_COLUMNS &&
            rr >= 0 &&
            rr < ConnectFour.NUM_ROWS &&
            board[cc]?.[rr] === player
          ) {
            count++;
            if (count === ConnectFour.WINNING_LENGTH) {
              return true;
            }
            cc += dc;
            rr += dr;
          }
        }
      }
    }
    return false;
  }

  /**
   * Gets the computer's move based on the specified quality.
   */
  static getComputerMove(state: GameState, quality: Quality): Coordinate {
    QualitySchema.parse(quality);
    const validColumns = ConnectFour.getValidColumns(state.board);

    if (quality === "bad") {
      return ConnectFour.getRandomColumn(validColumns);
    }

    if (quality === "medium") {
      // Try to win in the next move
      for (const col of validColumns) {
        const tempState = ConnectFour.placePiece(state, col);
        if (tempState.winner === state.currentPlayer) {
          return col;
        }
      }

      // Block opponent's winning move
      const opponentColor = state.currentPlayer === "red" ? "yellow" : "red";
      for (const col of validColumns) {
        const tempState = ConnectFour.placePiece(
          { ...state, currentPlayer: opponentColor },
          col
        );
        if (tempState.winner === opponentColor) {
          return col; // Block this move
        }
      }

      // Else, pick a random column
      return ConnectFour.getRandomColumn(validColumns);
    }

    if (quality === "best") {
      const serializedState = ConnectFour.serializeState(state);
      const cachedMove = ConnectFour.stateCache[serializedState];

      if (cachedMove !== undefined && validColumns.includes(cachedMove)) {
        return cachedMove;
      }

      // If not in cache or invalid, compute the best move
      return ConnectFour.getBestMove(state);
    }

    // Default to a random move if quality is unrecognized
    return ConnectFour.getRandomColumn(validColumns);
  }

  /**
   * Helper method to get a list of valid columns where a piece can be placed.
   * @param board - The current game board.
   */
  private static getValidColumns(board: Board): Coordinate[] {
    const validColumns: Coordinate[] = [];
    for (let c = 0; c < ConnectFour.NUM_COLUMNS; c++) {
      if (board[c]?.[0] === null) {
        validColumns.push(c);
      }
    }
    return validColumns;
  }

  /**
   * Helper method to get a random column from the list of valid columns.
   * @param validColumns - An array of valid column indices.
   */
  private static getRandomColumn(validColumns: Coordinate[]): Coordinate {
    if (validColumns.length === 0) {
      throw new Error("No valid columns available");
    }
    return validColumns[Math.floor(Math.random() * validColumns.length)]!;
  }

  /**
   * Uses the minimax algorithm with alpha-beta pruning to determine the best move for the computer.
   * @param state - The current game state.
   */
  private static getBestMove(state: GameState): Coordinate {
    const opponentColor = state.currentPlayer === "red" ? "yellow" : "red";
    const validColumns = ConnectFour.getValidColumns(state.board);

    let bestScore = -Infinity;
    let bestColumn = validColumns[0];

    // Implement move ordering: prioritize center column and adjacent columns
    const center = Math.floor(ConnectFour.NUM_COLUMNS / 2);
    const orderedColumns = validColumns.sort(
      (a, b) => Math.abs(center - a) - Math.abs(center - b)
    );

    for (const col of orderedColumns) {
      const newState = ConnectFour.placePiece(state, col);
      const score = ConnectFour.minimax(
        newState,
        5, // Adjust depth as needed for performance
        -Infinity,
        Infinity,
        false,
        state.currentPlayer,
        opponentColor
      );
      if (score > bestScore) {
        bestScore = score;
        bestColumn = col;
      }
    }

    return bestColumn!;
  }

  /**
   * Minimax algorithm with alpha-beta pruning and depth limiting.
   * @param state - The current game state.
   * @param depth - The depth limit for recursion.
   * @param alpha - The alpha value for pruning.
   * @param beta - The beta value for pruning.
   * @param isMaximizing - True if maximizing player, false otherwise.
   * @param playerColor - The computer's color.
   * @param opponentColor - The opponent's color.
   */
  private static minimax(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    playerColor: Color,
    opponentColor: Color
  ): number {
    if (depth === 0 || state.isGameOver) {
      return ConnectFour.evaluateBoard(state.board, playerColor, opponentColor);
    }

    const validColumns = ConnectFour.getValidColumns(state.board);

    // Implement move ordering: prioritize center column and adjacent columns
    const center = Math.floor(ConnectFour.NUM_COLUMNS / 2);
    const orderedColumns = validColumns.sort(
      (a, b) => Math.abs(center - a) - Math.abs(center - b)
    );

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of orderedColumns) {
        const newState = ConnectFour.placePiece(state, col);
        const evaluation = ConnectFour.minimax(
          newState,
          depth - 1,
          alpha,
          beta,
          false,
          playerColor,
          opponentColor
        );
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          break; // Beta cut-off
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of orderedColumns) {
        const newState = ConnectFour.placePiece(state, col);
        const evaluation = ConnectFour.minimax(
          newState,
          depth - 1,
          alpha,
          beta,
          true,
          playerColor,
          opponentColor
        );
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          break; // Alpha cut-off
        }
      }
      return minEval;
    }
  }

  /**
   * Evaluates the board and returns a score.
   * @param board - The current game board.
   * @param playerColor - The computer's color.
   * @param opponentColor - The opponent's color.
   */
  private static evaluateBoard(
    board: Board,
    playerColor: Color,
    opponentColor: Color
  ): number {
    let score = 0;

    // Score center column
    const centerArray = board.at(Math.floor(ConnectFour.NUM_COLUMNS / 2))!;
    const centerCount = centerArray.filter(
      (cell) => cell === playerColor
    ).length;
    score += centerCount * 6; // Increase weight of center control

    // Score horizontal
    score += ConnectFour.scoreDirection(
      board,
      playerColor,
      opponentColor,
      1,
      0
    );
    // Score vertical
    score += ConnectFour.scoreDirection(
      board,
      playerColor,
      opponentColor,
      0,
      1
    );
    // Score diagonal /
    score += ConnectFour.scoreDirection(
      board,
      playerColor,
      opponentColor,
      1,
      1
    );
    // Score diagonal \
    score += ConnectFour.scoreDirection(
      board,
      playerColor,
      opponentColor,
      1,
      -1
    );

    return score;
  }

  /**
   * Scores the board in a specific direction.
   */
  private static scoreDirection(
    board: Board,
    playerColor: Color,
    opponentColor: Color,
    dc: number,
    dr: number
  ): number {
    let score = 0;

    for (let c = 0; c < ConnectFour.NUM_COLUMNS; c++) {
      for (let r = 0; r < ConnectFour.NUM_ROWS; r++) {
        const windowCells = [];
        for (let i = 0; i < ConnectFour.WINNING_LENGTH; i++) {
          const cc = c + i * dc;
          const rr = r + i * dr;
          if (
            cc >= 0 &&
            cc < ConnectFour.NUM_COLUMNS &&
            rr >= 0 &&
            rr < ConnectFour.NUM_ROWS
          ) {
            windowCells.push(board[cc]?.[rr]);
          }
        }
        if (windowCells.length === ConnectFour.WINNING_LENGTH) {
          score += ConnectFour.evaluateWindow(
            windowCells as (Color | null)[],
            playerColor,
            opponentColor
          );
        }
      }
    }

    return score;
  }

  /**
   * Evaluates a window of four cells and returns a score.
   */
  private static evaluateWindow(
    windowCells: Cell[],
    playerColor: Color,
    opponentColor: Color
  ): number {
    let score = 0;
    const playerCount = windowCells.filter(
      (cell) => cell === playerColor
    ).length;
    const opponentCount = windowCells.filter(
      (cell) => cell === opponentColor
    ).length;
    const emptyCount = windowCells.filter((cell) => cell === null).length;

    if (playerCount === 4) {
      score += 100000; // Winning move
    } else if (playerCount === 3 && emptyCount === 1) {
      score += 100; // Three in a row with an open spot
    } else if (playerCount === 2 && emptyCount === 2) {
      score += 10; // Two in a row with two open spots
    }

    if (opponentCount === 4) {
      score -= 100000; // Opponent's winning move
    } else if (opponentCount === 3 && emptyCount === 1) {
      score -= 1000; // Block opponent's three in a row
    } else if (opponentCount === 2 && emptyCount === 2) {
      score -= 10; // Block opponent's two in a row
    }

    return score;
  }

  static isBoardFull(board: Board): boolean {
    BoardSchema.parse(board);
    return board.every((column) => column.every((cell) => cell !== null));
  }

  /**
   * Precomputes game states and their corresponding best moves.
   */
  //   static async precomputeStates(): Promise<void> {
  //     const initialState = ConnectFour.createInitialState();
  //     const queue: { state: GameState; depth: number }[] = [
  //       { state: initialState, depth: 0 },
  //     ];
  //     const visitedStates = new Set<string>();

  //     while (queue.length > 0) {
  //       const { state, depth } = queue.shift()!;

  //       const serializedState = ConnectFour.serializeState(state);
  //       if (visitedStates.has(serializedState)) continue;
  //       visitedStates.add(serializedState);

  //       // Only compute the AI's move if it's the AI's turn
  //       if (state.currentPlayer === "yellow" && !state.isGameOver) {
  //         const aiMove = ConnectFour.getBestMove(state);
  //         ConnectFour.stateCache[serializedState] = aiMove;
  //       }

  //       // If we haven't reached the maximum depth, add child states to the queue
  //       if (depth < ConnectFour.MAX_DEPTH && !state.isGameOver) {
  //         const validColumns = ConnectFour.getValidColumns(state.board);
  //         for (const col of validColumns) {
  //           const nextState = ConnectFour.placePiece(state, col);
  //           queue.push({ state: nextState, depth: depth + 1 });
  //         }
  //       }
  //     }

  //     // Write the cache to a JSON file using dynamic imports
  //     try {
  //       const [fs, path] = await Promise.all([
  //         import("fs/promises"),
  //         import("path"),
  //       ]);

  //       const cacheFilePath = path.join(
  //         process.cwd(),
  //         "src",
  //         "app",
  //         "connect-four",
  //         "stateCache.json",
  //       );
  //       await fs.writeFile(cacheFilePath, JSON.stringify(ConnectFour.stateCache));
  //       console.log(
  //         `Precomputed ${Object.keys(ConnectFour.stateCache).length} game states.`,
  //       );
  //     } catch (error) {
  //       console.error("Error writing cache file:", error);
  //     }
  //   }

  /**
   * Serializes a game state into a unique string representation.
   */
  private static serializeState(state: GameState): string {
    return state.board
      .map((col) => col.map((cell) => cell ?? "0").join(""))
      .join("|");
  }

  /**
   * Gets the best move for the current state, using the precomputed cache if available.
   */
  static getBestCachedMove(state: GameState): Coordinate {
    // const serializedState = ConnectFour.serializeState(state);
    // const cachedMove = ConnectFour.stateCache[serializedState];

    // if (cachedMove !== undefined) {
    //   return cachedMove;
    // }

    // If not in cache, compute the best move
    return ConnectFour.getBestMove(state);
  }
}
