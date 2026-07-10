"use client";

// Starts the cloud-sync listener once per session, on every page.
import { useEffect } from "react";
import { startSync } from "@/lib/sync";

export function SyncBoot() {
  useEffect(() => startSync(), []);
  return null;
}
