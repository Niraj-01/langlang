import type { Lang } from "@/lib/types";

export interface Scenario {
  id: string;
  lang: Lang;
  emoji: string;
  title: string;
  setting: string; // shown to the user
  aiRole: string; // who Claude plays
  userRole: string; // who the learner plays
  level: string; // JLPT N5 / Goethe A1 etc.
  opener: string; // Claude's first line, in the target language
  openerMeaning: string;
  boss?: BossMeta;
}

export interface BossMeta {
  hp: number; // on-target exchanges needed to win
  avatar: string; // big emoji
  unlockAfter: string | null; // boss id that must be cleared first
}

export const SCENARIOS: Scenario[] = [
  {
    id: "ja-ramen",
    lang: "ja",
    emoji: "🍜",
    title: "Ramen Shop",
    setting: "A tiny late-night ramen counter in Tokyo.",
    aiRole: "the friendly but busy shop owner",
    userRole: "a hungry customer",
    level: "JLPT N5",
    opener: "いらっしゃいませ！何にしますか。",
    openerMeaning: "Welcome! What will you have?",
  },
  {
    id: "ja-konbini",
    lang: "ja",
    emoji: "🏪",
    title: "Konbini Run",
    setting: "A convenience store at 2am. You need snacks and directions.",
    aiRole: "the night-shift clerk",
    userRole: "a customer",
    level: "JLPT N5",
    opener: "こんばんは。いらっしゃいませ。",
    openerMeaning: "Good evening. Welcome.",
  },
  {
    id: "ja-friend",
    lang: "ja",
    emoji: "📱",
    title: "Texting a Friend",
    setting: "Your Japanese friend texts you about weekend plans.",
    aiRole: "your friend Yuki, casual speech",
    userRole: "yourself",
    level: "JLPT N5",
    opener: "ねえ、週末ひま？映画に行かない？",
    openerMeaning: "Hey, free this weekend? Wanna see a movie?",
  },
  {
    id: "ja-lost",
    lang: "ja",
    emoji: "🗺️",
    title: "Lost in Shibuya",
    setting: "You're lost and need to find the station before the last train.",
    aiRole: "a helpful stranger",
    userRole: "a lost tourist",
    level: "JLPT N5",
    opener: "大丈夫ですか。何かお探しですか。",
    openerMeaning: "Are you okay? Are you looking for something?",
  },
  {
    id: "de-cafe",
    lang: "de",
    emoji: "☕",
    title: "Berlin Café",
    setting: "A busy café in Kreuzberg. Order and make small talk.",
    aiRole: "the barista",
    userRole: "a customer",
    level: "Goethe A1",
    opener: "Hallo! Was darf es sein?",
    openerMeaning: "Hi! What can I get you?",
  },
  {
    id: "de-bahn",
    lang: "de",
    emoji: "🚆",
    title: "Deutsche Bahn Chaos",
    setting: "Your train is cancelled. Figure out how to get to Munich.",
    aiRole: "a DB service desk employee",
    userRole: "a stressed traveler",
    level: "Goethe A1",
    opener: "Guten Tag. Wie kann ich Ihnen helfen?",
    openerMeaning: "Good day. How can I help you?",
  },
  {
    id: "de-wg",
    lang: "de",
    emoji: "🛋️",
    title: "WG Interview",
    setting: "You're interviewing for a room in a Berlin flatshare.",
    aiRole: "Lena, one of the flatmates",
    userRole: "the applicant",
    level: "Goethe A1",
    opener: "Hi! Komm rein. Also, erzähl mal — wer bist du?",
    openerMeaning: "Hi! Come in. So, tell us — who are you?",
  },
  {
    id: "de-fussball",
    lang: "de",
    emoji: "⚽",
    title: "Football Argument",
    setting: "At a kneipe, your friend claims Bayern will win everything. Again.",
    aiRole: "your stubborn Bayern-fan friend Jonas",
    userRole: "yourself",
    level: "Goethe A1",
    opener: "Bayern gewinnt dieses Jahr alles. Das ist doch klar, oder?",
    openerMeaning: "Bayern is winning everything this year. That's obvious, right?",
  },
];

// ---- boss battles: level-capping conversation fights ----

export const BOSSES: Scenario[] = [
  {
    id: "boss-ja-genji",
    lang: "ja",
    emoji: "🍣",
    title: "Chef Genji",
    setting: "The counter of a Michelin sushi bar. Genji tests every gaijin.",
    aiRole: "Genji, a gruff master sushi chef who respects effort",
    userRole: "a diner earning his respect",
    level: "JLPT N5 Boss",
    opener: "ほう、日本語ができるのか？まあ、座れ。",
    openerMeaning: "Oh, you can speak Japanese? Well, sit down.",
    boss: { hp: 5, avatar: "🍣", unlockAfter: null },
  },
  {
    id: "boss-ja-kaiju",
    lang: "ja",
    emoji: "🦖",
    title: "Konbini Kaiju",
    setting: "A giant monster has taken over the 7-Eleven. Only Japanese calms it.",
    aiRole: "a lonely kaiju who just wants to chat and be understood",
    userRole: "the only human brave enough to talk to it",
    level: "JLPT N5 Boss II",
    opener: "グオオ…だ、誰か…話せる人…いないの？",
    openerMeaning: "Grooar… is… anyone… able to talk to me?",
    boss: { hp: 6, avatar: "🦖", unlockAfter: "boss-ja-genji" },
  },
  {
    id: "boss-de-fuchs",
    lang: "de",
    emoji: "🦊",
    title: "Herr Fuchs",
    setting: "The landlord interview for the last affordable flat in Berlin.",
    aiRole: "Herr Fuchs, a sly landlord grilling applicants",
    userRole: "the applicant who must impress him",
    level: "Goethe A1 Boss",
    opener: "Also. Warum sollte ich ausgerechnet Ihnen die Wohnung geben?",
    openerMeaning: "So. Why should I give the flat to you of all people?",
    boss: { hp: 5, avatar: "🦊", unlockAfter: null },
  },
  {
    id: "boss-de-kontrolleur",
    lang: "de",
    emoji: "🎫",
    title: "Der Kontrolleur",
    setting: "You forgot your ticket. The BVG inspector has boarded.",
    aiRole: "a stern but fair ticket inspector",
    userRole: "a passenger talking their way out of a fine",
    level: "Goethe A1 Boss II",
    opener: "Fahrscheinkontrolle. Ihren Fahrschein, bitte.",
    openerMeaning: "Ticket check. Your ticket, please.",
    boss: { hp: 6, avatar: "🎫", unlockAfter: "boss-de-fuchs" },
  },
];

export function scenariosFor(lang: Lang): Scenario[] {
  return SCENARIOS.filter((s) => s.lang === lang);
}

export function bossesFor(lang: Lang): Scenario[] {
  return BOSSES.filter((s) => s.lang === lang);
}

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id) ?? BOSSES.find((s) => s.id === id);
}
