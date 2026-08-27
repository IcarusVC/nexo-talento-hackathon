"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUSES, CV_STATUSES } from "@/lib/constants";
import type { Application } from "@/lib/types";

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  href: string;
  at: number; // epoch ms, for sorting
}

const SEEN_KEY = "tt:notifs:seen";

/** Application statuses worth surfacing as a notification (not the initial/withdrawn states). */
const NOTIFY_STATUSES: string[] = [
  APPLICATION_STATUSES.ENVIADA,
  APPLICATION_STATUSES.EN_ENTREVISTA,
  APPLICATION_STATUSES.RECHAZADA,
  APPLICATION_STATUSES.OFERTA,
];

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Derives an in-app notification feed from observable state — the user's CV
 * status and their applications — without needing a backend writer (the HITL
 * team edits Firestore by hand; there are no Cloud Functions). Read-state is
 * persisted per-browser in localStorage.
 */
export function useNotifications() {
  const { user, userDoc } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [seen, setSeen] = useState<Set<string>>(() => readSeen());

  useEffect(() => {
    if (!user) return;
    // Order by createdAt to reuse the existing (userId, createdAt) composite
    // index; we re-sort the derived notifications by their own timestamp below.
    const q = query(
      collection(db, "applications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(
      q,
      (snap) => setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application)),
      () => setApplications([])
    );
  }, [user]);

  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    if (userDoc?.cv.status === CV_STATUSES.MEJORADO_POR_REVISAR) {
      list.push({
        id: `cv-mejorado-v${userDoc.cv.version}`,
        title: "Tu CV mejorado está listo",
        body: "Revísalo y apruébalo para poder postular.",
        href: "/cv",
        at: userDoc.cv.updatedAt?.toMillis?.() ?? 0,
      });
    }

    for (const app of applications) {
      if (!NOTIFY_STATUSES.includes(app.status)) continue;
      list.push({
        id: `app-${app.id}-${app.status}`,
        title: `Postulación: ${APPLICATION_STATUS_LABELS[app.status]}`,
        body: app.listingTitle,
        href: `/applications/${app.id}`,
        at: app.updatedAt?.toMillis?.() ?? 0,
      });
    }

    return list.sort((a, b) => b.at - a.at);
  }, [userDoc, applications]);

  const unreadCount = useMemo(
    () => items.filter((item) => !seen.has(item.id)).length,
    [items, seen]
  );

  const markAllRead = useCallback(() => {
    const next = new Set(seen);
    items.forEach((item) => next.add(item.id));
    setSeen(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
    }
  }, [items, seen]);

  return { items, unreadCount, markAllRead, seen };
}
