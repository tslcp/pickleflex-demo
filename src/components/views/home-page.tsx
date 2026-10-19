"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Mail, MapPin, Pause, Play, Trophy, Users } from "lucide-react";
import { useTournaments } from "@/lib/tournament-context";
import { useAuth } from "@/lib/auth-context";

function dateLabel(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(date).toUpperCase();
}

export function HomePage() {
  const { tournaments } = useTournaments();
  const { user } = useAuth();
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const items = useMemo(() => [
    ...tournaments.map((t) => ({ id: `t-${t.id}`, title: t.name, date: t.startDate, venue: t.venue, href: `/tournaments/${t.id}`, categories: t.divisions.map((d) => ({ label: d.label, eligibility: `Skill ${d.skillLevel}` })) })),
  ].filter((item) => Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id)), [tournaments]);
  const maxPosition = Math.max(0, items.length - 4);
  const currentPosition = Math.min(position, maxPosition);

  useEffect(() => {
    if (paused || interacting || reducedMotion || maxPosition === 0) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setPosition((value) => value >= maxPosition ? 0 : value + 1);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused, interacting, reducedMotion, maxPosition]);

  return (
    <div className="pf-home">
      <header className="pf-header">
        <Link href="/" className="pf-brand" aria-label="PickleFlex home"><span className="pf-avatar" aria-hidden="true">p<span>✳</span></span>pickleflex<span className="pf-brand-dot">®</span></Link>
        <nav aria-label="Main navigation"><a href="#shop">Shop</a><a href="#community">Community</a><a href="#about">About</a></nav>
        <Link href={user ? "/dashboard" : "/signin"} className="pf-login">{user ? "My dashboard" : "Let’s play"}<ArrowUpRight size={16} /></Link>
      </header>

      <main>
        <section className="pf-hero" aria-labelledby="hero-title">
          <div className="pf-hero-copy"><p className="pf-eyebrow"><span /> GOOD PEOPLE. GREAT GAMES.</p><h1 id="hero-title">Your game.<br />Your people.<br /><em>Your pace.</em></h1><p className="pf-intro">A little competition. A lot of connection.<br />Find your next pickleball moment with PickleFlex.</p><a href="#tournaments" className="pf-button">Find your next game <ArrowUpRight size={20} /></a><div className="pf-hero-foot"><span className="pf-mini-ball">✳</span> More than a match. A community.</div></div>
          <div className="pf-court-art" role="img" aria-label="Illustrated green pickleball court with a paddle and yellow pickleball"><div className="pf-art-top">MEET YOU ON THE COURT <ArrowUpRight size={20} /></div><div className="pf-court"><i /><i /><i /><i /></div><div className="pf-net" /><div className="pf-paddle"><span>pf.</span></div><div className="pf-ball"><i /><i /><i /><i /><i /></div><div className="pf-art-sticker">LESS SCROLL.<br />MORE DINK.</div><div className="pf-art-bottom"><span>PLAY YOUR WAY.</span><span>EST. 2026</span></div></div>
        </section>

        <div className="pf-ticker" aria-hidden="true"><span>FIND YOUR COURT</span>✳<span>MAKE YOUR MATCH</span>✳<span>MEET YOUR PEOPLE</span>✳<span>PLAY IT YOUR WAY</span>✳</div>

        <section id="tournaments" className="pf-tournaments" aria-labelledby="tournaments-title">
          <div className="pf-section-intro"><p className="pf-eyebrow">THE LINEUP</p><h2 id="tournaments-title">Good times.<br /><em>Great matches.</em></h2><p>Find your next tournament and play at your level. There’s a place for you on the court.</p><Link href="/tournaments" className="pf-text-link">Explore tournaments <ArrowUpRight size={18} /></Link><div className="pf-note"><Trophy size={21} /><span>Your level. Your kind of play.<br /><strong>Find a match that fits.</strong></span></div></div>
          <div className="pf-lineup"><div className="pf-lineup-heading"><span>TOURNAMENTS</span><span>{String(items.length).padStart(2, "0")} IN THE MIX</span></div>
            <div className="pf-tournament-window" role="region" aria-label="Tournament summary carousel" aria-roledescription="carousel" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
              <div className="pf-tournament-track" style={{ transform: `translateY(-${currentPosition * 158}px)` }}>
                {items.map((item, index) => <Link href={item.href} aria-label={`View ${item.title} tournament details`} className="pf-tournament-bubble" key={item.id} inert={index < currentPosition || index >= currentPosition + 4}>
                  <div className="pf-tournament-top"><time dateTime={item.date}>{dateLabel(item.date)}</time><span className="pf-tag"><Trophy size={12} />Tournament</span></div>
                  <div className="pf-tournament-title">{item.title}<ArrowUpRight size={19} /></div>
                  <div className="pf-tournament-details"><span><MapPin size={13} />{item.venue}</span><span title={item.categories.map((c) => `${c.label}: ${c.eligibility}`).join(" · ")}><Users size={13} />{item.categories.length ? item.categories.map((c) => `${c.label} · ${c.eligibility}`).join(" / ") : "Eligibility to be announced"}</span></div>
                </Link>)}
              </div>
              {items.length === 0 && <p className="pf-empty">The court is quiet for now. Check back for the next lineup.</p>}
            </div>
            <div className="pf-carousel-controls"><span>{items.length ? `${currentPosition + 1}–${Math.min(currentPosition + 4, items.length)} of ${items.length}` : "No tournaments yet"} <span className="pf-control-hint"> / CHRONOLOGICAL ORDER</span></span><div><button aria-label={paused ? "Play automatic scrolling" : "Pause automatic scrolling"} onClick={() => setPaused(!paused)} disabled={maxPosition === 0 || reducedMotion}>{paused || reducedMotion ? <Play size={15} /> : <Pause size={15} />}</button><button aria-label="Previous tournament" disabled={currentPosition === 0} onClick={() => setPosition(currentPosition - 1)}><ArrowUp size={16} /></button><button aria-label="Next tournament" disabled={currentPosition >= maxPosition} onClick={() => setPosition(currentPosition + 1)}><ArrowDown size={16} /></button></div></div>
          </div>
        </section>

        <section className="pf-community" id="community"><div id="about"><p className="pf-eyebrow">EVERYONE’S INVITED</p><h2>Come for the game.<br /><em>Stay for the people.</em></h2></div><div><p>First-time player or seasoned competitor, you belong here. We bring people together through flexible play and a shared love of pickleball.</p><a href="#contact" className="pf-text-link">Say hello <ArrowRight size={18} /></a></div></section>
        <section id="shop" className="pf-shop"><span>THE PICKLEFLEX SHOP</span><p>A little court-side style is on its way.</p><span className="pf-tag">COMING SOON</span></section>
        <section id="contact" className="pf-contact"><div><p className="pf-eyebrow">LET’S CONNECT</p><h2>Got a question?<br />Let’s <em>rally.</em></h2></div><div><p>Questions about a tournament, bringing your crew, or teaming up? We’d love to hear from you.</p><a href="mailto:events@pickleflex.gg"><Mail size={21} />events@pickleflex.gg<ArrowUpRight size={23} /></a><span>Tournaments · Community · Collaborations</span></div></section>
      </main>
      <footer className="pf-footer"><Link href="/" className="pf-brand">pickleflex®</Link><span>More play. More possibility.</span><span>© 2026 PickleFlex</span><a href="#hero-title">Back to top ↑</a></footer>
    </div>
  );
}
