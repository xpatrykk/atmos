import {Check, Plus, RotateCcw, SlidersHorizontal, X} from "lucide-react";

import {Button} from "../components/ui/button";
import {Slider} from "../components/ui/slider";
import {Switch} from "../components/ui/switch";

import {palettes, positions} from "./presets";

import type {AmbientSmokeProps} from "@xpatrykk/atmos";
import type {Dispatch, SetStateAction} from "react";

export type StudioConfig = Required<
	Pick<
		AmbientSmokeProps,
		| "colors"
		| "variant"
		| "position"
		| "theme"
		| "intensity"
		| "speed"
		| "spread"
		| "grain"
		| "interactive"
		| "paused"
	>
>;

interface ControlsProps {
	config: StudioConfig;
	setConfig: Dispatch<SetStateAction<StudioConfig>>;
	onReset: () => void;
}

export const Controls = ({config, setConfig, onReset}: ControlsProps) => {
	const update = <Key extends keyof StudioConfig>(key: Key, value: StudioConfig[Key]) =>
		setConfig((previous) => ({...previous, [key]: value}));
	return (
		<aside className="controls-panel" aria-label="Animation settings">
			<div className="panel-heading">
				<span>
					<SlidersHorizontal size={14} /> Make it yours
				</span>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Reset settings"
					title="Reset settings"
					onClick={onReset}
				>
					<RotateCcw />
				</Button>
			</div>
			<section className="control-section">
				<div className="section-label">
					<h2>Color palette</h2>
					<span>{config.colors.length} / 6</span>
				</div>
				<div className="color-list">
					{config.colors.map((color, index) => (
						<div className="color-row" key={index}>
							<label
								className="color-picker"
								style={{background: color}}
								title={`Change color ${index + 1}`}
							>
								<input
									type="color"
									aria-label={`Color ${index + 1}`}
									value={color}
									onChange={(event) =>
										update(
											"colors",
											config.colors.map((value, colorIndex) =>
												colorIndex === index ? event.target.value.toUpperCase() : value
											)
										)
									}
								/>
							</label>
							<span className="color-value">{color}</span>
							<span className="color-number">0{index + 1}</span>
							<Button
								variant="ghost"
								size="icon"
								aria-label={`Remove color ${index + 1}`}
								disabled={config.colors.length <= 2}
								onClick={() =>
									update(
										"colors",
										config.colors.filter((_, colorIndex) => colorIndex !== index)
									)
								}
							>
								<X size={12} />
							</Button>
						</div>
					))}
				</div>
				<Button
					variant="outline"
					size="sm"
					className="add-color"
					disabled={config.colors.length >= 6}
					onClick={() =>
						update("colors", [
							...config.colors,
							["#7EB6AE", "#BDA0D0", "#D5B476"][Math.max(0, config.colors.length - 3)] ?? "#83A1BD",
						])
					}
				>
					<Plus /> Add color
				</Button>
				<div className="palette-row">
					<span>Inspiration</span>
					<div className="palette-options">
						{palettes.map((palette) => (
							<button
								key={palette.name}
								className={`palette-button ${JSON.stringify(config.colors) === JSON.stringify(palette.colors) ? "active" : ""}`}
								title={palette.name}
								aria-label={`Palette ${palette.name}`}
								aria-pressed={JSON.stringify(config.colors) === JSON.stringify(palette.colors)}
								onClick={() => update("colors", [...palette.colors])}
							>
								{palette.colors.map((color) => (
									<i key={color} style={{background: color}} />
								))}
							</button>
						))}
					</div>
				</div>
			</section>

			<section className="control-section position-section">
				<div className="section-label">
					<h2>Placement</h2>
					<span>8 positions</span>
				</div>
				<div className="position-layout">
					<div className="position-grid">
						{positions.map(({id, label, arrow}) => (
							<button
								key={id}
								disabled={id === "center"}
								aria-label={label}
								title={label}
								aria-pressed={config.position === id}
								className={`position-button ${config.position === id ? "active" : ""}`}
								onClick={() => {
									if (id !== "center") update("position", id);
								}}
							>
								{arrow}
							</button>
						))}
					</div>
					<div className="position-description">
						<span>{positions.find(({id}) => id === config.position)?.label}</span>
						<p>
							Smoke at the edges.
							<br />
							Space for your content.
						</p>
					</div>
				</div>
			</section>

			<section className="control-section motion-section">
				<div className="section-label">
					<h2>Motion character</h2>
					<span>Keep it subtle</span>
				</div>
				{(
					[
						{
							key: "intensity",
							label: "Intensity",
							value: `${Math.round(config.intensity * 100)}%`,
							min: 0,
							max: 1,
							step: 0.01,
						},
						{key: "speed", label: "Speed", value: `${config.speed.toFixed(1)}×`, min: 0, max: 2, step: 0.1},
						{
							key: "spread",
							label: "Edge reach",
							value: `${Math.round(config.spread * 100)}%`,
							min: 0.2,
							max: 1,
							step: 0.01,
						},
						{
							key: "grain",
							label: "Grain",
							value: `${Math.round(config.grain * 100)}%`,
							min: 0,
							max: 1,
							step: 0.01,
						},
					] as const
				).map(({key, label, value, min, max, step}) => (
					<div className="slider-field" key={key}>
						<label id={`label-${key}`}>
							{label}
							<output>{value}</output>
						</label>
						<Slider
							aria-labelledby={`label-${key}`}
							value={[config[key]]}
							min={min}
							max={max}
							step={step}
							onValueChange={([nextValue]) => update(key, nextValue)}
						/>
					</div>
				))}
			</section>

			<section className="interaction-section">
				<div>
					<label htmlFor="interaction">Pointer interaction</label>
					<p>A gentle swirl around your cursor</p>
				</div>
				<Switch
					id="interaction"
					checked={config.interactive}
					onCheckedChange={(value) => update("interactive", value)}
				/>
			</section>
			<div className="quiet-note">
				<Check size={12} />
				<span>Your content always comes first.</span>
			</div>
		</aside>
	);
};
