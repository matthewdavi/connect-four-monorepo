// core/src/lib.rs

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum Color {
    Red,
    Yellow,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum Cell {
    Empty,
    Filled(Color),
}

pub type Board = Vec<Vec<Cell>>;
pub type Coordinate = usize;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum Quality {
    Bad,
    Medium,
    Best,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct GameState {
    pub board: Board,
    pub current_player: Color,
    pub winner: Option<Color>,
    pub is_game_over: bool,
}

pub struct ConnectFour {
    pub num_columns: usize,
    pub num_rows: usize,
    pub winning_length: usize,
    pub max_depth: usize,
    // pub state_cache: HashMap<String, Coordinate>, // Optional: For precomputed states
}

impl ConnectFour {
    /// Creates a new ConnectFour instance with default settings.
    pub fn new() -> Self {
        ConnectFour {
            num_columns: 7,
            num_rows: 6,
            winning_length: 4,
            max_depth: 5, // Adjusted depth for performance
                          // state_cache: HashMap::new(),
        }
    }

    /// Creates an empty game board.
    pub fn create_board(&self) -> Board {
        vec![vec![Cell::Empty; self.num_rows]; self.num_columns]
    }

    /// Creates an initial game state.
    pub fn create_initial_state(&self) -> GameState {
        GameState {
            board: self.create_board(),
            current_player: Color::Red,
            winner: None,
            is_game_over: false,
        }
    }

    /// Places a piece on the board at the given column for the current player.
    /// Returns a new game state with the piece placed.
    pub fn place_piece(&self, state: &GameState, coordinate: Coordinate) -> GameState {
        // Validate coordinate
        if coordinate >= self.num_columns || state.is_game_over {
            // Invalid coordinate or game over, return state unchanged
            return state.clone();
        }

        let mut new_board = state.board.clone();

        for row in (0..self.num_rows).rev() {
            if let Cell::Empty = new_board[coordinate][row] {
                new_board[coordinate][row] = Cell::Filled(state.current_player);

                let winner = if self.check_winner(&new_board, state.current_player) {
                    Some(state.current_player)
                } else {
                    None
                };

                let is_game_over = winner.is_some() || self.is_board_full(&new_board);

                return GameState {
                    board: new_board,
                    current_player: match state.current_player {
                        Color::Red => Color::Yellow,
                        Color::Yellow => Color::Red,
                    },
                    winner,
                    is_game_over,
                };
            }
        }

        // Column is full, return state unchanged
        state.clone()
    }

    /// Checks if there's a winner on the board for a specific player.
    pub fn check_winner(&self, board: &Board, player: Color) -> bool {
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

    /// Gets the computer's move based on the specified quality.
    pub fn get_computer_move(&self, state: &GameState, quality: Quality) -> Coordinate {
        let valid_columns = self.get_valid_columns(&state.board);

        match quality {
            Quality::Bad => self.get_random_column(&valid_columns),
            Quality::Medium => {
                // Try to win in the next move
                for &col in &valid_columns {
                    let temp_state = self.place_piece(state, col);
                    if temp_state.winner == Some(state.current_player) {
                        return col;
                    }
                }

                // Block opponent's winning move
                let opponent = match state.current_player {
                    Color::Red => Color::Yellow,
                    Color::Yellow => Color::Red,
                };
                for &col in &valid_columns {
                    let mut temp_state = state.clone();
                    temp_state.current_player = opponent;
                    let temp_state = self.place_piece(&temp_state, col);
                    if temp_state.winner == Some(opponent) {
                        return col;
                    }
                }

                // Else, pick a random column
                self.get_random_column(&valid_columns)
            }
            Quality::Best => self.get_best_move(state),
        }
    }

    /// Gets a list of valid columns where a piece can be placed.
    fn get_valid_columns(&self, board: &Board) -> Vec<Coordinate> {
        (0..self.num_columns)
            .filter(|&c| matches!(board[c][0], Cell::Empty))
            .collect()
    }

    /// Gets a random column from the list of valid columns.
    fn get_random_column(&self, valid_columns: &[Coordinate]) -> Coordinate {
        use rand::seq::SliceRandom;
        use rand::thread_rng;

        let mut rng = thread_rng();
        *valid_columns
            .choose(&mut rng)
            .expect("No valid columns available")
    }

    /// Uses the minimax algorithm with alpha-beta pruning to determine the best move.
    fn get_best_move(&self, state: &GameState) -> Coordinate {
        let opponent = match state.current_player {
            Color::Red => Color::Yellow,
            Color::Yellow => Color::Red,
        };

        let valid_columns = self.get_valid_columns(&state.board);
        let mut best_score = i32::MIN;
        let mut best_column = valid_columns[0];

        // Move ordering: prioritize center column and adjacent columns
        let center = self.num_columns / 2;
        let mut ordered_columns = valid_columns.clone();
        ordered_columns.sort_by_key(|&col| (center as isize - col as isize).abs());

        for &col in &ordered_columns {
            let new_state = self.place_piece(state, col);
            let score = self.minimax(
                &new_state,
                self.max_depth,
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

    /// Minimax algorithm with alpha-beta pruning and depth limiting.
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
                let new_state = self.place_piece(state, col);
                let eval =
                    self.minimax(&new_state, depth - 1, alpha, beta, false, player, opponent);
                max_eval = max_eval.max(eval);
                alpha = alpha.max(eval);
                if beta <= alpha {
                    break; // Beta cutoff
                }
            }
            max_eval
        } else {
            let mut min_eval = i32::MAX;
            for &col in &valid_columns {
                let new_state = self.place_piece(state, col);
                let eval = self.minimax(&new_state, depth - 1, alpha, beta, true, player, opponent);
                min_eval = min_eval.min(eval);
                beta = beta.min(eval);
                if beta <= alpha {
                    break; // Alpha cutoff
                }
            }
            min_eval
        }
    }

    /// Evaluates the board and returns a score.
    fn evaluate_board(&self, board: &Board, player: Color, opponent: Color) -> i32 {
        let mut score = 0;

        // Score center column
        let center_col = self.num_columns / 2;
        let center_array = &board[center_col];
        let center_count = center_array
            .iter()
            .filter(|&&cell| cell == Cell::Filled(player))
            .count();
        score += (center_count as i32) * 6;

        // Score positions in all directions
        score += self.score_direction(board, player, opponent, 1, 0); // Horizontal
        score += self.score_direction(board, player, opponent, 0, 1); // Vertical
        score += self.score_direction(board, player, opponent, 1, 1); // Diagonal /
        score += self.score_direction(board, player, opponent, 1, -1); // Diagonal \

        score
    }

    /// Scores the board in a specific direction.
    fn score_direction(
        &self,
        board: &Board,
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

    /// Evaluates a window of cells and returns a score.
    fn evaluate_window(&self, window_cells: &[Cell], player: Color, opponent: Color) -> i32 {
        let mut score = 0;
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

        if player_count == 4 {
            score += 100000; // Winning move
        } else if player_count == 3 && empty_count == 1 {
            score += 100; // Three in a row with an open spot
        } else if player_count == 2 && empty_count == 2 {
            score += 10; // Two in a row with two open spots
        }

        if opponent_count == 4 {
            score -= 100000; // Opponent's winning move
        } else if opponent_count == 3 && empty_count == 1 {
            score -= 1000; // Block opponent's three in a row
        } else if opponent_count == 2 && empty_count == 2 {
            score -= 10; // Block opponent's two in a row
        }

        score
    }

    /// Checks if the board is full.
    fn is_board_full(&self, board: &Board) -> bool {
        board.iter().all(|col| col[0] != Cell::Empty)
    }

    /// Serializes the game state into a unique string representation.
    fn serialize_state(&self, state: &GameState) -> String {
        state
            .board
            .iter()
            .map(|col| {
                col.iter()
                    .map(|&cell| match cell {
                        Cell::Empty => '0',
                        Cell::Filled(Color::Red) => 'R',
                        Cell::Filled(Color::Yellow) => 'Y',
                    })
                    .collect::<String>()
            })
            .collect::<Vec<String>>()
            .join("|")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = ConnectFour::new();
        let state = game.create_initial_state();
        assert_eq!(state.current_player, Color::Red);
        assert!(!state.is_game_over);
        assert!(state.winner.is_none());
        assert_eq!(state.board.len(), game.num_columns);
        for column in &state.board {
            assert_eq!(column.len(), game.num_rows);
            assert!(column.iter().all(|&cell| cell == Cell::Empty));
        }
    }

    #[test]
    fn test_place_piece() {
        let game = ConnectFour::new();
        let state = game.create_initial_state();
        let new_state = game.place_piece(&state, 3);
        assert_eq!(new_state.board[3][5], Cell::Filled(Color::Red));
        assert_eq!(new_state.current_player, Color::Yellow);
    }

    #[test]
    fn test_winner_horizontal() {
        let game = ConnectFour::new();
        let mut state = game.create_initial_state();
        // Place pieces to form a horizontal line
        for col in 0..4 {
            state = game.place_piece(&state, col);
            // Simulate opponent's move elsewhere
            state = game.place_piece(&state, game.num_columns - 1);
        }
        assert_eq!(state.winner, Some(Color::Red));
        assert!(state.is_game_over);
    }

    #[test]
    fn test_winner_vertical() {
        let game = ConnectFour::new();
        let mut state = game.create_initial_state();
        // Place pieces to form a vertical line
        for _ in 0..4 {
            state = game.place_piece(&state, 0);
            if !state.is_game_over {
                // Simulate opponent's move elsewhere
                state = game.place_piece(&state, 1);
            }
        }
        assert_eq!(state.winner, Some(Color::Red));
        assert!(state.is_game_over);
    }

    #[test]
    fn test_invalid_move() {
        let game = ConnectFour::new();
        let state = game.create_initial_state();
        let new_state = game.place_piece(&state, game.num_columns);
        assert_eq!(state, new_state);
    }

    #[test]
    fn test_full_column() {
        let game = ConnectFour::new();
        let mut state = game.create_initial_state();
        // Fill a column
        for _ in 0..game.num_rows {
            state = game.place_piece(&state, 0);
        }
        let new_state = game.place_piece(&state, 0);
        assert_eq!(state, new_state);
    }
}
