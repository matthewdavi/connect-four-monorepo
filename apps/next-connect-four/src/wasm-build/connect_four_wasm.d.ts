/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable */
export class ConnectFour {
  free(): void;
  /**
   * Constructor for the ConnectFour struct.
   */
  constructor();
  /**
   * Creates the initial game state and returns it as a JsValue.
   * @returns {any}
   */
  create_initial_state(): any;
  /**
   * Places a piece on the board and returns the new game state.
   * @param {any} state_js
   * @param {number} coordinate
   * @returns {any}
   */
  place_piece(state_js: any, coordinate: number): any;
  /**
   * Determines the computer's move based on the quality and returns the column index.
   * @param {any} state_js
   * @param {string} quality_str
   * @returns {number}
   */
  get_computer_move(state_js: any, quality_str: string): number;
  /**
   * Checks if the game is over.
   * @param {any} state_js
   * @returns {boolean}
   */
  is_game_over(state_js: any): boolean;
  /**
   * Returns the winner as a string ("red" or "yellow"), or null if there's no winner.
   * @param {any} state_js
   * @returns {string | undefined}
   */
  get_winner(state_js: any): string | undefined;
  /**
   * Returns the current player's color as a string ("red" or "yellow").
   * @param {any} state_js
   * @returns {string}
   */
  get_current_player(state_js: any): string;
}

export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_connectfour_free: (a: number, b: number) => void;
  readonly connectfour_new: () => number;
  readonly connectfour_create_initial_state: (a: number) => Array;
  readonly connectfour_place_piece: (a: number, b: number, c: number) => Array;
  readonly connectfour_get_computer_move: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => Array;
  readonly connectfour_is_game_over: (a: number, b: number) => Array;
  readonly connectfour_get_winner: (a: number, b: number) => Array;
  readonly connectfour_get_current_player: (a: number, b: number) => Array;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
  module: { module: SyncInitInput } | SyncInitInput,
): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>;
