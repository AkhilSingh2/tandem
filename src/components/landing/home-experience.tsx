"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-provider";
import { createRoomId } from "@/lib/ids";
import { parseRoomInput } from "@/lib/room";
import { roomHref } from "@/lib/demo/static-demo";

const FEATURES = [
  {
    title: "One pipeline, two hands",
    body: "Drag roles between Wishlist, Applied, Screen, Interview, and Offer. The other person sees the card land.",
  },
  {
    title: "A brief that merges",
    body: "The shared document is a Yjs text. Two people can type in the same paragraph and both sentences survive.",
  },
  {
    title: "Offline, then back",
    body: "Lose the socket, keep editing. IndexedDB holds the local copy and the CRDT merges it on reconnect.",
  },
];

export function HomeExperience() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [name, setName] = useState("Akhil");
  const [join, setJoin] = useState("");
  const [error, setError] = useState("");

  const go = (roomId: string) => {
    const who = name.trim() || "Akhil";
    localStorage.setItem("tandem:name", who);
    router.push(roomHref(roomId, { name: who }));
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Brand />
        <div className="flex items-center gap-2">
          <a className="btn btn-ghost btn-tiny" href="https://github.com/AkhilSingh2">
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="grid items-center gap-10 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-12">
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="text-sm font-medium tracking-[0.16em] text-accent-text uppercase">A studio for the job hunt</p>
          <h1 className="mt-3 max-w-xl font-display text-5xl leading-[1.02] sm:text-6xl">
            Two people. One pipeline. <span className="italic text-accent-text">Live.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Tandem is the room Akhilendra Singh uses to run a search in the open: a kanban, a shared brief, and a whiteboard.
            Cursors, comments, undo, and offline edits stay in sync. No accounts. No API keys.
          </p>
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              go(createRoomId());
            }}
          >
            <label className="block flex-1 text-sm text-muted">
              Your name
              <input
                className="field mt-1"
                value={name}
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Start a room
            </button>
            <Link href="/demo" className="btn btn-ghost">
              Two-person demo
            </Link>
          </form>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const roomId = parseRoomInput(join);
              if (!roomId) {
                setError("Paste a Tandem room link, or the room code itself.");
                return;
              }
              setError("");
              go(roomId);
            }}
          >
            <label className="block flex-1 text-sm text-muted">
              Join with a link
              <input
                className="field mt-1"
                value={join}
                onChange={(event) => setJoin(event.target.value)}
                placeholder="https://…/room/r…"
              />
            </label>
            <button type="submit" className="btn btn-ghost sm:self-end">
              Join
            </button>
          </form>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </motion.div>
        <Preview />
      </main>
      <section className="grid gap-4 md:grid-cols-3" aria-label="What Tandem does">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="panel p-5">
            <h2 className="font-display text-2xl">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
          </article>
        ))}
      </section>
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-faint">
        <p>Built by Akhilendra Singh · github.com/AkhilSingh2</p>
        <p>Next.js · Yjs · Hocuspocus · SQLite</p>
      </footer>
    </div>
  );
}

function Preview() {
  return (
    <div className="panel relative overflow-hidden p-4" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between text-xs text-faint">
        <span className="font-display text-base text-ink">Spring 2026 search</span>
        <span>Akhil · Maya</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Wishlist", "Notion"],
          ["Interview", "Linear"],
          ["Offer", "—"],
        ].map(([column, company]) => (
          <div key={column} className="rounded-2xl bg-sunken p-2">
            <p className="text-[11px] tracking-wide text-faint uppercase">{column}</p>
            {company === "—" ? (
              <p className="mt-6 mb-4 text-center text-xs text-faint">Empty</p>
            ) : (
              <div className="mt-2 rounded-xl bg-elev p-2">
                <p className="text-[10px] text-faint uppercase">{company}</p>
                <p className="text-sm">{company === "Linear" ? "Product Engineer" : "Web Platform"}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="float-a absolute">
        <Cursor name="Akhil" color="#9a3412" />
      </div>
      <div className="float-b absolute">
        <Cursor name="Maya" color="#1e3a8a" />
      </div>
    </div>
  );
}

function Cursor({ name, color }: { name: string; color: string }) {
  return (
    <div className="cursor-chip">
      <svg width="16" height="16" viewBox="0 0 18 18" fill={color} aria-hidden>
        <path d="M2 1.5 14.5 8.2 8.4 9.4 6.2 15.2Z" />
      </svg>
      <span className="ml-3 rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: color }}>
        {name}
      </span>
    </div>
  );
}
