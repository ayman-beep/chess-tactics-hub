export const fetchChessComGames = async (username: string, count: number): Promise<any[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-chess-games`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          platform: 'chess.com',
          count,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch games from Chess.com');
    }

    const data = await response.json();
    return data.games || [];
  } catch (error) {
    console.error('Chess.com API error:', error);
    throw error;
  }
};

export const fetchLichessGames = async (username: string, count: number): Promise<any[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-chess-games`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          platform: 'lichess',
          count,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch games from Lichess');
    }

    const data = await response.json();
    return data.games || [];
  } catch (error) {
    console.error('Lichess API error:', error);
    throw error;
  }
};
