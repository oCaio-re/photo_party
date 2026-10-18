"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const SESSION_KEY = "photo_party_guest_id";
const NAME_KEY = "photo_party_guest_name";
const MY_PHOTOS_KEY = "photo_party_my_photos";
const CHANGE_EVENT = "photo_party_guest_identity_change";

function read(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing / storage disabled: identity just won't persist
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Reads any localStorage key reactively (empty string on the server and before hydration). */
export function useStoredValue(key: string): string {
  return useSyncExternalStore(subscribe, () => read(key), () => "");
}

/** Writes a localStorage key and notifies every useStoredValue/useGuestIdentity reader. */
export function writeStoredValue(key: string, value: string) {
  write(key, value);
}

/** Returns the Guest's anonymous session id, creating it on first use. */
export function ensureGuestSessionId(): string {
  let id = read(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    write(SESSION_KEY, id);
  }
  return id;
}

/** Headers identifying the Guest to the API (ownership of photos, likes, comments). */
export function guestHeaders(): Record<string, string> {
  const id = read(SESSION_KEY);
  return id ? { "x-guest-session-id": id } : {};
}

/** Records a Photo uploaded from this device so its delete button shows up immediately. */
export function rememberMyPhoto(photoId: string) {
  write(MY_PHOTOS_KEY, JSON.stringify([...readMyPhotoIds(), photoId]));
}

function readMyPhotoIds(): string[] {
  try {
    const parsed = JSON.parse(read(MY_PHOTOS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Guest identity persisted in localStorage, read through useSyncExternalStore so
 * server render and hydration agree (empty values until the client reads storage).
 */
export function useGuestIdentity() {
  const guestSessionId = useSyncExternalStore(subscribe, () => read(SESSION_KEY), () => "");
  const guestName = useSyncExternalStore(subscribe, () => read(NAME_KEY), () => "");
  const myPhotosRaw = useSyncExternalStore(subscribe, () => read(MY_PHOTOS_KEY), () => "");

  useEffect(() => {
    ensureGuestSessionId();
  }, []);

  const myUploadedPhotoIds = useMemo(() => {
    try {
      const parsed = JSON.parse(myPhotosRaw || "[]");
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  }, [myPhotosRaw]);

  const setGuestName = useCallback((name: string) => write(NAME_KEY, name), []);

  const forgetMyPhoto = useCallback((photoId: string) => {
    write(MY_PHOTOS_KEY, JSON.stringify(readMyPhotoIds().filter((id) => id !== photoId)));
  }, []);

  return { guestSessionId, guestName, setGuestName, myUploadedPhotoIds, forgetMyPhoto };
}
