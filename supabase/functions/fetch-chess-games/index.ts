const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChessComGame {
  url: string;
  pgn: string;
  time_class: string;
  end_time: number;
}

interface LichessGame {
  id: string;
  pgn: string;
  speed: string;
  createdAt: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { username, platform, count } = await req.json();

    if (!username || !platform || !count) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: username, platform, count" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let games: any[] = [];

    if (platform === "chess.com") {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const response = await fetch(
        `https://api.chess.com/pub/player/${username}/games/${year}/${month}`
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `Chess.com API error: ${response.statusText}` }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const data = await response.json();
      const chessGames = data.games || [];

      games = chessGames.slice(-count).map((game: ChessComGame) => ({
        pgn: game.pgn,
        url: game.url,
        platform: "chess.com",
      }));
    } else if (platform === "lichess") {
      const response = await fetch(
        `https://lichess.org/api/games/user/${username}?max=${count}&pgnInJson=true&sort=dateDesc`,
        {
          headers: {
            Accept: "application/x-ndjson",
          },
        }
      );

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `Lichess API error: ${response.statusText}` }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const text = await response.text();
      const lichessGames = text
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));

      games = lichessGames.map((game: LichessGame) => ({
        pgn: game.pgn,
        url: `https://lichess.org/${game.id}`,
        platform: "lichess",
      }));
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid platform. Use 'chess.com' or 'lichess'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ games }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
