import type {SmokePosition, SmokeVariant} from "@patrykparcheta/atmos";

export const variants: {id: SmokeVariant; name: string; detail: string; tag: string; colors: string[]}[] = [
	{
		id: "haze",
		name: "Haze",
		detail: "Soft, interweaving clouds",
		tag: "ORGANIC",
		colors: ["#D0804F", "#B45E72", "#7A70C5"],
	},
	{
		id: "aurora",
		name: "Aurora",
		detail: "Flowing curtains of light",
		tag: "LUMINOUS",
		colors: ["#5BA694", "#698BCE", "#A17AC4"],
	},
	{
		id: "ink",
		name: "Ink",
		detail: "Deep, slow-moving swirls",
		tag: "FLUID",
		colors: ["#7771CB", "#B76E9E", "#526D9E"],
	},
	{
		id: "silk",
		name: "Silk",
		detail: "Light ribbons and gentle folds",
		tag: "ETHEREAL",
		colors: ["#D29B80", "#C57896", "#9390C5"],
	},
	{
		id: "bloom",
		name: "Bloom",
		detail: "Diffused, breathing light",
		tag: "MINIMAL",
		colors: ["#C78B53", "#C1725D", "#8F80AB"],
	},
];

export const palettes = [
	{name: "Terracotta", colors: ["#D0804F", "#B45E72", "#7A70C5"]},
	{name: "Northern lights", colors: ["#5BA694", "#698BCE", "#A17AC4"]},
	{name: "Desert", colors: ["#D7AC71", "#CC7657", "#A45771"]},
	{name: "Lavender", colors: ["#8E85CF", "#BBA0D5", "#668EB3"]},
];

export const positions: {id: SmokePosition | "center"; label: string; arrow: string}[] = [
	{id: "top-left", label: "Top left corner", arrow: "↖"},
	{id: "top", label: "Top edge", arrow: "↑"},
	{id: "top-right", label: "Top right corner", arrow: "↗"},
	{id: "left", label: "Left edge", arrow: "←"},
	{id: "center", label: "The center stays clear", arrow: "·"},
	{id: "right", label: "Right edge", arrow: "→"},
	{id: "bottom-left", label: "Bottom left corner", arrow: "↙"},
	{id: "bottom", label: "Bottom edge", arrow: "↓"},
	{id: "bottom-right", label: "Bottom right corner", arrow: "↘"},
];
