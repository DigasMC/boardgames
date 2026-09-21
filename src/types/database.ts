export type SessionStatus = "planned" | "in_progress" | "completed" | "cancelled";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bgg_username: string | null;
  created_at: string;
  updated_at: string;
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

export type SessionPlayer = {
  id: string;
  session_id: string;
  display_name: string;
  user_id: string | null;
  color: string | null;
  created_at: string;
};

export type SessionScore = {
  id: string;
  session_id: string;
  player_id: string;
  game_id: string;
  score: number | null;
  is_winner: boolean;
  notes: string | null;
  created_at: string;
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
