"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Paperclip, ShieldCheck } from "lucide-react";
import { AppShell, PageIntro, Notice } from "@/components/AppShell";
import { api } from "@/lib/browser-api";
const sample =
  "हमारी गली के बाहर वाला हैंडपंप 41 दिन से खराब है। करीब 300 परिवार इसी से पानी लेते हैं। हमने 1916 पर दो बार शिकायत की, कोई नहीं आया।";
async function preparePhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw new Error("Please choose a JPG or PNG photo.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob || blob.size > 1500000)
    throw new Error("This photo is too large. Please choose a smaller image.");
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}
export default function Report() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("en");
  const [photos, setPhotos] = useState<File[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  function loadSample() {
    setText(sample);
    setLanguage("hi");
    setLocation("Gali no. 4, near the community hall, Sangam Vihar, Delhi");
    setCoords({ lat: 28.492, lng: 77.246 });
  }
  useEffect(() => {
    Promise.resolve().then(() => {
      if (
        new URLSearchParams(window.location.search).get("example") === "meena"
      )
        loadSample();
    });
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("text", text);
      form.set("location", location);
      form.set("language", language);
      if (coords) {
        form.set("lat", String(coords.lat));
        form.set("lng", String(coords.lng));
      }
      photos.forEach((p) => form.append("photos", p));
      const { id } = await api<{ id: string }>("/api/cases", {
        method: "POST",
        body: form,
      });
      router.push(`/case/${id}?run=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your report.");
      setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setError(
        "Location isn’t available in this browser. Type the address below.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setError(
          "Could not access your location. Type a street and landmark instead.",
        );
        setLocating(false);
      },
      { timeout: 12000 },
    );
  }
  return (
    <AppShell>
      <PageIntro eyebrow="YOUR FIRST STEP" title="Tell us what happened.">
        No formal language needed. A few details help us prepare a complaint the
        right office can act on.
      </PageIntro>
      <div className="workspace-grid">
        <form className="panel" onSubmit={submit}>
          {error && <Notice error>{error}</Notice>}
          <div
            className="actions"
            style={{ justifyContent: "space-between", marginBottom: 25 }}
          >
            <span className="eyebrow">THE REPORT</span>
            <button
              type="button"
              className="subtle-button"
              onClick={loadSample}
            >
              Try Meena’s case ↗
            </button>
          </div>
          <label className="field">
            <span>Write in</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mixed">Hindi + English</option>
            </select>
          </label>
          <label className="field">
            <span>What’s the problem?</span>
            <textarea
              required
              maxLength={6000}
              lang={language === "hi" ? "hi" : "en"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened, how long has it been happening, and who is affected?"
            />
            <small>
              Include how long the problem has lasted and any earlier complaint
              references.
            </small>
          </label>
          <label className="field">
            <span>Where is it?</span>
            <input
              required
              value={location}
              maxLength={500}
              onChange={(e) => {
                setLocation(e.target.value);
                setCoords(null);
              }}
              placeholder="Street, landmark, locality in Delhi"
            />
            <button
              type="button"
              className="subtle-button"
              disabled={locating}
              onClick={locate}
            >
              <MapPin size={13} className="inline" />{" "}
              {locating
                ? "Finding your location…"
                : coords
                  ? "Location attached · update"
                  : "Use my location"}
            </button>
            <small>
              Keep a written landmark even when coordinates are attached.
            </small>
          </label>
          <label className="field">
            <span>
              <Paperclip size={14} className="inline" /> Add photos (optional)
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              disabled={preparing}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 3) {
                  setError("Choose up to three photos.");
                  e.target.value = "";
                  return;
                }
                setPreparing(true);
                setError("");
                try {
                  setPhotos(await Promise.all(files.map(preparePhoto)));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setPreparing(false);
                }
              }}
            />
            <small>
              Up to 3 JPG or PNG photos. We resize them before uploading. Avoid
              faces or sensitive personal details.
            </small>
          </label>
          {preparing && (
            <p className="help" role="status">
              Preparing photos…
            </p>
          )}
          {photos.length > 0 && (
            <div className="file-list">
              {photos.map((p, i) => (
                <span key={i}>
                  {p.name}{" "}
                  <button
                    type="button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <button
            className="btn btn-primary"
            disabled={busy || preparing}
            type="submit"
          >
            {busy ? "Saving your report…" : "Prepare my complaint"}
            <ArrowRight size={16} />
          </button>
          <p className="help">
            This prepares a draft. Nothing is sent to a government office.
          </p>
        </form>
        <aside className="aside-note">
          <div className="panel">
            <ShieldCheck size={26} className="text-verdigris mb-4" />
            <h2>A case, not another dead end.</h2>
            <ol>
              <li>Read your report and evidence.</li>
              <li>Identify the responsible office.</li>
              <li>Research, draft, and review.</li>
              <li>Let you review and file it.</li>
            </ol>
            <p className="help">
              Your cases belong to this browser session. Keep using the same
              browser to return to them.
            </p>
          </div>
          <p>
            For immediate danger, use your local emergency services. A civic
            complaint is not an emergency response.
          </p>
          <p className="help">
            Meena’s story is a fictional sample. Submitting it runs the actual
            pipeline and records actual usage.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
