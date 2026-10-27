import type {AmbientSmokeProps, SmokePosition, SmokeVariant} from "./types.js";

const defaultColors = ["#D0804F", "#B45E72", "#7A70C5"];
const variants: readonly SmokeVariant[] = ["haze", "aurora", "ink", "silk", "bloom"];
const positions: readonly SmokePosition[] = ["top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"];

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finiteControl = (value: number | undefined, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;

const normalizeColor = (color: string) => {
  if (typeof color !== "string") return null;
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  if (/^#[\da-f]{3}$/i.test(color)) return `#${color.slice(1).split("").map((part) => part + part).join("")}`;
  return null;
};

export const resolveOptions = (props: AmbientSmokeProps) => {
  const palette = (props.colors ?? defaultColors).map(normalizeColor).filter((color): color is string => color !== null).slice(0, 6);
  return {
    colors: palette.length >= 2 ? palette : [...defaultColors],
    variant: props.variant && variants.includes(props.variant) ? props.variant : "haze" as SmokeVariant,
    position: props.position && positions.includes(props.position) ? props.position : "bottom" as SmokePosition,
    theme: props.theme === "light" ? "light" as const : "dark" as const,
    intensity: finiteControl(props.intensity, 0.65, 0, 1),
    speed: finiteControl(props.speed, 0.6, 0, 2),
    spread: finiteControl(props.spread, 0.8, 0.2, 1),
    grain: finiteControl(props.grain, 0.3, 0, 1),
    interactive: props.interactive !== false,
    paused: props.paused === true,
  };
};
