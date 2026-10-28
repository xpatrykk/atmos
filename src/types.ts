export type SmokeVariant = "haze" | "aurora" | "ink" | "silk" | "bloom";
export type SmokePosition =
	"top-left" | "top" | "top-right" | "left" | "right" | "bottom-left" | "bottom" | "bottom-right";

export interface AmbientSmokeProps {
	/** Two to six hex colors. Invalid colors fall back to the default palette. */
	colors?: readonly string[];
	variant?: SmokeVariant;
	position?: SmokePosition;
	theme?: "light" | "dark";
	/** Overall opacity, from 0 to 1. */
	intensity?: number;
	/** Motion multiplier, from 0 to 2. One is intentionally very slow. */
	speed?: number;
	/** Reach from the edge, from 0.2 to 1. The center stays clear. */
	spread?: number;
	/** Fine film grain, from 0 to 1. */
	grain?: number;
	interactive?: boolean;
	paused?: boolean;
	className?: string;
	/** Use the CSS fallback without allocating a WebGL context. Default: auto. */
	renderMode?: "auto" | "static";
}
