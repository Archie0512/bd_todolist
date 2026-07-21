import { createClient } from "@supabase/supabase-js";

// Supabase configuration
// The anon key is safe to expose in frontend - it's protected by RLS policies
// Environment variables take priority, but hardcoded values ensure it works everywhere
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://nzeujdjxawkbqfzrtblm.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56ZXVqZGp4YXdrYnFmenJ0YmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjY2OTUsImV4cCI6MjA5OTI0MjY5NX0.N1gfuk_GVorfKKXAiSbKo7OTgHFarLdZU3qHMdVZpTQ";

// Credentials are hardcoded as fallback - no warning needed

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper: check if current user is admin (authenticated)
export async function isAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Helper: get current user
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// ============ Data Access Functions ============

// Fetch all lanes ordered by sort_order
export async function fetchLanes() {
  const { data, error } = await supabase
    .from("lanes")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Fetch all cards with their lane and tags
export async function fetchCards() {
  const { data, error } = await supabase
    .from("cards_with_details")
    .select("*");
  if (error) throw error;
  return data || [];
}

// Fetch all tags
export async function fetchTags() {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");
  if (error) throw error;
  return data || [];
}

// Create a new card
export async function createCard(laneId, name, content = "") {
  const { data, error } = await supabase
    .from("cards")
    .insert({
      name,
      content,
      lane_id: laneId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update card content
export async function updateCardContent(cardId, content) {
  const { data, error } = await supabase
    .from("cards")
    .update({ content })
    .eq("id", cardId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Move card to a different lane
export async function moveCard(cardId, newLaneId) {
  const { data, error } = await supabase
    .from("cards")
    .update({ lane_id: newLaneId, last_moved_at: new Date().toISOString() })
    .eq("id", cardId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Rename card
export async function renameCard(cardId, newName) {
  const { data, error } = await supabase
    .from("cards")
    .update({ name: newName })
    .eq("id", cardId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete card
export async function deleteCard(cardId) {
  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", cardId);
  if (error) throw error;
}

// Create lane
export async function createLane(name) {
  const { data, error } = await supabase
    .from("lanes")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Rename lane
export async function renameLane(laneId, newName) {
  const { data, error } = await supabase
    .from("lanes")
    .update({ name: newName })
    .eq("id", laneId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete lane (cascades to cards)
export async function deleteLane(laneId) {
  const { error } = await supabase
    .from("lanes")
    .delete()
    .eq("id", laneId);
  if (error) throw error;
}

// Update lane sort order
export async function updateLaneSort(lanes) {
  const updates = lanes.map((lane, index) =>
    supabase.from("lanes").update({ sort_order: index }).eq("id", lane.id)
  );
  await Promise.all(updates);
}

// Update card sort order
export async function updateCardSort(cardId, newLaneId, sortOrder) {
  const { error } = await supabase
    .from("cards")
    .update({ lane_id: newLaneId, sort_order: sortOrder, last_moved_at: new Date().toISOString() })
    .eq("id", cardId);
  if (error) throw error;
}

// Get card tags (from content [tag:name] format)
export function parseTagsFromContent(content) {
  if (!content) return [];
  const matches = [...content.matchAll(/\[tag:(.*?)\]/g)];
  return matches.map((m) => m[1].trim()).filter((t) => t);
}

// Get due date from content
export function parseDueDateFromContent(content) {
  if (!content) return "";
  const match = content.match(/\[due:(.*?)\]/);
  return match ? match[1] : "";
}

// Auth functions
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}