/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable */
import "server-only";
import initWasm, {
  ConnectFour,
  InitInput,
  type InitOutput,
} from "./wasm-build/connect_four_wasm";
// Import the wasm file directly
// @ts-ignore
import wasmModule from "./wasm-build/connect_four_wasm_bg.wasm?module";

export const config = {
  runtime: "edge",
};
export type GameStateJS = any;

export class ConnectFourWasm {
  private static instance: ConnectFourWasm | null = null;
  private wasmModule: InitOutput | null = null;
  private static game: ConnectFour;

  private constructor() {}

  public static async init(baseUrl: string): Promise<ConnectFourWasm> {
    if (!ConnectFourWasm.instance) {
      ConnectFourWasm.instance = new ConnectFourWasm();
      await ConnectFourWasm.instance.initializeWasm(wasmModule);
    }
    return ConnectFourWasm.instance;
  }

  private async initializeWasm(input: InitInput): Promise<void> {
    if (!this.wasmModule) {
      this.wasmModule = await initWasm(input);
      ConnectFourWasm.game = new ConnectFour();
    }
  }

  public static create_initial_state(): GameStateJS {
    return ConnectFourWasm.game.create_initial_state();
  }

  public static place_piece(
    state_js: GameStateJS,
    column: number,
  ): GameStateJS {
    return ConnectFourWasm.game.place_piece(state_js, column);
  }

  public static get_current_player(state_js: GameStateJS) {
    return ConnectFourWasm.game.get_current_player(state_js);
  }

  public static is_game_over(state_js: GameStateJS): boolean {
    return ConnectFourWasm.game.is_game_over(state_js);
  }

  public static get_winner(state_js: GameStateJS) {
    return ConnectFourWasm.game.get_winner(state_js);
  }

  public static get_computer_move(state_js: GameStateJS, quality: string) {
    return ConnectFourWasm.game.get_computer_move(state_js, quality);
  }
}

export type { ConnectFour as ConnectFourWasmType };
