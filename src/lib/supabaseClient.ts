import { createClient } from '@supabase/supabase-js'
import { Team, Player, Match, MatchPlayer } from '../types'; // Import new types

// Ensure environment variables are loaded
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in .env file");
}

// Define Database interface matching Supabase schema
interface Database {
  public: {
    Tables: {
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id'>;
        Update: Partial<Team>;
      }
      players: { // Add players table
        Row: Player;
        Insert: Omit<Player, 'id' | 'created_at'>; // Name is required for insert
        Update: Partial<Player>;
      }
      matches: { // Add matches table
        Row: Match;
        Insert: Omit<Match, 'id' | 'played_at' | 'created_at'>; // team IDs required, scores optional
        Update: Partial<Match>; // Likely updating scores
      }
      match_players: { // Add match_players table
        Row: MatchPlayer;
        Insert: Omit<MatchPlayer, 'id' | 'created_at'>; // match_id, player_id, team_number required
        Update: never; // Updates disallowed by policy
      }
    }
    Views: {
      [_ in never]: never;
    }
    Functions: {
      [_ in never]: never;
    }
    Enums: {
      [_ in never]: never;
    }
    CompositeTypes: {
      [_ in never]: never;
    }
  }
}


// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
