type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return value && typeof value === "object" ? (value as Raw) : null;
}

function serializeGame(game: unknown) {
  const g = asRecord(game);
  if (!g) return null;
  return {
    id: g.id,
    bggId: g.bgg_id ?? g.bggId,
    name: g.name,
    minPlayers: g.min_players ?? g.minPlayers,
    maxPlayers: g.max_players ?? g.maxPlayers,
    playingTime: g.playing_time ?? g.playingTime,
    minPlaytime: g.min_playtime ?? g.minPlaytime,
    maxPlaytime: g.max_playtime ?? g.maxPlaytime,
    weight: g.weight,
    bggRating: g.bgg_rating ?? g.bggRating,
    yearPublished: g.year_published ?? g.yearPublished,
    categories: g.categories,
    mechanics: g.mechanics,
    thumbnailUrl: g.thumbnail_url ?? g.thumbnailUrl,
    imageUrl: g.image_url ?? g.imageUrl,
    description: g.description,
  };
}

/** Full session detail for agents (roster, games, scores, notes, dates). */
export function serializeSessionDetail(raw: Raw) {
  const host = asRecord(raw.host);
  const sessionGames = Array.isArray(raw.session_games)
    ? raw.session_games
    : Array.isArray(raw.sessionGames)
      ? raw.sessionGames
      : [];
  const players = Array.isArray(raw.session_players)
    ? raw.session_players
    : Array.isArray(raw.sessionPlayers)
      ? raw.sessionPlayers
      : [];
  const teams = Array.isArray(raw.session_teams)
    ? raw.session_teams
    : Array.isArray(raw.sessionTeams)
      ? raw.sessionTeams
      : [];
  const scores = Array.isArray(raw.session_scores)
    ? raw.session_scores
    : Array.isArray(raw.sessionScores)
      ? raw.sessionScores
      : [];

  const games = sessionGames.map((row) => {
    const sg = asRecord(row) ?? {};
    return {
      id: sg.id,
      gameId: sg.game_id ?? sg.gameId,
      sortOrder: sg.sort_order ?? sg.sortOrder,
      game: serializeGame(sg.game),
    };
  });

  return {
    id: raw.id,
    hostId: raw.host_id ?? raw.hostId,
    title: raw.title,
    sessionDate: raw.session_date ?? raw.sessionDate,
    location: raw.location ?? null,
    notes: raw.notes ?? null,
    status: raw.status,
    scoringMode: raw.scoring_mode ?? raw.scoringMode,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
    host: host
      ? {
          id: host.id,
          username: host.username,
          displayName: host.display_name ?? host.displayName,
          avatarUrl: host.avatar_url ?? host.avatarUrl,
        }
      : null,
    games,
    primaryGame: games[0]?.game ?? null,
    players: players.map((row) => {
      const p = asRecord(row) ?? {};
      const profile = asRecord(p.profile);
      return {
        id: p.id,
        displayName: p.display_name ?? p.displayName,
        userId: p.user_id ?? p.userId ?? null,
        teamId: p.team_id ?? p.teamId ?? null,
        color: p.color ?? null,
        profile: profile
          ? {
              id: profile.id,
              username: profile.username,
              displayName: profile.display_name ?? profile.displayName,
              avatarUrl: profile.avatar_url ?? profile.avatarUrl,
            }
          : null,
      };
    }),
    teams: teams.map((row) => {
      const t = asRecord(row) ?? {};
      return {
        id: t.id,
        name: t.name,
        sortOrder: t.sort_order ?? t.sortOrder,
      };
    }),
    scores: scores.map((row) => {
      const s = asRecord(row) ?? {};
      return {
        id: s.id,
        playerId: s.player_id ?? s.playerId ?? null,
        teamId: s.team_id ?? s.teamId ?? null,
        gameId: s.game_id ?? s.gameId,
        score: s.score,
        isWinner: s.is_winner ?? s.isWinner,
        notes: s.notes ?? null,
      };
    }),
  };
}

export function serializeSessionListItem(raw: Raw) {
  const detail = serializeSessionDetail(raw);
  return {
    id: detail.id,
    title: detail.title,
    sessionDate: detail.sessionDate,
    status: detail.status,
    scoringMode: detail.scoringMode,
    location: detail.location,
    notes: detail.notes,
    game: detail.primaryGame
      ? { id: detail.primaryGame.id, name: detail.primaryGame.name }
      : undefined,
    playerCount: detail.players.length,
    players: detail.players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
    })),
  };
}

export function summarizeSession(detail: ReturnType<typeof serializeSessionDetail>): string {
  const game = detail.primaryGame?.name ?? "no game";
  const when = detail.sessionDate ? String(detail.sessionDate) : "unknown date";
  const roster = detail.players
    .map((p) => p.displayName)
    .filter(Boolean)
    .join(", ");
  const notes =
    typeof detail.notes === "string" && detail.notes.trim()
      ? ` Notes: ${detail.notes.trim()}`
      : "";
  return `${detail.title} (${detail.status}) · ${game} · ${when} · ${detail.players.length} player(s)${
    roster ? `: ${roster}` : ""
  }.${notes}`;
}
