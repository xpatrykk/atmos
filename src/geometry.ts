import type {SmokePosition} from "./types.js";

export const anchors: Record<SmokePosition, [number, number]> = {
  "top-left": [0, 1], top: [0.5, 1], "top-right": [1, 1],
  left: [0, 0.5], right: [1, 0.5],
  "bottom-left": [0, 0], bottom: [0.5, 0], "bottom-right": [1, 0],
};

export const extentFor = (position: SmokePosition): [number, number] => {
  if (position === "top" || position === "bottom") return [1.08, 0.66];
  if (position === "left" || position === "right") return [0.6, 1.1];
  return [0.76, 0.78];
};
