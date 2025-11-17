const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

export const fetchChessComGames = async (username: string, count: number): Promise<any[]> => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const url = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Chess Tactics Generator'
      }
    });

    if (!response.ok) {
      throw new Error(`Chess.com API error: ${response.statusText}`);
    }

    const data = await response.json();
    const games = data.games || [];

    return games.slice(-count).map((game: any) => ({
      pgn: game.pgn,
      url: game.url,
      platform: 'chess.com'
    }));
  } catch (error) {
    console.error('Chess.com API error:', error);
    throw error;
  }
};

export const fetchLichessGames = async (username: string, count: number): Promise<any[]> => {
  try {
    const response = await fetch(
      `https://lichess.org/api/games/user/${username}?max=${count}&pgnInJson=true&sort=dateDesc`,
      {
        headers: {
          'Accept': 'application/x-ndjson',
          'User-Agent': 'Chess Tactics Generator'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.statusText}`);
    }

    const text = await response.text();
    const games = text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    return games.map((game: any) => ({
      pgn: game.pgn,
      url: `https://lichess.org/${game.id}`,
      platform: 'lichess'
    }));
  } catch (error) {
    console.error('Lichess API error:', error);
    throw error;
  }
};
