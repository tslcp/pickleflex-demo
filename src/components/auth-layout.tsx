import Link from "next/link";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({ children, signup = false }: { children: ReactNode; signup?: boolean }) {
  return (
    <div className="pf-home pf-auth">
      <header className="pf-header">
        <Link href="/" className="pf-brand" aria-label="PickleFlex home"><span className="pf-avatar" aria-hidden="true">p<span>✳</span></span>pickleflex<span className="pf-brand-dot">®</span></Link>
        <Link href="/" className="pf-login"><ArrowLeft size={15} />Back to home</Link>
      </header>
      <main className="pf-auth-main">
        <section className="pf-auth-story" aria-labelledby="auth-story-title">
          <p className="pf-eyebrow"><span />GOOD PEOPLE. GREAT GAMES.</p>
          <h2 id="auth-story-title">Your game.<br />Your people.<br /><em>{signup ? "Your next chapter." : "Your court awaits."}</em></h2>
          <p className="pf-intro">A little competition. A lot of connection.<br />{signup ? "Find your people and make your next match." : "Pick up where you left off. Good games are ahead."}</p>
          <div className="pf-court-art pf-auth-art" aria-hidden="true"><div className="pf-art-top">MEET YOU ON THE COURT<ArrowUpRight size={18} /></div><div className="pf-court"><i /><i /><i /><i /></div><div className="pf-net" /><div className="pf-paddle"><span>pf.</span></div><div className="pf-ball"><i /><i /><i /><i /><i /></div><div className="pf-art-bottom"><span>PLAY YOUR WAY.</span><span>EST. 2026</span></div></div>
        </section>
        <section className="pf-auth-panel" aria-label={signup ? "Create an account" : "Sign in"}>{children}</section>
      </main>
      <footer className="pf-auth-footer"><span>More than a match. A community.</span><span>© 2026 PickleFlex</span></footer>
    </div>
  );
}
