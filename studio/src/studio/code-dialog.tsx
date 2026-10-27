import * as Dialog from "@radix-ui/react-dialog";
import {Check, CheckCheck, Copy, Download, X} from "lucide-react";
import {useState} from "react";

import {Button} from "../components/ui/button";
import type {StudioConfig} from "./controls";

export const CodeDialog = ({open, onOpenChange, config}: {open: boolean; onOpenChange: (open: boolean) => void; config: StudioConfig}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const snippet = `import { Atmos } from "@patrykparcheta/atmos";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden ${config.theme === "dark" ? "bg-[#111112] text-white" : "bg-[#faf9f6] text-[#252521]"}">
      <Atmos
        variant="${config.variant}"
        colors={${JSON.stringify(config.colors)}}
        position="${config.position}"
        theme="${config.theme}"
        intensity={${Number(config.intensity.toFixed(2))}}
        speed={${Number(config.speed.toFixed(1))}}
        spread={${Number(config.spread.toFixed(2))}}
        grain={${Number(config.grain.toFixed(2))}}
        interactive={${config.interactive}}
      />
      <div className="relative z-10">
        {/* Your content */}
      </div>
    </main>
  );
}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {setCopyError(true);}
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([snippet], {type: "text/plain;charset=utf-8"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = "atmos-example.tsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="code-dialog">
        <div className="dialog-header"><div><span className="eyebrow">TAKE THE ATMOSPHERE WITH YOU</span><Dialog.Title>A little component. Your own atmosphere.</Dialog.Title></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close code"><X /></Button></Dialog.Close></div>
        <Dialog.Description>Install Atmos in your React project, then copy your configuration below. The component only needs React. Tailwind classes in this example are optional.</Dialog.Description>
        <pre className="install-command"><code>npm install @patrykparcheta/atmos</code></pre>
        <div className="code-toolbar"><span>your-page.tsx</span><Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy example"}</Button></div>
        <pre className="code-block" tabIndex={0}><code>{snippet}</code></pre>
        {copyError && <p role="status" className="copy-error">Clipboard access was blocked. Select the example and copy it manually.</p>}
        <div className="dialog-footer"><span><CheckCheck size={14} /> React · TypeScript · Next.js</span><Button onClick={download}><Download />{downloaded ? "Download again .tsx" : "Download example .tsx"}</Button></div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  );
};
