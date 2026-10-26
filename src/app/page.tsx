import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  ShieldCheck,
  MoveUpRight,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="availability">
              <span /> FOR THE CITIZENS OF DELHI
            </div>
            <h1>
              A complaint.
              <br />A paper trail.
              <br />
              <em>A way forward.</em>
            </h1>
            <p>
              A broken water pump shouldn’t mean another dead end. Turn what
              happened into a clear complaint, find the right office, and keep
              the follow-up moving.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/report">
                Report a problem <ArrowRight size={18} />
              </Link>
              <Link className="text-link" href="/report?example=meena">
                Try Meena’s story <MoveUpRight size={16} />
              </Link>
            </div>
            <div className="hero-note">
              <ShieldCheck size={16} /> No account needed <span>·</span> Hindi
              or English <span>·</span> You stay in control
            </div>
          </div>
          <div className="dossier">
            <div className="dossier-top">
              <span>NIVARAN / CASE FILE</span>
              <span>ILLUSTRATIVE EXAMPLE</span>
            </div>
            <div className="dossier-heading">
              <span className="file-symbol">
                <FileText size={27} />
              </span>
              <div>
                <p>WATER SUPPLY · DELHI</p>
                <h2>
                  41 days without water.
                  <br />
                  Let’s put it on record.
                </h2>
              </div>
            </div>
            <p className="case-quote" lang="hi">
              “हमारी गली का हैंडपंप 41 दिन से खराब है। कोई सुनवाई नहीं हुई।”
            </p>
            <div className="dossier-rule">
              <span>Responsible office</span>
              <strong>Delhi Jal Board</strong>
            </div>
            <div className="mini-timeline">
              {[
                ["Complaint prepared", "A clear account, with evidence."],
                ["Citizen files it", "Save the receipt. Start the clock."],
                ["Follow-up prepared", "The next step, when it’s due."],
              ].map(([title, copy], i) => (
                <div key={title} className={i === 2 ? "future" : ""}>
                  <span>
                    {i === 2 ? <Clock3 size={16} /> : <Check size={15} />}
                  </span>
                  <section>
                    <strong>{title}</strong>
                    <p>{copy}</p>
                  </section>
                </div>
              ))}
            </div>
            <div className="dossier-bottom">
              <ShieldCheck size={17} />
              <span>
                The models propose.
                <br />
                <strong>The code decides.</strong>
              </span>
              <span className="stamp">
                BUILT FOR
                <br />
                FOLLOW-THROUGH
              </span>
            </div>
          </div>
        </section>
        <div className="support-strip wrap">
          <span>POWERED BY</span>
          <strong>NVIDIA Nemotron</strong>
          <span className="strip-divider" />
          <strong>Nebius Token Factory</strong>
          <span className="strip-divider" />
          <strong>Tavily</strong>
          <Link href="/how">
            See what happens behind the scenes <ArrowRight size={15} />
          </Link>
        </div>
        <section className="story-section wrap">
          <div>
            <p className="eyebrow">FILING IS ONLY THE BEGINNING</p>
            <h2>
              The problem isn’t
              <br />
              just getting heard.
              <br />
              <em>It’s being followed up.</em>
            </h2>
            <p>
              Nivaran brings your evidence, the responsible office, and the next
              filing into one case file. So you don’t have to start from scratch
              every time.
            </p>
            <Link href="/how" className="text-link">
              Understand the process <ArrowRight size={16} />
            </Link>
          </div>
          <ol className="process-list">
            {[
              [
                "Tell us what happened",
                "Add a photo if you have one. Write naturally in Hindi or English; no formal language required.",
              ],
              [
                "Get a complaint you can use",
                "The pipeline checks responsibility, researches official sources, drafts your letter, and reviews it.",
              ],
              [
                "File it. Keep the receipt.",
                "You submit the complaint through the official channel. Nivaran helps track deadlines and prepare the next step.",
              ],
            ].map(([title, copy], i) => (
              <li key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="collective-section wrap">
          <div className="collective-art" aria-hidden="true">
            <div>01</div>
            <div>02</div>
            <div>03</div>
            <span>
              ONE STREET.
              <br />A SHARED PROBLEM.
            </span>
          </div>
          <div>
            <p className="eyebrow">FROM ONE CASE TO A PATTERN</p>
            <h2>Your street has a story, too.</h2>
            <p>
              When similar complaints repeat across a locality, the ward board
              brings them together. A shared record helps residents and
              legal-aid volunteers see the larger failure.
            </p>
            <Link className="btn btn-secondary" href="/board">
              Explore the ward board <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <section className="closing wrap">
          <p className="eyebrow">A SMALL FIRST STEP</p>
          <h2>Start with what happened.</h2>
          <Link className="btn btn-primary" href="/report">
            Make your first report <ArrowRight size={18} />
          </Link>
          <p>
            Nivaran prepares documents. You review and file them.
            <br />
            Delhi civic services only. Not legal advice.
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <Link className="font-display text-xl" href="/">
          Nivaran · निवारण
        </Link>
        <span>Built for the Nebius × NVIDIA Global AI Hackathon.</span>
        <a href="https://github.com/harshkawatra11/nivaran">GitHub ↗</a>
      </footer>
    </>
  );
}
