import {StrictMode, useRef, useState} from "react";
import {createRoot, hydrateRoot} from "react-dom/client";
import {renderToString} from "react-dom/server";
import {Atmos, type AtmosProps, type SmokePosition, type SmokeVariant} from "../../src/index.js";
import {Atmos as LegacyAtmos} from "legacy-atmos";
import {Atmos as AlphaFixedAtmos} from "alpha-fixed-atmos";
import "./lab.css";

const query = new URLSearchParams(location.search);
const initialMode = query.get("mode") ?? "webgl";
const positions: SmokePosition[] = ["top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"];
const variants: SmokeVariant[] = ["haze", "aurora", "ink", "silk", "bloom"];
const surfaces = [["white", "#ffffff"], ["cream", "#faf4e8"], ["sage", "#a9bdac"], ["peach", "#edbaa2"], ["dark", "#171a21"]];
const common: AtmosProps = {
  colors: query.get("palette") === "solid" ? ["#804020", "#804020"] : ["#648d76", "#d79473", "#8d82b2", "#687da7"],
  intensity: Number(query.get("intensity") ?? 0.7), grain: Number(query.get("grain") ?? 0), speed: query.get("animate") === "1" ? 1 : 0, paused: query.get("animate") !== "1", interactive: true,
  spread: Number(query.get("spread") ?? 0.84),
};

const Decoration = ({mode, ...props}: AtmosProps & {mode: string}) => {
  if (mode === "none") return null;
  if (mode === "legacy") return <LegacyAtmos {...props} />;
  if (mode === "alpha-fixed") return <AlphaFixedAtmos {...props} />;
  return <Atmos {...props} renderMode={mode === "static" ? "static" : "auto"} />;
};

const Lab = () => {
  const [mode, setMode] = useState(initialMode);
  const [mounted, setMounted] = useState(true);
  const [config, setConfig] = useState(common);
  const [clicked, setClicked] = useState(0);
  const [tiny, setTiny] = useState(query.get("zero") === "1");
  const dialog = useRef<HTMLDialogElement>(null);
  const entries = query.get("case") === "single"
    ? [{name: "sage", surface: "#a9bdac", variant: (query.get("variant") ?? "haze") as SmokeVariant, position: (query.get("position") ?? "bottom") as SmokePosition}]
    : query.get("case") === "matrix"
    ? variants.flatMap((variant, row) => positions.map((position, column) => ({variant, position, name: `${variant}-${position}`, surface: surfaces[(row + column) % 5][1]})))
    : surfaces.map(([name, surface], index) => ({name, surface, variant: variants[index], position: (query.get("position") ?? "bottom") as SmokePosition}));
  return <>
    <header className="glass header"><strong>Atmos compatibility lab</strong><span>Sticky glass over the actual page composition</span></header>
    <nav><label>Renderer <select aria-label="Renderer" value={mode} onChange={event => setMode(event.target.value)}><option value="webgl">WebGL</option><option value="static">Static fallback</option><option value="none">No decoration</option><option value="legacy">Legacy 0.1.0</option><option value="alpha-fixed">0.1.0 + alpha fix only</option></select></label>
      <button onClick={() => setMounted(!mounted)}>Toggle mount</button>
      <button onClick={() => setTiny(!tiny)}>Toggle size</button>
      <button onClick={() => setConfig({...config, intensity: config.intensity === 0 ? 1 : 0})}>Toggle intensity</button>
      <button onClick={() => setConfig({...config, paused: !config.paused, speed: 1})}>Toggle motion</button>
      <button onClick={() => setConfig({...config, colors: ["#2244aa", "#aa3355", "#99aa22"], position: "top-right"})}>Change palette and position</button>
      <button onClick={() => dialog.current?.showModal()}>Open lightbox</button>
    </nav>
    <main className={query.get("case") === "matrix" ? "matrix" : "surfaces"}>
      {entries.map(entry => <section key={entry.name} data-surface={entry.name} className="surface" style={{background: entry.surface, height: tiny ? 0 : undefined, minHeight: tiny ? 0 : undefined}}>
        {mounted && <Decoration mode={mode} {...config} variant={entry.variant} position={config.position ?? entry.position} theme={entry.surface === "#171a21" ? "dark" : "light"} />}
        <div className="content"><h2>{entry.name}</h2><button onClick={() => setClicked(clicked + 1)}>Click through decoration: {clicked}</button><div className="glass card">Rounded glass panel</div></div>
      </section>)}
    </main>
    <aside className="glass cookies">Fixed cookie banner — compare its tint while scrolling</aside>
    <dialog ref={dialog}><h2>Lightbox</h2><button onClick={() => dialog.current?.close()}>Close lightbox</button></dialog>
  </>;
};

const root = document.getElementById("root")!;
if (query.get("hydrate") === "1") {
  root.innerHTML = renderToString(<Lab />);
  hydrateRoot(root, <StrictMode><Lab /></StrictMode>);
} else createRoot(root).render(<StrictMode><Lab /></StrictMode>);
