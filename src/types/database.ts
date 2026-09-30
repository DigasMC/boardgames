export type SessionStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type ScoringMode = "individual" | "team";
export type FriendshipStatus = "pending" | "accepted" | "declined";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bgg_username: string | null;
  username: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
};

export type UserSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  friendship_status: FriendshipStatus | null;
  friendship_id: string | null;
  is_requester: boolean | null;
};

export type FriendProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type Game = {
  id: string;
  bgg_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  min_players: number | null;
  max_players: number | null;
  min_playtime: number | null;
  max_playtime: number | null;
  playing_time: number | null;
  weight: number | null;
  bgg_rating: number | null;
  year_published: number | null;
  categories: string[];
  mechanics: string[];
  fetched_at: string;
  created_at: string;
  updated_at: string;
};

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CollectionItem = {
  id: string;
  collection_id: string;
  game_id: string;
  notes: string | null;
  is_wishlist: boolean;
  added_at: string;
  game?: Game;
};

export type GameSession = {
  id: string;
  host_id: string;
  title: string;
  session_date: string;
  location: string | null;
  notes: string | null;
  status: SessionStatus;
  scoring_mode: ScoringMode;
  created_at: string;
  updated_at: string;
};

export type SessionGame = {
  id: string;
  session_id: string;
  game_id: string;
  sort_order: number;
  game?: Game;
};

export type SessionTeam = {
  id: string;
  session_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type SessionPlayer = {
  id: string;
  session_id: string;
  display_name: string;
  user_id: string | null;
  team_id: string | null;
  color: string | null;
  created_at: string;
  profile?: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
};

export type SessionScore = {
  id: string;
  session_id: string;
  player_id: string | null;
  team_id: string | null;
  game_id: string;
  score: number | null;
  is_winner: boolean;
  notes: string | null;
  created_at: string;
};

export type SessionPlayerInput = {
  id?: string | null;
  displayName: string;
  userId?: string | null;
  teamName?: string | null;
};

export type CollectionGame = Game & {
  collection_item_id: string;
  notes: string | null;
  is_wishlist: boolean;
};

export type BggSearchResult = {
  bggId: number;
  name: string;
  yearPublished?: number;
  type: string;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
};

export type PlayStatsRecent = {
  session_id: string;
  title: string;
  session_date: string;
  status: string;
  game_id: string | null;
  game_name: string | null;
  thumbnail_url: string | null;
  won: boolean;
};

export type PlayStats = {
  gamesPlayed: number;
  sessionsPlayed: number;
  wins: number;
  recent: PlayStatsRecent[];
};
