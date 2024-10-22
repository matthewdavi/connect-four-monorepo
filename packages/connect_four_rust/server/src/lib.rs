use worker::*;
use connect_four_core::game::Game;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct GameState {
    // Define your game state structure
}

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: worker::Context) -> Result<Response> {
    Router::new()
        .get("/", |_, _| Response::ok("Connect Four Worker"))
        .post("/new_game", |mut req, _| async move {
            // Implement new game logic
            let game = Game::new();
            let state = GameState { /* ... */ };
            Response::from_json(&state)
        })
        .post("/make_move", |mut req, _| async move {
            // Implement make move logic
            let state: GameState = req.json().await?;
            // Update game state
            Response::from_json(&state)
        })
        .run(req, env).await
}
