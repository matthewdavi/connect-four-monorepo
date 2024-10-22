// wasm/src/lib.rs

use connect_four_core::{Color, ConnectFour as CoreConnectFour, GameState, Quality};
use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue; // Add this line

#[cfg(target_arch = "wasm32")]
extern crate wasm_bindgen;

#[wasm_bindgen]
pub struct ConnectFour {
    core: CoreConnectFour,
}

#[wasm_bindgen]
impl ConnectFour {
    /// Constructor for the ConnectFour struct.
    #[wasm_bindgen(constructor)]
    pub fn new() -> ConnectFour {
        ConnectFour {
            core: CoreConnectFour::new(),
        }
    }

    /// Creates the initial game state and returns it as a JsValue.
    #[wasm_bindgen]
    pub fn create_initial_state(&self) -> Result<JsValue, JsValue> {
        let state = self.core.create_initial_state();
        to_value(&state).map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Places a piece on the board and returns the new game state.
    #[wasm_bindgen]
    pub fn place_piece(&self, state_js: &JsValue, coordinate: usize) -> Result<JsValue, JsValue> {
        let state: GameState = from_value(state_js.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid state: {}", e)))?;
        let new_state = self.core.place_piece(&state, coordinate);
        to_value(&new_state).map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Determines the computer's move based on the quality and returns the column index.
    #[wasm_bindgen]
    pub fn get_computer_move(
        &self,
        state_js: &JsValue,
        quality_str: &str,
    ) -> Result<usize, JsValue> {
        let state: GameState = from_value(state_js.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid state: {}", e)))?;
        let quality = match quality_str {
            "bad" => Quality::Bad,
            "medium" => Quality::Medium,
            "best" => Quality::Best,
            _ => Quality::Best,
        };
        Ok(self.core.get_computer_move(&state, quality))
    }

    /// Checks if the game is over.
    #[wasm_bindgen]
    pub fn is_game_over(&self, state_js: &JsValue) -> Result<bool, JsValue> {
        let state: GameState = from_value(state_js.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid state: {}", e)))?;
        Ok(state.is_game_over)
    }

    /// Returns the winner as a string ("red" or "yellow"), or null if there's no winner.
    #[wasm_bindgen]
    pub fn get_winner(&self, state_js: &JsValue) -> Result<Option<String>, JsValue> {
        let state: GameState = from_value(state_js.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid state: {}", e)))?;
        let winner = match state.winner {
            Some(Color::Red) => Some("red".to_string()),
            Some(Color::Yellow) => Some("yellow".to_string()),
            None => None,
        };
        Ok(winner)
    }

    /// Returns the current player's color as a string ("red" or "yellow").
    #[wasm_bindgen]
    pub fn get_current_player(&self, state_js: &JsValue) -> Result<String, JsValue> {
        let state: GameState = from_value(state_js.clone())
            .map_err(|e| JsValue::from_str(&format!("Invalid state: {}", e)))?;
        let current_player = match state.current_player {
            Color::Red => "red".to_string(),
            Color::Yellow => "yellow".to_string(),
        };
        Ok(current_player)
    }
}
