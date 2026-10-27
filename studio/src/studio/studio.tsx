import {
	ArrowDown,
	ArrowRight,
	ArrowUpRight,
	Check,
	Code2,
	Focus,
	Maximize2,
	Moon,
	MousePointer2,
	Pause,
	Play,
	Sparkles,
	Sun,
	X,
} from "lucide-react";
import {useEffect, useState} from "react";

import {AmbientSmoke} from "@patrykparcheta/atmos";
import {Button} from "../components/ui/button";

import {CodeDialog} from "./code-dialog";
import {Controls, type StudioConfig} from "./controls";
import {variants} from "./presets";

const initialConfig: StudioConfig = {
	variant: "haze",
	colors: [...variants[0].colors],
	position: "bottom",
	theme: "dark",
	intensity: 0.7,
	speed: 0.6,
	spread: 0.84,
	grain: 0.35,
	interactive: true,
	paused: false,
};

export const Studio = () => {
	const [config, setConfig] = useState<StudioConfig>(initialConfig);
	const [presentation, setPresentation] = useState(false);
	const [codeOpen, setCodeOpen] = useState(false);
	useEffect(() => {
		document.documentElement.dataset.theme = config.theme;
		document.documentElement.style.colorScheme = config.theme;
	}, [config.theme]);
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setPresentation(false);
		};
		document.addEventListener("keydown", onKey);
		if (presentation) document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [presentation]);
	const activeVariant = variants.find(({id}) => id === config.variant)!;

	return (
		<div className="studio-shell">
			<header className="app-header">
				<a className="studio-name" href="#" aria-label="Atmos studio">
					Atmos
				</a>
				<div className="header-divider" />
				<span className="header-subtitle">A studio for subtle motion</span>
				<div className="header-actions">
					<span className="local-tag">
						<i /> OPEN SOURCE
					</span>
					<div className="theme-toggle" aria-label="Studio theme">
						<button
							aria-label="Light mode"
							aria-pressed={config.theme === "light"}
							onClick={() => setConfig({...config, theme: "light"})}
						>
							<Sun size={15} />
						</button>
						<button
							aria-label="Dark mode"
							aria-pressed={config.theme === "dark"}
							onClick={() => setConfig({...config, theme: "dark"})}
						>
							<Moon size={14} />
						</button>
					</div>
					<Button variant="outline" onClick={() => setCodeOpen(true)}>
						<Code2 /> Use in your project <ArrowUpRight size={12} />
					</Button>
				</div>
			</header>

			<main className="workspace">
				<div className="intro-row">
					<div>
						<div className="eyebrow">
							<span className="tiny-cross">✳</span> AMBIENT BACKGROUNDS{" "}
							<span className="version-tag">V.01</span>
						</div>
						<h1>
							Atmosphere makes a difference<span>.</span>
						</h1>
						<p>Organic motion. Your colors. Always in the background.</p>
					</div>
					<div className="intro-note">
						<span>A LITTLE MOVEMENT,</span>
						<span>A LOT OF SPACE.</span>
						<ArrowDown size={17} />
					</div>
				</div>

				<div className="workspace-grid">
					<div className="preview-column">
						<section
							className={`preview-frame ${presentation ? "presentation" : ""}`}
							aria-label="Animated background preview"
						>
							<div className="preview-toolbar">
								<div className="window-dots">
									<i />
									<i />
									<i />
								</div>
								<span className="preview-address">
									<span>↗</span> your-space.com
								</span>
								<div className="preview-toolbar-actions">
									<span className="live-indicator">
										<i className={config.paused ? "paused" : ""} />
										{config.paused ? "PAUSED" : "LIVE"}
									</span>
									<Button
										variant="ghost"
										size="icon"
										aria-label={presentation ? "Close full preview" : "Open full preview"}
										title={presentation ? "Close · Esc" : "Full preview"}
										onClick={() => setPresentation(!presentation)}
									>
										{presentation ? <X /> : <Maximize2 />}
									</Button>
								</div>
							</div>
							<div className={`preview-scene scene-${config.theme}`}>
								<AmbientSmoke {...config} />
								<div className="sample-content">
									<div className="sample-nav">
										<span className="sample-name">
											Your space
										</span>
										<span className="sample-nav-note">Less, but better.</span>
										<span className="sample-nav-menu">
											<i />
											<i />
										</span>
									</div>
									<div className="sample-hero">
										<div className="sample-eyebrow">
											<span /> A LITTLE SPACE FOR YOUR IDEAS
										</div>
										<h2>
											Leave room
											<br />
											for <em>imagination.</em>
										</h2>
										<p>
											A good background asks for nothing.
											<br />
											It lets what matters speak.
										</p>
										<button className="sample-cta" onClick={() => setPresentation(!presentation)}>
											{presentation ? "Back to the studio" : "Feel the space"}
											<ArrowUpRight size={14} />
										</button>
									</div>
									<div className="scene-bottom">
										<span>DESIGNED TO FEEL, NOT DISTRACT.</span>
										<span>01 — 05</span>
									</div>
								</div>
								<div className="cursor-hint">
									<MousePointer2 size={12} />
									<span>
										{config.interactive
											? "Move your cursor. Feel the difference."
											: "Quiet motion, without interaction."}
									</span>
								</div>
							</div>
							<div className="preview-bottom-bar">
								<div>
									<span className="preview-variant-id">0{variants.indexOf(activeVariant) + 1}</span>
									<span>{activeVariant.name}</span>
									<span className="preview-variant-detail">/ {activeVariant.tag.toLowerCase()}</span>
								</div>
								<div className="playback-controls">
									<span>{config.speed.toFixed(1)}×</span>
									<Button
										variant="ghost"
										size="icon"
										aria-label={config.paused ? "Resume animation" : "Pause animation"}
										title={config.paused ? "Resume animation" : "Pause animation"}
										onClick={() => setConfig({...config, paused: !config.paused})}
									>
										{config.paused ? <Play /> : <Pause />}
									</Button>
								</div>
							</div>
						</section>

						<section className="variants-section" aria-label="Five animation variations">
							<div className="variants-heading">
								<h2>Find your character</h2>
								<span>
									05 VARIATIONS <ArrowRight size={13} />
								</span>
							</div>
							<div className="variant-grid">
								{variants.map((variant, index) => (
									<button
										className={`variant-card ${config.variant === variant.id ? "selected" : ""}`}
										key={variant.id}
										aria-pressed={config.variant === variant.id}
										title={variant.detail}
										onClick={() => setConfig({...config, variant: variant.id})}
									>
										<div
											className={`variant-art art-${variant.id}`}
											style={
												{
													"--swatch-a": config.colors[0],
													"--swatch-b": config.colors[1],
													"--swatch-c": config.colors[2] ?? config.colors[0],
												} as React.CSSProperties
											}
										>
											<span>0{index + 1}</span>
											{config.variant === variant.id && (
												<i>
													<Check size={11} />
												</i>
											)}
											<div className="art-cloud" />
										</div>
										<div className="variant-card-label">
											<span>{variant.name}</span>
											<span>{variant.tag}</span>
										</div>
									</button>
								))}
							</div>
							<p className="variant-help">
								<Sparkles size={12} /> Different motion in every variation. Your palette stays yours.
							</p>
						</section>
					</div>
					<Controls
						config={config}
						setConfig={setConfig}
						onReset={() =>
							setConfig({...initialConfig, colors: [...initialConfig.colors], theme: config.theme})
						}
					/>
				</div>

				<footer className="app-footer">
					<span>
						<Focus size={13} /> DESIGNED TO STAY IN THE BACKGROUND.
					</span>
					<div>
						<span>React</span>
						<i />
						<span>Tailwind CSS</span>
						<i />
						<span>shadcn/ui</span>
						<i />
						<span>WebGL</span>
					</div>
					<button onClick={() => setCodeOpen(true)}>
						A little code. A lot of atmosphere. <ArrowUpRight size={12} />
					</button>
				</footer>
			</main>
			<CodeDialog open={codeOpen} onOpenChange={setCodeOpen} config={config} />
		</div>
	);
};
