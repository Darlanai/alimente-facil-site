"use client";

import {
  Apple, Beef, Coffee, CookingPot, CupSoda, Drumstick, Egg, FileText, Fish, GlassWater, Image as ImageIcon,
  Lamp, LayoutGrid, Leaf, MessageCircle, Milk, Minus, Package, Plus, Printer, QrCode, Rows3, Search, SprayCan, Wheat, X, ArrowLeft,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  absorb, accessKeyFrom, allowance, categoryFor, coverage, downloadImage, downloadPdf, emptyHouse,
  loadHouse, money, noteFromReading, plain, ROOMS, saveHouse, sendWhatsApp, stateFromKey,
  uid, type Grocery, type House, type Line, type Look, type Note, type Room,
} from "../lib/glass-house";

function Mark({ name, category }: { name: string; category: string }) {
  const value = `${name} ${category}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const props = { size: 18, "aria-hidden": true as const };
  let icon = <Package {...props} />;
  if (/banana|maca|fruta/.test(value)) icon = <Apple {...props} />;
  else if (/cenoura|batata|tomate|alho|hortifruti/.test(value)) icon = <Leaf {...props} />;
  else if (/frango/.test(value)) icon = <Drumstick {...props} />;
  else if (/carne|proteina/.test(value)) icon = <Beef {...props} />;
  else if (/peixe/.test(value)) icon = <Fish {...props} />;
  else if (/ovo/.test(value)) icon = <Egg {...props} />;
  else if (/leite|queijo|laticinio/.test(value)) icon = <Milk {...props} />;
  else if (/azeite|agua|vinho/.test(value)) icon = <GlassWater {...props} />;
  else if (/cafe/.test(value)) icon = <Coffee {...props} />;
  else if (/suco|bebida/.test(value)) icon = <CupSoda {...props} />;
  else if (/arroz|farinha|trigo/.test(value)) icon = <Wheat {...props} />;
  else if (/limpeza|casa/.test(value)) icon = <SprayCan {...props} />;
  return <span className="af-mark">{icon}</span>;
}

function Looks({ look, onChange }: { look: Look; onChange: (look: Look) => void }) {
  return (
    <div className="af-look" role="group" aria-label="Como ver">
      <button type="button" className={look === "grade" ? "is-on" : ""} onClick={() => onChange("grade")}><LayoutGrid size={15} />Grade</button>
      <button type="button" className={look === "fila" ? "is-on" : ""} onClick={() => onChange("fila")}><Rows3 size={15} />Fila</button>
      <button type="button" className={look === "um" ? "is-on" : ""} onClick={() => onChange("um")}><span className="af-um" />Um</button>
    </div>
  );
}

function Chips({ categories, current, onChange }: { categories: string[]; current: string; onChange: (value: string) => void }) {
  return (
    <div className="af-chips">
      {categories.map((category) => (
        <button key={category} type="button" className={current === category ? "is-on" : ""} onClick={() => onChange(category)}>{category}</button>
      ))}
    </div>
  );
}

function Lines({ items, look }: { items: Line[]; look: Look }) {
  const [index, setIndex] = useState(0);
  const safe = items[Math.min(index, Math.max(items.length - 1, 0))];
  if (!items.length) return <p className="af-empty">Nada com esse filtro.</p>;
  if (look === "um" && safe) {
    return (
      <article className="af-focus">
        <Mark name={safe.name} category={safe.category} />
        <h3>{safe.name}</h3>
        <p>{safe.category}</p>
        <strong>{safe.quantity} {safe.unit}</strong>
        {safe.total > 0 && <b>{money(safe.total)}</b>}
        <div>
          <button className="af-ghost" type="button" onClick={() => setIndex((value) => (value - 1 + items.length) % items.length)}>Anterior</button>
          <button className="af-ghost" type="button" onClick={() => setIndex((value) => (value + 1) % items.length)}>Próximo</button>
        </div>
      </article>
    );
  }
  if (look === "grade") {
    return (
      <div className="af-grade">
        {items.map((item) => (
          <article key={item.id}>
            <Mark name={item.name} category={item.category} />
            <strong>{item.name}</strong>
            <small>{item.category}</small>
            <b>{item.quantity} {item.unit}</b>
          </article>
        ))}
      </div>
    );
  }
  return (
    <div className="af-fila">
      {items.map((item) => (
        <article key={item.id}>
          <Mark name={item.name} category={item.category} />
          <div><strong>{item.name}</strong><small>{item.originalName !== item.name ? item.originalName : item.category}</small></div>
          <em>{item.quantity} {item.unit}</em>
          {item.total > 0 && <b>{money(item.total)}</b>}
        </article>
      ))}
    </div>
  );
}

type Hit = { room: Room; title: string; detail: string; noteId?: string };

function searchHouse(house: House, text: string) {
  const q = plain(text);
  if (q.length < 2) return [] as Hit[];
  const hits: Hit[] = [];
  for (const [id, label] of ROOMS) {
    if (plain(label).includes(q)) hits.push({ room: id, title: label, detail: "Abrir" });
  }
  for (const item of house.pantry) {
    if (plain(`${item.name} ${item.category}`).includes(q)) hits.push({ room: "despensa", title: item.name, detail: `${item.quantity} ${item.unit} · ${item.category}` });
  }
  for (const note of house.notes) {
    if (plain(note.merchant).includes(q)) hits.push({ room: "notas", title: note.merchant, detail: money(note.total), noteId: note.id });
    for (const line of note.items) {
      if (plain(`${line.name} ${line.originalName}`).includes(q)) hits.push({ room: "notas", title: line.name, detail: `${note.merchant} · ${money(line.total)}`, noteId: note.id });
    }
  }
  for (const list of house.lists) {
    const names = list.items.map((item) => item.name).join(" ");
    if (plain(`${list.name} ${names}`).includes(q)) hits.push({ room: "listas", title: list.name, detail: `${list.items.length} itens` });
  }
  for (const recipe of house.recipes) {
    if (plain(`${recipe.name} ${recipe.ingredients.join(" ")} ${recipe.steps.join(" ")}`).includes(q)) hits.push({ room: "receitas", title: recipe.name, detail: `${recipe.minutes} min` });
  }
  for (const meal of house.meals) {
    if (plain(`${meal.title} ${meal.slot} ${meal.date}`).includes(q)) hits.push({ room: "plano", title: meal.title, detail: `${meal.slot} · ${meal.date}` });
  }
  const spent = house.notes.reduce((sum, item) => sum + item.total, 0);
  if (/gast|total|dinheiro|nota/.test(q)) hits.push({ room: "gastos", title: "Gastos", detail: money(spent) });
  if (/conta|plano|teste|premium|login|email/.test(q)) hits.push({ room: "conta", title: "Conta", detail: house.premiumSince ? "Plano de 10 notas" : "Teste" });
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const mark = `${hit.room}|${hit.title}|${hit.detail}`;
    if (seen.has(mark)) return false;
    seen.add(mark);
    return true;
  }).slice(0, 8);
}

type Place = "base" | "geladeira" | "armario" | "torneira" | "pessoa";

function Kitchen({ lit, onLight }: { lit: boolean; onLight: () => void }) {
  const [place, setPlace] = useState<Place>("pessoa");
  useEffect(() => {
    const timer = window.setTimeout(() => setPlace((current) => current === "pessoa" ? "base" : current), 8000);
    return () => window.clearTimeout(timer);
  }, []);
  const media = !lit
    ? { src: "/fundo.mp4", poster: "/fundo.jpg" }
    : place === "geladeira" ? { src: "/geladeira.mp4", poster: "/geladeira.jpg" }
    : place === "armario" ? { src: "/armario.mp4", poster: "/armario.jpg" }
    : place === "torneira" ? { src: "/torneira.mp4", poster: "/torneira.jpg" }
    : place === "pessoa" ? { src: "/pessoa.mp4", poster: "/pessoa.jpg" }
    : { src: "/luz.mp4", poster: "/luz.jpg" };
  function toggle(next: Place) { setPlace((current) => current === next ? "base" : next); }
  return (
    <>
      <video key={media.src} className="af-film" autoPlay muted loop playsInline poster={media.poster} src={media.src} />
      <div className="af-veil" />
      <div className="af-spots">
        <button type="button" className="af-spot af-spot--fridge" onClick={() => toggle("geladeira")}>{place === "geladeira" ? "Fechar geladeira" : "Geladeira"}</button>
        <button type="button" className="af-spot af-spot--cabinet" onClick={() => toggle("armario")}>{place === "armario" ? "Fechar armários" : "Armários"}</button>
        <button type="button" className="af-spot af-spot--tap" onClick={() => toggle("torneira")}>{place === "torneira" ? "Fechar torneira" : "Torneira"}</button>
        <button type="button" className="af-spot af-spot--lamp" onClick={onLight}>{lit ? "Apagar abajur" : "Acender abajur"}</button>
      </div>
      <div className="af-kitchen">
        <button type="button" className={place === "geladeira" ? "is-on" : ""} onClick={() => toggle("geladeira")}>Geladeira</button>
        <button type="button" className={place === "armario" ? "is-on" : ""} onClick={() => toggle("armario")}>Armários</button>
        <button type="button" className={place === "torneira" ? "is-on" : ""} onClick={() => toggle("torneira")}>Torneira</button>
        <button type="button" className={lit ? "is-on" : ""} onClick={onLight}><Lamp size={14} /> Abajur</button>
      </div>
    </>
  );
}

function Films({ lit, onLight }: { lit: boolean; onLight: () => void }) {
  return <Kitchen lit={lit} onLight={onLight} />;
}

function InkSwitch({ dark, onClick }: { dark: boolean; onClick: () => void }) {
  return <button className={dark ? "af-ink is-on" : "af-ink"} type="button" onClick={onClick} aria-label="Cor das letras">Aa</button>;
}

function LightSwitch({ lit, onClick }: { lit: boolean; onClick: () => void }) {
  return <button className={lit ? "af-switch is-on" : "af-switch"} type="button" onClick={onClick} aria-pressed={lit} aria-label={lit ? "Apagar a luz" : "Acender a luz"}><span /></button>;
}

function Cover({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="af-cover" onMouseDown={onClose}>
      <div onMouseDown={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

function Scanner({ stream, onClose, onKey }: { stream: MediaStream | null; onClose: () => void; onKey: (key: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Aproxime o QR do centro.");
  const [key, setKey] = useState("");
  const sent = useRef(false);

  useEffect(() => {
    let stopped = false;
    let stopCamera = () => undefined;

    async function open() {
      const video = videoRef.current;
      if (!video) return;
      const live = stream;
      if (!live) {
        setStatus("A câmera não abriu. Digite os 44 números.");
        return;
      }
      try {
        video.srcObject = live;
        video.muted = true;
        await video.play();
        setStatus("Câmera aberta. Aponte o QR.");
        const [{ BrowserQRCodeReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserQRCodeReader(hints, { delayBetweenScanAttempts: 40, delayBetweenScanSuccess: 80 });
        const controls = await reader.decodeFromStream(live, video, (result) => {
          const text = result?.getText() || "";
          const next = accessKeyFrom(text);
          if (!next || sent.current || stopped) return;
          sent.current = true;
          onKey(text);
        });
        stopCamera = () => controls.stop();
        if (stopped) controls.stop();
      } catch {
        if (!stopped) setStatus(video.srcObject ? "A câmera abriu. Se o QR não entrar, digite os 44 números." : "A câmera não abriu. Digite os 44 números.");
      }
    }
    void open();
    return () => {
      stopped = true;
      stopCamera();
    };
  }, [onKey, stream]);

  return (
    <div className="af-sheet" role="dialog" aria-modal="true" aria-label="Ler nota">
      <header><strong>Escanear</strong><button type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></header>
      <video ref={videoRef} muted playsInline autoPlay />
      <p>{status}</p>
      <label>Chave da nota<input inputMode="numeric" value={key} placeholder="44 números" onChange={(event) => {
        const next = event.target.value.replace(/\D/g, "").slice(0, 44);
        setKey(next);
        if (next.length === 44) onKey(next);
      }} /></label>
    </div>
  );
}

async function readFiscal(key: string, raw: string) {
  const token = localStorage.getItem("alimenteFacilAuthToken");
  if (!token) return { ok: false as const, merchant: "", items: [], message: "Crie a conta para a Infosimples ler a nota." };
  const response = await fetch("/api/fiscal/consult", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ accessKey: key, chave: key, nfce: raw || key, url: /^https?:/i.test(raw) ? raw : undefined }),
  });
  let payload = await response.json().catch(() => ({} as Record<string, any>)) as Record<string, any>;
  if (response.status === 202 && payload.jobId) {
    const deadline = Date.now() + 4 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
      const poll = await fetch(`/api/fiscal/consult?jobId=${encodeURIComponent(String(payload.jobId))}&accessKey=${key}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      payload = await poll.json().catch(() => ({}));
      if (poll.status === 202) continue;
      if (!poll.ok) return { ok: false as const, merchant: "", items: [], message: cleanError(payload) };
      break;
    }
  } else if (!response.ok) {
    return { ok: false as const, merchant: "", items: [], message: cleanError(payload) };
  }
  const parsed = productsFrom(payload);
  if (!parsed.items.length) return { ok: false as const, merchant: "", items: [], message: "A nota voltou sem produtos. Escreva os itens." };
  return { ok: true as const, merchant: parsed.merchant, items: parsed.items, message: "" };
}

function cleanError(payload: Record<string, any>) {
  const raw = String(payload.error || payload.message || payload.code_message || "Não consegui ler esta nota agora.");
  return raw.replace(/infosimples|recaptcha|captcha/gi, "").replace(/\s+/g, " ").trim() || "Não consegui ler esta nota agora.";
}

function productsFrom(payload: Record<string, any>) {
  const bag = (payload.receipt || payload.nota || (Array.isArray(payload.data) ? payload.data[0] : payload.data) || payload) as Record<string, any>;
  const list = (bag.items || bag.itens || bag.produtos || payload.items || []) as Array<Record<string, any>>;
  const merchant = String(bag.merchant || bag.emitente || bag.nome_fantasia || bag.razao_social || bag.nome || "Compra");
  const items = list.map((item) => ({
    name: String(item.friendlyName || item.originalName || item.descricao || item.nome || item.name || "").trim(),
    quantity: Number(item.quantity || item.quantidade || item.qtd) || 1,
    unit: String(item.unit || item.unidade || item.un || "un"),
    unitPrice: Number(item.unitPrice || item.valor_unitario || item.vl_unit) || 0,
    total: Number(item.total || item.valor_total || item.valor || item.vl_total) || 0,
  })).filter((item) => item.name.length > 1);
  return { merchant, items };
}

export function HouseApp() {
  const [inside, setInside] = useState(false);
  const [house, setHouse] = useState<House | null>(null);
  const [room, setRoom] = useState<Room>("hoje");
  const [more, setMore] = useState(false);
  const [look, setLook] = useState<Look>("fila");
  const [filter, setFilter] = useState("Tudo");
  const [openId, setOpenId] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const [reading, setReading] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualItems, setManualItems] = useState<Line[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signed, setSigned] = useState(false);
  const [gate, setGate] = useState(false);
  const [accountMode, setAccountMode] = useState<"in" | "up">("in");
  const [person, setPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const installRef = useRef<any>(null);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [ask, setAsk] = useState("");
  const [lit, setLit] = useState(true);
  const [ink, setInk] = useState<"escura" | "clara">("escura");
  const [hello, setHello] = useState("Olá");

  useEffect(() => {
    const stored = loadHouse();
    if (stored) {
      setHouse(stored);
      setInside(stored.notes.length > 0 || stored.pantry.length > 0);
    }
    setSigned(Boolean(localStorage.getItem("alimenteFacilAuthToken")));
    setLit(localStorage.getItem("alimente-luz") !== "0");
    setInk(localStorage.getItem("alimente-tinta") === "clara" ? "clara" : "escura");
    const hour = new Date().getHours();
    setHello(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      installRef.current = event;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function commit(next: House | null, enter = true) {
    setHouse(next);
    saveHouse(next);
    if (enter) setInside(true);
  }

  async function enterAccount() {
    if (busy) return;
    if (!email.includes("@") || password.length < 4) {
      setFormError("Escreva o e-mail e uma senha de pelo menos 4 caracteres.");
      return;
    }
    setBusy(true);
    setFormError("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const path = accountMode === "up" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(path, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: person, nome: person, email, password, senha: password }),
      });
      const body = await response.json().catch(() => ({} as { token?: string; accessToken?: string; message?: string; error?: string; data?: { token?: string } }));
      const token = body.token || body.accessToken || body.data?.token;
      if (response.status === 404 && accountMode === "up") {
        setAccountMode("in");
        setFormError("Não achei o cadastro. Se a conta já existe, entre.");
        return;
      }
      if (!response.ok || !token) {
        if (accountMode === "up" && response.ok) {
          setAccountMode("in");
          setFormError("Conta criada. Agora é só entrar.");
          return;
        }
        setFormError(body.message || body.error || "Não entrou. Confira e-mail e senha.");
        return;
      }
      localStorage.setItem("alimenteFacilAuthToken", token);
      setSigned(true);
      setPassword("");
      setFormError("");
      setNotice("");
      setGate(false);
      const current = house && (house.notes.length || house.pantry.length) ? house : emptyHouse();
      commit(current);
      setRoom("hoje");
    } catch {
      setFormError("A conexão demorou. Tente de novo.");
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  }

  function installApp() {
    const event = installRef.current as { prompt?: () => Promise<void> } | null;
    if (event?.prompt) {
      void event.prompt();
      return;
    }
    setNotice("No celular, abra o menu do navegador e escolha Adicionar à tela inicial.");
  }

  function toggleInk() {
    setInk((value) => {
      const next = value === "escura" ? "clara" : "escura";
      localStorage.setItem("alimente-tinta", next);
      return next;
    });
  }

  function scene(base: string) {
    return `${base}${lit ? " is-lit" : ""}${ink === "escura" ? " is-ink" : ""}`;
  }

  function toggleLight() {
    setLit((value) => {
      const next = !value;
      localStorage.setItem("alimente-luz", next ? "1" : "0");
      return next;
    });
  }

  function wantScan() {
    if (!signed && !localStorage.getItem("alimenteFacilAuthToken")) {
      setAccountMode("up");
      setGate(true);
      setInside(false);
      return;
    }
    void openScan();
  }

  async function openScan() {
    setMore(false);
    setOpenId(null);
    try {
      const attempts = [
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        { audio: false, video: true },
      ];
      let next: MediaStream | null = null;
      for (const constraints of attempts) {
        try {
          next = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch { /* tenta a outra câmera */ }
      }
      camera?.getTracks().forEach((track) => track.stop());
      setCamera(next);
    } catch {
      setCamera(null);
    }
    setScan(true);
  }

  function closeScan() {
    camera?.getTracks().forEach((track) => track.stop());
    setCamera(null);
    setScan(false);
  }

  async function readKey(raw: string) {
    const key = accessKeyFrom(raw);
    if (key.length !== 44) return;
    const base = house ?? emptyHouse();
    if (base.notes.some((note) => note.accessKey === key)) {
      setNotice("Essa nota já está na casa.");
      setScan(false);
      setOpenId(base.notes.find((note) => note.accessKey === key)?.id ?? null);
      setInside(true);
      return;
    }
    setScan(false);
    setReading(key);
    setNotice("");
    try {
      const result = await readFiscal(key, raw);
      if (!result.ok) {
        setNotice(result.message);
        setReading("");
        return;
      }
      const note = noteFromReading(result.merchant, key, result.items, "fiscal");
      const next = { ...base, notes: [note, ...base.notes], pantry: absorb(base.pantry, note) };
      commit(next);
      setOpenId(note.id);
      setRoom("notas");
    } catch {
      setNotice("Não consegui ler esta nota agora. Você pode escrever os itens.");
    } finally {
      setReading("");
    }
  }

  function saveManual() {
    if (!manualItems.length) return;
    const base = house ?? emptyHouse();
    const note = noteFromReading(manualName.trim() || "Compra", "", manualItems.map((item) => ({
      name: item.name, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, total: item.total,
    })), "manual");
    commit({ ...base, notes: [note, ...base.notes], pantry: absorb(base.pantry, note) });
    setManual(false);
    setManualItems([]);
    setManualName("");
    setOpenId(note.id);
  }

  const note = house?.notes.find((item) => item.id === openId) ?? null;
  const categories = useMemo(() => {
    const pool = note ? note.items : house?.pantry || [];
    return ["Tudo", ...Array.from(new Set(pool.map((item) => item.category)))];
  }, [note, house]);
  const visibleLines = (note?.items || []).filter((item) => filter === "Tudo" || item.category === filter);

  if (!inside || !house) {
    return (
      <main className={scene(scan || gate ? "af-land is-cover" : "af-land")}>
        <Films lit={lit} onLight={toggleLight} />
        <header className="af-nav">
          <b>Alimente <span>Fácil</span></b>
          <div>
            <LightSwitch lit={lit} onClick={toggleLight} />
            <InkSwitch dark={ink === "escura"} onClick={toggleInk} />
            {signed && <button className="af-ghost" type="button" onClick={() => { setInside(true); setRoom("hoje"); }}>Continuar</button>}
            <button className="af-go" type="button" onClick={wantScan}><QrCode size={16} /> Escanear</button>
          </div>
        </header>
        <section className="af-hero af-hero--solo">
          <div className="af-pitch">
            <p className="af-kicker">{hello}</p>
            <h1>A nota entra.<br />A casa se organiza.</h1>
            <p>Uma compra vira despensa, lista e gasto.</p>
            <form className="af-ask" onSubmit={(event) => {
              event.preventDefault();
              if (!ask.trim()) return;
              if (!signed && !localStorage.getItem("alimenteFacilAuthToken")) {
                setAccountMode("up");
                setFormError("");
                setGate(true);
                return;
              }
              setInside(true);
              setRoom("hoje");
            }}>
              <Search size={16} />
              <input value={ask} onChange={(event) => setAsk(event.target.value)} placeholder="O que você procura?" />
            </form>
            <div className="af-hero__actions">
              <button className="af-go" type="button" onClick={wantScan}><QrCode size={18} /> Escanear nota</button>
              {!signed && <button className="af-go af-up" type="button" onClick={() => { setAccountMode("up"); setFormError(""); setGate(true); }}>Criar conta</button>}
              {!signed && <button className="af-ghost" type="button" onClick={() => { setAccountMode("in"); setFormError(""); setGate(true); }}>Entrar</button>}
              <button className="af-ghost" type="button" onClick={installApp}>Instalar</button>
            </div>
          </div>
        </section>
        {notice && <p className="af-notice">{notice}</p>}
        {gate && (
          <Cover onClose={() => { if (!busy) setGate(false); }}>
          <div className="af-sheet" role="dialog" aria-modal="true" aria-label="Entrar">
            <header><strong>{accountMode === "up" ? "Criar conta" : "Entrar"}</strong><button type="button" onClick={() => setGate(false)} aria-label="Fechar"><X size={18} /></button></header>
            <form className="af-stack" onSubmit={(event) => { event.preventDefault(); void enterAccount(); }}>
              <div className="af-look">
                <button type="button" className={accountMode === "up" ? "is-on" : ""} onClick={() => setAccountMode("up")}>Criar conta</button>
                <button type="button" className={accountMode === "in" ? "is-on" : ""} onClick={() => setAccountMode("in")}>Já tenho conta</button>
              </div>
              {accountMode === "up" && <input value={person} onChange={(event) => setPerson(event.target.value)} placeholder="Seu nome" autoComplete="name" />}
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" autoComplete="email" />
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" type="password" autoComplete={accountMode === "up" ? "new-password" : "current-password"} />
              {formError && <p className="af-notice">{formError}</p>}
              <button className="af-go" type="submit" disabled={busy}>{busy ? "Um instante" : accountMode === "up" ? "Criar conta" : "Entrar"}</button>
              <small>7 dias com 1 nota. Depois, R$ 9,90 e 10 notas.</small>
            </form>
          </div>
          </Cover>
        )}
        {scan && <Cover onClose={closeScan}><Scanner stream={camera} onClose={closeScan} onKey={(key) => void readKey(key)} /></Cover>}
        {reading && <Cover onClose={() => setReading("")}><div className="af-sheet"><header><strong>Lendo a nota</strong></header><p>{stateFromKey(reading)}</p><b>Os produtos entram em seguida.</b></div></Cover>}
      </main>
    );
  }

  const plan = allowance(house);
  const spent = house.notes.reduce((sum, item) => sum + item.total, 0);
  const soon = house.pantry.filter((item) => item.expiresAt && item.expiresAt <= new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));

  const hits = searchHouse(house, ask);

  return (
    <main className={scene(note || scan || manual || reading ? "af-shell is-cover" : "af-shell")}>
      <Films lit={lit} onLight={toggleLight} />
      <aside className="af-rail">
        <button className="af-brand" type="button" onClick={() => setInside(false)}>Alimente Fácil</button>
        <div className="af-tools">
          <LightSwitch lit={lit} onClick={toggleLight} />
          <InkSwitch dark={ink === "escura"} onClick={toggleInk} />
        </div>
        <button type="button" onClick={() => setInside(false)}>Capa</button>
        {ROOMS.map(([id, label]) => <button key={id} type="button" className={room === id ? "is-on" : ""} onClick={() => setRoom(id)}>{label}</button>)}
      </aside>
      <section className="af-stage">
        <header className="af-top">
          <div>
            <button className="af-back" type="button" onClick={() => setInside(false)} aria-label="Voltar à capa"><ArrowLeft size={16} /></button>
            <h1>{ROOMS.find(([id]) => id === room)?.[1]}</h1>
          </div>
          <div className="af-tools">
            <LightSwitch lit={lit} onClick={toggleLight} />
            <InkSwitch dark={ink === "escura"} onClick={toggleInk} />
          </div>
          <button className="af-go" type="button" onClick={wantScan}><QrCode size={16} /> Escanear</button>
        </header>
        <label className="af-ask">
          <Search size={16} />
          <input value={ask} onChange={(event) => setAsk(event.target.value)} placeholder="Busque item, nota, lista, receita ou conta" />
        </label>
        {hits.length > 0 && (
          <div className="af-hits">
            {hits.map((hit) => (
              <button type="button" key={`${hit.room}-${hit.title}-${hit.detail}`} onClick={() => { setRoom(hit.room); if (hit.noteId) { setOpenId(hit.noteId); setFilter("Tudo"); } setAsk(""); }}>
                <span>{hit.title}</span>
                <small>{hit.detail}</small>
              </button>
            ))}
          </div>
        )}
        {notice && <p className="af-notice">{notice}</p>}

        {room === "hoje" && (
          <div className="af-hoje">
            <p>{hello}. {house.pantry.length ? `A despensa tem ${house.pantry.length} ${house.pantry.length === 1 ? "item" : "itens"}.` : "A casa está vazia. Escaneie a primeira nota."}</p>
            <div className="af-facts">
              <article><small>Na despensa</small><strong>{house.pantry.length}</strong></article>
              <article><small>Perto da validade</small><strong>{soon.length}</strong></article>
              <article><small>Em notas</small><strong>{money(spent)}</strong></article>
            </div>
            {house.notes[0] && (
              <button className="af-note" type="button" onClick={() => { setOpenId(house.notes[0].id); setFilter("Tudo"); }}>
                <span>{house.notes[0].merchant}</span>
                <strong>{money(house.notes[0].total)}</strong>
                <small>{house.notes[0].items.length} produtos</small>
              </button>
            )}
          </div>
        )}

        {room === "notas" && (
          <div className="af-stack">
            <button className="af-ghost" type="button" onClick={() => setManual(true)}>Escrever compra</button>
            {house.notes.map((item) => (
              <button className="af-note" type="button" key={item.id} onClick={() => { setOpenId(item.id); setFilter("Tudo"); }}>
                <span>{item.merchant}</span><strong>{money(item.total)}</strong><small>{item.items.length} produtos</small>
              </button>
            ))}
            {!house.notes.length && <p className="af-empty">Nenhuma nota ainda.</p>}
          </div>
        )}

        {room === "despensa" && (
          <div className="af-stack">
            <label className="af-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na casa" /></label>
            <Looks look={look} onChange={setLook} />
            <Chips categories={["Tudo", ...Array.from(new Set(house.pantry.map((item) => item.category)))]} current={filter} onChange={setFilter} />
            <Lines look={look} items={house.pantry.filter((item) => (filter === "Tudo" || item.category === filter) && plain(item.name).includes(plain(query))).map((item) => ({
              id: item.id, originalName: item.name, name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, unitPrice: 0, total: 0,
            }))} />
          </div>
        )}

        {room === "listas" && <Lists house={house} onChange={commit} />}
        {room === "receitas" && <Recipes house={house} onChange={commit} />}
        {room === "plano" && <Plan house={house} onChange={commit} />}
        {room === "gastos" && <Spend house={house} />}
        {room === "conta" && (
          <div className="af-stack">
            <article className="af-glass">
              <strong>{signed ? "Conta aberta" : "Entrar"}</strong>
              <p>{plan.plan === "premium" ? `${plan.used} de 10 notas neste mês.` : plan.plan === "trial" ? `${plan.daysLeft} dias · ${plan.used} de 1 nota.` : "O teste terminou."}</p>
              <p>Escrever itens não gasta nota.</p>
              {signed ? (
                <div className="af-hero__actions">
                  <button className="af-go" type="button" onClick={() => setRoom("hoje")}>Ir para a casa</button>
                  <button className="af-ghost" type="button" onClick={() => { localStorage.removeItem("alimenteFacilAuthToken"); setSigned(false); setInside(false); }}>Sair</button>
                </div>
              ) : (
                <form className="af-stack" onSubmit={(event) => { event.preventDefault(); void enterAccount(); }}>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" autoComplete="email" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" type="password" autoComplete="current-password" />
                  <button className="af-go" type="submit">Entrar</button>
                </form>
              )}
            </article>
            <button className="af-ghost" type="button" onClick={() => setInside(false)}>Voltar à capa</button>
          </div>
        )}
      </section>

      <nav className="af-dock">
        {([
          ["hoje", "Hoje"],
          ["notas", "Notas"],
          ["despensa", "Despensa"],
          ["listas", "Lista"],
        ] as Array<[Room, string]>).map(([id, label]) => (
          <button key={id} type="button" className={room === id ? "is-on" : ""} onClick={() => { setRoom(id); setMore(false); }}>{label}</button>
        ))}
        <button type="button" className={more ? "is-on" : ""} onClick={() => setMore((value) => !value)}>Mais</button>
      </nav>
      {more && (
        <div className="af-more">
          <button type="button" onClick={() => setInside(false)}>Capa</button>
          {(["receitas", "plano", "gastos", "conta"] as Room[]).map((id) => (
            <button key={id} type="button" onClick={() => { setRoom(id); setMore(false); }}>{ROOMS.find(([key]) => key === id)?.[1]}</button>
          ))}
        </div>
      )}

      {note && (
        <Cover onClose={() => setOpenId(null)}>
          <NoteSheet note={note} look={look} filter={filter} categories={categories} lines={visibleLines} onLook={setLook} onFilter={setFilter} onClose={() => setOpenId(null)} />
        </Cover>
      )}
      {scan && <Cover onClose={closeScan}><Scanner stream={camera} onClose={closeScan} onKey={(key) => void readKey(key)} /></Cover>}
      {reading && <Cover onClose={() => setReading("")}><div className="af-sheet"><header><strong>Lendo a nota</strong><button type="button" onClick={() => setReading("")} aria-label="Fechar"><X size={18} /></button></header><p>{stateFromKey(reading)}</p><b>Os produtos entram em seguida.</b></div></Cover>}
      {manual && (
        <Cover onClose={() => setManual(false)}>
        <div className="af-sheet" role="dialog" aria-modal="true">
          <header><strong>Escrever compra</strong><button type="button" onClick={() => setManual(false)} aria-label="Fechar"><X size={18} /></button></header>
          <label>Mercado<input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Nome do mercado" /></label>
          <label>Item<input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Nome do produto" onKeyDown={(event) => {
            if (event.key !== "Enter" || !draft.trim()) return;
            setManualItems((items) => [...items, { id: uid("linha"), originalName: draft.trim(), name: draft.trim(), category: categoryFor(draft), quantity: 1, unit: "un", unitPrice: 0, total: 0 }]);
            setDraft("");
          }} /></label>
          <div className="af-fila">
            {manualItems.map((item) => <article key={item.id}><Mark name={item.name} category={item.category} /><div><strong>{item.name}</strong><small>{item.category}</small></div></article>)}
          </div>
          <button className="af-go" type="button" onClick={saveManual} disabled={!manualItems.length}>Guardar na casa</button>
        </div>
        </Cover>
      )}
    </main>
  );
}

function NoteSheet({ note, look, filter, categories, lines, onLook, onFilter, onClose }: {
  note: Note; look: Look; filter: string; categories: string[]; lines: Line[];
  onLook: (look: Look) => void; onFilter: (value: string) => void; onClose: () => void;
}) {
  return (
    <div className="af-sheet af-sheet--note" role="dialog" aria-modal="true" aria-label={note.merchant}>
      <header>
        <div><span>{note.merchant}</span><small>{note.items.length} produtos</small></div>
        <button type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      </header>
      <strong className="af-total">{money(note.total)}</strong>
      <Looks look={look} onChange={onLook} />
      <Chips categories={categories} current={filter} onChange={onFilter} />
      <div className="af-sheet__body"><Lines items={lines} look={look} /></div>
      <footer className="af-acts">
        <button type="button" className="af-wa" onClick={() => void sendWhatsApp(note)} aria-label="WhatsApp"><MessageCircle size={16} /> WhatsApp</button>
        <button type="button" className="af-file" onClick={() => downloadImage(note, "png")} aria-label="PNG"><ImageIcon size={16} /> PNG</button>
        <button type="button" className="af-file" onClick={() => downloadImage(note, "jpeg")} aria-label="JPG"><ImageIcon size={16} /> JPG</button>
        <button type="button" className="af-pdf" onClick={() => downloadPdf(note)} aria-label="PDF"><FileText size={16} /> PDF</button>
        <button type="button" className="af-print" onClick={() => window.print()} aria-label="Imprimir"><Printer size={16} /></button>
      </footer>
    </div>
  );
}

function Lists({ house, onChange }: { house: House; onChange: (house: House) => void }) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(house.lists[0]?.id || "");
  const list = house.lists.find((item) => item.id === active) || house.lists[0];
  function patch(lists: Grocery[]) { onChange({ ...house, lists }); }
  return (
    <div className="af-stack">
      <form className="af-row" onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; const next = { id: uid("lista"), name: name.trim(), items: [] }; patch([next, ...house.lists]); setActive(next.id); setName(""); }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nova lista" />
        <button className="af-go" type="submit">Criar</button>
      </form>
      <div className="af-chips">{house.lists.map((item) => <button type="button" key={item.id} className={item.id === list?.id ? "is-on" : ""} onClick={() => setActive(item.id)}>{item.name}</button>)}</div>
      {list && <ListEditor list={list} onChange={(next) => patch(house.lists.map((item) => item.id === next.id ? next : item))} />}
    </div>
  );
}

function ListEditor({ list, onChange }: { list: Grocery; onChange: (list: Grocery) => void }) {
  const [draft, setDraft] = useState("");
  function add(name: string) {
    const clean = name.trim();
    if (!clean) return;
    onChange({ ...list, items: [...list.items, { id: uid("item"), name: clean, checked: false, category: categoryFor(clean) }] });
    setDraft("");
  }
  function hear() {
    const Speech = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; start: () => void } }).webkitSpeechRecognition;
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = "pt-BR";
    rec.onresult = (event) => add(event.results[0]?.[0]?.transcript || "");
    rec.start();
  }
  return (
    <div className="af-stack">
      <form className="af-row" onSubmit={(event) => { event.preventDefault(); add(draft); }}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Item da lista" />
        <button className="af-ghost" type="button" onClick={hear} aria-label="Falar o item">Falar</button>
        <button className="af-go" type="submit">Incluir</button>
      </form>
      {list.items.map((item) => (
        <label className="af-check" key={item.id}>
          <input type="checkbox" checked={item.checked} onChange={() => onChange({ ...list, items: list.items.map((row) => row.id === item.id ? { ...row, checked: !row.checked } : row) })} />
          <Mark name={item.name} category={item.category} />
          <span>{item.name}</span>
          <button type="button" aria-label="Excluir" onClick={() => onChange({ ...list, items: list.items.filter((row) => row.id !== item.id) })}><X size={14} /></button>
        </label>
      ))}
    </div>
  );
}

function Recipes({ house, onChange }: { house: House; onChange: (house: House) => void }) {
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  return (
    <div className="af-stack">
      <form className="af-stack af-glass" onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onChange({
          ...house,
          recipes: [{ id: uid("receita"), name: name.trim(), minutes: 25, ingredients: ingredients.split(",").map((item) => item.trim()).filter(Boolean), steps: steps.split(".").map((item) => item.trim()).filter(Boolean) }, ...house.recipes],
        });
        setName(""); setIngredients(""); setSteps("");
      }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da receita" />
        <input value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="Ingredientes, separados por vírgula" />
        <input value={steps} onChange={(event) => setSteps(event.target.value)} placeholder="Modo de fazer, separado por ponto" />
        <button className="af-go" type="submit">Criar receita</button>
      </form>
      {house.recipes.map((recipe) => {
        const score = coverage(recipe, house.pantry);
        return (
          <article className="af-glass" key={recipe.id}>
            <header><CookingPot size={16} /><strong>{recipe.name}</strong><b>{recipe.ingredients.length ? Math.round((score.have / score.total) * 100) : 0}%</b></header>
            <p>{score.missing.length ? `Falta ${score.missing.join(", ")}` : "Tudo já está em casa."}</p>
            <small>{recipe.minutes} min</small>
            {!!score.missing.length && <button className="af-ghost" type="button" onClick={() => onChange({
              ...house,
              lists: [{ id: uid("lista"), name: recipe.name, items: score.missing.map((name) => ({ id: uid("item"), name, checked: false, category: categoryFor(name) })) }, ...house.lists],
            })}>Criar lista do que falta</button>}
          </article>
        );
      })}
      {!house.recipes.length && <p className="af-empty">Nenhuma receita ainda.</p>}
    </div>
  );
}

function Plan({ house, onChange }: { house: House; onChange: (house: House) => void }) {
  const [title, setTitle] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="af-stack">
      <form className="af-row" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; onChange({ ...house, meals: [{ id: uid("refeicao"), title: title.trim(), date: today, slot: "Jantar" }, ...house.meals] }); setTitle(""); }}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Refeição de hoje" />
        <button className="af-go" type="submit"><Plus size={16} /></button>
      </form>
      {house.meals.map((meal) => (
        <article className="af-note" key={meal.id}><span>{meal.slot}</span><strong>{meal.title}</strong><small>{meal.date === today ? "Hoje" : meal.date}</small><button type="button" aria-label="Tirar" onClick={() => onChange({ ...house, meals: house.meals.filter((item) => item.id !== meal.id) })}><Minus size={14} /></button></article>
      ))}
    </div>
  );
}

function Spend({ house }: { house: House }) {
  const totals = new Map<string, number>();
  house.notes.forEach((note) => note.items.forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.total)));
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;
  const spent = house.notes.reduce((sum, note) => sum + note.total, 0);
  return (
    <div className="af-stack">
      <article className="af-glass"><small>Soma das notas</small><strong className="af-total">{money(spent)}</strong></article>
      {rows.map(([category, value]) => (
        <article className="af-bar" key={category}><span>{category}</span><i style={{ transform: `scaleX(${value / max})` }} /><b>{money(value)}</b></article>
      ))}
      {!rows.length && <p className="af-empty">O gasto aparece quando uma nota entra.</p>}
    </div>
  );
}
