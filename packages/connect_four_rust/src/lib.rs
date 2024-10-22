// src/lib.rs

use js_sys::Math;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Define the Color enum
#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Color {
    Red,
    Yellow,
}

// Define the Cell type
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Cell {
    Empty,
    Filled(Color),
}

// Define the GameState struct
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameState {
    pub board: Vec<Vec<Cell>>,
    pub current_player: Color,
    pub winner: Option<Color>,
    pub is_game_over: bool,
}

// Define the Quality enum
#[wasm_bindgen]
pub enum Quality {
    Bad,
    Medium,
    Best,
}

// Implement the ConnectFour struct and methods
#[wasm_bindgen]
pub struct ConnectFour {
    num_columns: usize,
    num_rows: usize,
    winning_length: usize,
}

#[wasm_bindgen]
impl ConnectFour {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ConnectFour {
        ConnectFour {
            num_columns: 7,
            num_rows: 6,
            winning_length: 4,
        }
    }

    #[wasm_bindgen]
    pub fn create_initial_state(&self) -> JsValue {
        let board = vec![vec![Cell::Empty; self.num_rows]; self.num_columns];
        let state = GameState {
            board,
            current_player: Color::Red,
            winner: None,
            is_game_over: false,
        };
        JsValue::from_serde(&state).unwrap()
    }

    #[wasm_bindgen]
    pub fn place_piece(&self, state_js: &JsValue, coordinate: usize) -> JsValue {
        let mut state: GameState = state_js.into_serde().unwrap();
        if coordinate >= self.num_columns || state.is_game_over {
            return state_js.clone();
        }

        for row in (0..self.num_rows).rev() {
            if let Cell::Empty = state.board[coordinate][row] {
                state.board[coordinate][row] = Cell::Filled(state.current_player);
                if self.check_winner(&state.board, state.current_player) {
                    state.winner = Some(state.current_player);
                    state.is_game_over = true;
                } else if self.is_board_full(&state.board) {
                    state.is_game_over = true;
                } else {
                    state.current_player = match state.current_player {
                        Color::Red => Color::Yellow,
                        Color::Yellow => Color::Red,
                    };
                }
                return JsValue::from_serde(&state).unwrap();
            }
        }
        // Column is full; return state unchanged
        state_js.clone()
    }

    #[wasm_bindgen]
    pub fn get_computer_move(&self, state_js: &JsValue, quality_str: &str) -> usize {
        let state: GameState = state_js.into_serde().unwrap();
        let quality = match quality_str {
            "bad" => Quality::Bad,
            "medium" => Quality::Medium,
            "best" => Quality::Best,
            _ => Quality::Best,
        };

        match quality {
            Quality::Bad => {
                let valid_columns = self.get_valid_columns(&state.board);
                self.get_random_column(&valid_columns)
            }
            Quality::Medium => {
                let valid_columns = self.get_valid_columns(&state.board);
                // Try to win
                for &col in &valid_columns {
                    let temp_state_js =
                        self.place_piece(&JsValue::from_serde(&state).unwrap(), col);
                    let temp_state: GameState = temp_state_js.into_serde().unwrap();
                    if temp_state.winner == Some(state.current_player) {
                        return col;
                    }
                }
                // Block opponent
                let opponent = match state.current_player {
                    Color::Red => Color::Yellow,
                    Color::Yellow => Color::Red,
                };
                for &col in &valid_columns {
                    let mut temp_state = state.clone();
                    temp_state.current_player = opponent;
                    let temp_state_js =
                        self.place_piece(&JsValue::from_serde(&temp_state).unwrap(), col);
                    let temp_state: GameState = temp_state_js.into_serde().unwrap();
                    if temp_state.winner == Some(opponent) {
                        return col;
                    }
                }
                // Random move
                self.get_random_column(&valid_columns)
            }
            Quality::Best => self.get_best_move(&state),
        }
    }

    // Additional methods (private)

    fn check_winner(&self, board: &Vec<Vec<Cell>>, player: Color) -> bool {
        let directions = vec![
            (1, 0),  // Horizontal
            (0, 1),  // Vertical
            (1, 1),  // Diagonal down-right
            (1, -1), // Diagonal up-right
        ];

        for c in 0..self.num_columns {
            for r in 0..self.num_rows {
                if board[c][r] != Cell::Filled(player) {
                    continue;
                }
                for &(dc, dr) in &directions {
                    let mut count = 1;
                    let mut cc = c as isize + dc;
                    let mut rr = r as isize + dr;
                    while cc >= 0
                        && cc < self.num_columns as isize
                        && rr >= 0
                        && rr < self.num_rows as isize
                        && board[cc as usize][rr as usize] == Cell::Filled(player)
                    {
                        count += 1;
                        if count == self.winning_length {
                            return true;
                        }
                        cc += dc;
                        rr += dr;
                    }
                }
            }
        }
        false
    }

    fn is_board_full(&self, board: &Vec<Vec<Cell>>) -> bool {
        board.iter().all(|col| col[0] != Cell::Empty)
    }

    fn get_valid_columns(&self, board: &Vec<Vec<Cell>>) -> Vec<usize> {
        (0..self.num_columns)
            .filter(|&c| board[c][0] == Cell::Empty)
            .collect()
    }

    fn get_random_column(&self, valid_columns: &Vec<usize>) -> usize {
        let idx = (Math::random() * valid_columns.len() as f64) as usize;
        valid_columns[idx]
    }

    fn get_best_move(&self, state: &GameState) -> usize {
        let opponent = match state.current_player {
            Color::Red => Color::Yellow,
            Color::Yellow => Color::Red,
        };
        let valid_columns = self.get_valid_columns(&state.board);
        let mut best_score = i32::MIN;
        let mut best_column = valid_columns[0];

        for &col in &valid_columns {
            let temp_state_js = self.place_piece(&JsValue::from_serde(&state).unwrap(), col);
            let temp_state: GameState = temp_state_js.into_serde().unwrap();
            let score = self.minimax(
                &temp_state,
                5,
                i32::MIN,
                i32::MAX,
                false,
                state.current_player,
                opponent,
            );
            if score > best_score {
                best_score = score;
                best_column = col;
            }
        }
        best_column
    }

    fn minimax(
        &self,
        state: &GameState,
        depth: usize,
        mut alpha: i32,
        mut beta: i32,
        is_maximizing: bool,
        player: Color,
        opponent: Color,
    ) -> i32 {
        if depth == 0 || state.is_game_over {
            return self.evaluate_board(&state.board, player, opponent);
        }

        let valid_columns = self.get_valid_columns(&state.board);
        if is_maximizing {
            let mut max_eval = i32::MIN;
            for &col in &valid_columns {
                let temp_state_js = self.place_piece(&JsValue::from_serde(&state).unwrap(), col);
                let temp_state: GameState = temp_state_js.into_serde().unwrap();
                let eval =
                    self.minimax(&temp_state, depth - 1, alpha, beta, false, player, opponent);
                max_eval = max_eval.max(eval);
                alpha = alpha.max(eval);
                if beta <= alpha {
                    break;
                }
            }
            max_eval
        } else {
            let mut min_eval = i32::MAX;
            for &col in &valid_columns {
                let temp_state_js = self.place_piece(&JsValue::from_serde(&state).unwrap(), col);
                let temp_state: GameState = temp_state_js.into_serde().unwrap();
                let eval =
                    self.minimax(&temp_state, depth - 1, alpha, beta, true, player, opponent);
                min_eval = min_eval.min(eval);
                beta = beta.min(eval);
                if beta <= alpha {
                    break;
                }
            }
            min_eval
        }
    }

    fn evaluate_board(&self, board: &Vec<Vec<Cell>>, player: Color, opponent: Color) -> i32 {
        let mut score = 0;
        // Center column preference
        let center_column = &board[self.num_columns / 2];
        let center_count = center_column
            .iter()
            .filter(|&&cell| cell == Cell::Filled(player))
            .count();
        score += center_count as i32 * 6;

        // Scoring positions
        score += self.score_direction(board, player, opponent, 1, 0); // Horizontal
        score += self.score_direction(board, player, opponent, 0, 1); // Vertical
        score += self.score_direction(board, player, opponent, 1, 1); // Diagonal /
        score += self.score_direction(board, player, opponent, 1, -1); // Diagonal \

        score
    }

    fn score_direction(
        &self,
        board: &Vec<Vec<Cell>>,
        player: Color,
        opponent: Color,
        dc: isize,
        dr: isize,
    ) -> i32 {
        let mut score = 0;
        for c in 0..self.num_columns {
            for r in 0..self.num_rows {
                let mut window_cells = Vec::new();
                for i in 0..self.winning_length {
                    let cc = c as isize + i as isize * dc;
                    let rr = r as isize + i as isize * dr;
                    if cc >= 0
                        && cc < self.num_columns as isize
                        && rr >= 0
                        && rr < self.num_rows as isize
                    {
                        window_cells.push(board[cc as usize][rr as usize]);
                    }
                }
                if window_cells.len() == self.winning_length {
                    score += self.evaluate_window(&window_cells, player, opponent);
                }
            }
        }
        score
    }

    fn evaluate_window(&self, window_cells: &Vec<Cell>, player: Color, opponent: Color) -> i32 {
        let player_count = window_cells
            .iter()
            .filter(|&&cell| cell == Cell::Filled(player))
            .count();
        let opponent_count = window_cells
            .iter()
            .filter(|&&cell| cell == Cell::Filled(opponent))
            .count();
        let empty_count = window_cells
            .iter()
            .filter(|&&cell| cell == Cell::Empty)
            .count();
        let mut score = 0;

        if player_count == 4 {
            score += 100000;
        } else if player_count == 3 && empty_count == 1 {
            score += 100;
        } else if player_count == 2 && empty_count == 2 {
            score += 10;
        }

        if opponent_count == 4 {
            score -= 100000;
        } else if opponent_count == 3 && empty_count == 1 {
            score -= 1000;
        } else if opponent_count == 2 && empty_count == 2 {
            score -= 10;
        }

        score
    }
}
