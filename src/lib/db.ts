import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only database client. The service role key never reaches the browser.
let client: SupabaseClient | null = null;

export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export type BookingRow = {
  id: string;
  client_id: string;
  service_id: string;
  service_name: string;
  mode: "studio" | "travel";
  postcode: string | null;
  address: string | null;
  distance_miles: number | null;
  service_price_pence: number;
  travel_fee_pence: number;
  total_pence: number;
  start_at: string;
  end_at: string;
  block_start: string;
  block_end: string;
  status: BookingStatus;
  haircut_notes: string;
  source: "web" | "chat";
  created_at: string;
};

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  private_notes: string;
  created_at: string;
};
