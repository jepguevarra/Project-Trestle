"use client";

import { useEffect, useRef, useState } from "react";
import { anonymityNotice } from "@/lib/survey/messages";
import { RespondentForm, type Answers, type RespondentSection } from "./respondent-form";

type Loaded =
  | { state: "open"; title: string; name: string | null; anonymous: boolean; closesAt: string | null; sections: RespondentSection[]; answers: Answers }
  | { state: "submitted"; title: string };

const closes = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/**
 * The respondent's survey. Talks only to /api/public/survey/[token]: no Supabase client and no
 * session in the browser. Answers are saved page by page, and once more if the page is hidden.
 */
export function LiveSurvey({ token }: { token: string }) {
  const url = `/api/public/survey/${encodeURIComponent(token)}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Answers | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) setError(body.error ?? "This survey could not be loaded.");
        else setLoaded(body as Loaded);
      })
      .catch(() => setError("This survey could not be loaded. Check your connection and reload the page."));
  }, [url]);

  // Leaving mid-page (closing the tab, switching apps on a phone) saves what is on screen.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden" || !dirty.current || !latest.current) return;
      dirty.current = false;
      void fetch(url, { method: "PUT", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: latest.current }) });
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [url]);

  const send = async (method: "PUT" | "POST", answers: Answers): Promise<string | null> => {
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      if (res.ok) {
        dirty.current = false;
        return null;
      }
      const body = await res.json().catch(() => ({}));
      return body.error ?? "Your answers could not be saved. Try again.";
    } catch {
      return "Your answers could not be saved. Check your connection and try again.";
    }
  };

  if (error) {
    return (
      <p role="alert" className="text-sm">
        {error}
      </p>
    );
  }
  if (!loaded) return <p className="text-sm text-muted-foreground">Loading the survey…</p>;
  if (loaded.state === "submitted") {
    return (
      <div role="status" className="grid gap-2">
        <h1 className="text-xl font-semibold">{loaded.title}</h1>
        <p className="text-sm text-muted-foreground">You have already submitted your answers. Thank you.</p>
      </div>
    );
  }

  const intro = [
    loaded.name ? `Hello ${loaded.name}.` : null,
    anonymityNotice(loaded.anonymous),
    loaded.closesAt ? `The survey closes on ${closes(loaded.closesAt)}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <RespondentForm
      mode="live"
      title={loaded.title}
      intro={intro}
      sections={loaded.sections}
      initialAnswers={loaded.answers}
      onChange={(a) => {
        latest.current = a;
        dirty.current = true;
      }}
      onSave={(a) => send("PUT", a)}
      onSubmit={(a) => send("POST", a)}
    />
  );
}
