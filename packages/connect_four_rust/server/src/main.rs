// server/src/main.rs

use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Result};
use actix_web::http::header;
use serde::{Deserialize, Serialize};
use tera::{Context, Tera};
use connect_four_core::{ConnectFour, GameState, Quality, Color};
use base64::{encode_config, decode_config, URL_SAFE_NO_PAD};

#[derive(Serialize, Deserialize, Clone)]
struct ExtendedGameState {
    #[serde(flatten)]
    game_state: GameState,
    newest_piece_column: Option<usize>,
    newest_computer_piece_column: Option<usize>,
    minimax_quality: Quality,
}

impl ExtendedGameState {
    fn initial() -> Self {
        ExtendedGameState {
            game_state: ConnectFour::new().create_initial_state(),
            newest_piece_column: None,
            newest_computer_piece_column: None,
            minimax_quality: Quality::Best,
        }
    }
}

async fn index(req: HttpRequest, tmpl: web::Data<Tera>) -> Result<HttpResponse> {
    let query_string = req.query_string();
    let params: std::collections::HashMap<String, String> =
        serde_urlencoded::from_str(query_string).unwrap_or_default();

    let mut game_state = if let Some(state_param) = params.get("state") {
        match decode_state(state_param) {
            Ok(state) => state,
            Err(e) => {
                eprintln!("Error decoding state: {}", e);
                ExtendedGameState::initial()
            }
        }
    } else {
        ExtendedGameState::initial()
    };

    // If it's the computer's turn, compute the move
    if !game_state.game_state.is_game_over && game_state.game_state.current_player == Color::Yellow {
        let connect_four = ConnectFour::new();
        let computer_move = connect_four.get_computer_move(
            &game_state.game_state,
            game_state.minimax_quality,
        );
        game_state.game_state = connect_four.place_piece(&game_state.game_state, computer_move);
        game_state.newest_computer_piece_column = Some(computer_move);
    }

    // Render the template
    let mut ctx = Context::new();
    ctx.insert("board", &game_state.game_state.board);
    ctx.insert("current_player", &format!("{:?}", game_state.game_state.current_player));
    ctx.insert("is_game_over", &game_state.game_state.is_game_over);
    ctx.insert("winner", &game_state.game_state.winner.map(|w| format!("{:?}", w)));
    ctx.insert("newest_piece_column", &game_state.newest_piece_column);
    ctx.insert("newest_computer_piece_column", &game_state.newest_computer_piece_column);
    ctx.insert("minimax_quality", &format!("{:?}", game_state.minimax_quality));

    // Generate URLs for CPU quality links
    let quality_links = get_quality_links(&game_state);
    ctx.insert("quality_links", &quality_links);

    // Generate board cells with links
    let cells = render_cells(&game_state);
    ctx.insert("cells", &cells);

    let rendered = tmpl.render("game.html.tera", &ctx).map_err(|e| {
        eprintln!("Template error: {}", e);
        actix_web::error::ErrorInternalServerError("Template error")
    })?;

    Ok(HttpResponse::Ok()
        .content_type("text/html")
        .body(rendered))
}

fn decode_state(state_param: &str) -> Result<ExtendedGameState, Box<dyn std::error::Error>> {
    let decoded = decode_config(state_param, URL_SAFE_NO_PAD)?;
    let json_str = String::from_utf8(decoded)?;
    let state: ExtendedGameState = serde_json::from_str(&json_str)?;
    Ok(state)
}

fn encode_state(state: &ExtendedGameState) -> String {
    let json_str = serde_json::to_string(state).unwrap();
    encode_config(json_str, URL_SAFE_NO_PAD)
}

fn get_quality_links(game_state: &ExtendedGameState) -> Vec<(String, String, bool)> {
    let qualities = vec![
        (Quality::Bad, "Bad"),
        (Quality::Medium, "Medium"),
        (Quality::Best, "Best"),
    ];

    qualities
        .into_iter()
        .map(|(quality, label)| {
            let mut new_state = game_state.clone();
            new_state.minimax_quality = quality;
            let encoded_state = encode_state(&new_state);
            let href = format!("/?state={}", encoded_state);
            let is_active = new_state.minimax_quality == game_state.minimax_quality;
            (href, label.to_string(), is_active)
        })
        .collect()
}

fn render_cells(game_state: &ExtendedGameState) -> Vec<Vec<String>> {
    let connect_four = ConnectFour::new();
    let mut cells = vec![];

    for row in (0..connect_four.num_rows).rev() {
        let mut row_cells = vec![];
        for col in 0..connect_four.num_columns {
            let cell = &game_state.game_state.board[col][row];
            let cell_html = if matches!(cell, connect_four_core::Cell::Empty) && !game_state.game_state.is_game_over {
                let mut new_state = game_state.clone();
                new_state.game_state = connect_four.place_piece(&game_state.game_state, col);
                new_state.newest_piece_column = Some(col);
                new_state.newest_computer_piece_column = None;

                let encoded_state = encode_state(&new_state);
                let href = format!("/?state={}", encoded_state);

                format!(
                    r#"<a href="{href}" class="cell empty"><div class="piece empty"></div></a>"#,
                    href = href
                )
            } else {
                let class = match cell {
                    connect_four_core::Cell::Filled(Color::Red) => "red",
                    connect_four_core::Cell::Filled(Color::Yellow) => "yellow",
                    _ => "empty",
                };

                format!(r#"<div class="cell {class}"><div class="piece {class}"></div></div>"#,
                    class = class)
            };
            row_cells.push(cell_html);
        }
        cells.push(row_cells);
    }
    cells
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let tera = Tera::new("templates/**/*").expect("Error initializing Tera templates");
    println!("Server starting...");
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(tera.clone()))
            .route("/", web::get().to(index))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await

    
}
