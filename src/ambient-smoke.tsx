"use client";

import {useEffect, useRef} from "react";

import {fragmentShader, vertexShader} from "./shaders.js";
import {clamp, resolveOptions} from "./resolve-options.js";

import type {AmbientSmokeProps, SmokePosition} from "./types.js";

const anchors: Record<SmokePosition, [number, number]> = {
	"top-left": [0, 1],
	top: [0.5, 1],
	"top-right": [1, 1],
	left: [0, 0.5],
	right: [1, 0.5],
	"bottom-left": [0, 0],
	bottom: [0.5, 0],
	"bottom-right": [1, 0],
};
const variantIds = {haze: 0, aurora: 1, ink: 2, silk: 3, bloom: 4};

/** Place inside a position:relative; isolation:isolate container, before the content. */
export const AmbientSmoke = (props: AmbientSmokeProps) => {
	const {className} = props;
	const resolved = resolveOptions(props);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fallbackRef = useRef<HTMLDivElement>(null);
	const optionsRef = useRef(resolved);
	const invalidateRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		optionsRef.current = resolved;
		invalidateRef.current?.();
	}, [resolved]);

	useEffect(() => {
		const resetInvalidate = () => {
			invalidateRef.current = null;
		};
		const canvas = canvasRef.current;
		if (!canvas) return resetInvalidate;
		const gl = canvas.getContext("webgl", {
			alpha: true,
			antialias: false,
			premultipliedAlpha: false,
			depth: false,
			powerPreference: "low-power",
		});
		if (!gl) {
			canvas.dataset.renderer = "fallback";
			return resetInvalidate;
		}

		let program: WebGLProgram | null = null;
		let buffer: WebGLBuffer | null = null;
		const shaders: WebGLShader[] = [];
		const dispose = () => {
			if (buffer) gl.deleteBuffer(buffer);
			if (program) gl.deleteProgram(program);
			shaders.forEach((shader) => gl.deleteShader(shader));
		};
		try {
			program = gl.createProgram();
			if (!program) throw new Error("WebGL program unavailable");
			for (const [type, source] of [
				[gl.VERTEX_SHADER, vertexShader],
				[gl.FRAGMENT_SHADER, fragmentShader],
			] as const) {
				const shader = gl.createShader(type);
				if (!shader) throw new Error("WebGL shader unavailable");
				shaders.push(shader);
				gl.shaderSource(shader, source);
				gl.compileShader(shader);
				if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
					throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
				gl.attachShader(program, shader);
			}
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Shader link failed");
			gl.useProgram(program);
			buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
				gl.STATIC_DRAW
			);
			const attribute = gl.getAttribLocation(program, "a_position");
			gl.enableVertexAttribArray(attribute);
			gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
		} catch (error) {
			console.warn("AmbientSmoke: using static gradient fallback.", error);
			canvas.dataset.renderer = "fallback";
			dispose();
			return resetInvalidate;
		}

		canvas.dataset.renderer = "webgl";
		if (fallbackRef.current) fallbackRef.current.style.display = "none";
		const uniform = (name: string) => gl.getUniformLocation(program!, name);
		const locations = Object.fromEntries(
			[
				"u_time",
				"u_resolution",
				"u_anchor",
				"u_extent",
				"u_pointer",
				"u_pointerStrength",
				"u_variant",
				"u_intensity",
				"u_spread",
				"u_grain",
				"u_light",
				"u_colors[0]",
				"u_colorCount",
			].map((name) => [name, uniform(name)])
		);
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let frameId = 0;
		let previousTime = 0;
		let phase = 2.4;
		let inView = true;
		let contextLost = false;
		const pointer = {x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, strength: 0, targetStrength: 0};

		const render = (now: number) => {
			frameId = 0;
			if (document.hidden || !inView || contextLost) {
				previousTime = 0;
				return;
			}
			const options = optionsRef.current;
			const moving = !options.paused && !reducedMotion.matches;
			const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.08) : 0;
			// Cap at 30 fps: deliberately slow motion does not need a 120 Hz render loop.
			if (moving && previousTime && delta < 1 / 30) {
				frameId = requestAnimationFrame(render);
				return;
			}
			previousTime = now;
			if (moving) phase += delta * clamp(options.speed ?? 0.6, 0, 2) * 0.12;
			const rect = canvas.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1400 / rect.width, 1000 / rect.height);
			const width = Math.max(1, Math.round(rect.width * ratio));
			const height = Math.max(1, Math.round(rect.height * ratio));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
				gl.viewport(0, 0, width, height);
			}
			const position = options.position ?? "bottom";
			const anchor = anchors[position];
			let extent: [number, number] = [0.76, 0.78];
			if (position === "bottom" || position === "top") extent = [1.08, 0.66];
			if (position === "left" || position === "right") extent = [0.6, 1.1];
			const palette = options.colors;
			const channels = new Float32Array(18);
			for (let index = 0; index < 6; index += 1) {
				const color = palette[index % palette.length].slice(1);
				channels[index * 3] = parseInt(color.slice(0, 2), 16) / 255;
				channels[index * 3 + 1] = parseInt(color.slice(2, 4), 16) / 255;
				channels[index * 3 + 2] = parseInt(color.slice(4, 6), 16) / 255;
			}
			if (moving) {
				pointer.x += (pointer.targetX - pointer.x) * 0.045;
				pointer.y += (pointer.targetY - pointer.y) * 0.045;
				pointer.strength += (pointer.targetStrength - pointer.strength) * 0.04;
			}
			gl.uniform1f(locations.u_time, phase);
			gl.uniform2f(locations.u_resolution, width, height);
			gl.uniform2fv(locations.u_anchor, anchor);
			gl.uniform2fv(locations.u_extent, extent);
			gl.uniform2f(locations.u_pointer, pointer.x, pointer.y);
			gl.uniform1f(
				locations.u_pointerStrength,
				options.interactive !== false && !reducedMotion.matches ? pointer.strength : 0
			);
			gl.uniform1f(locations.u_variant, variantIds[options.variant ?? "haze"]);
			gl.uniform1f(locations.u_intensity, clamp(options.intensity ?? 0.65, 0, 1));
			gl.uniform1f(locations.u_spread, clamp(options.spread ?? 0.8, 0.2, 1));
			gl.uniform1f(locations.u_grain, clamp(options.grain ?? 0.3, 0, 1));
			gl.uniform1f(locations.u_light, options.theme === "light" ? 1 : 0);
			gl.uniform1i(locations.u_colorCount, palette.length);
			gl.uniform3fv(locations["u_colors[0]"], channels);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			if (moving && (options.speed ?? 0.6) > 0) frameId = requestAnimationFrame(render);
		};
		const invalidate = () => {
			if (!frameId && !contextLost) frameId = requestAnimationFrame(render);
		};
		invalidateRef.current = invalidate;
		const onPointerMove = (event: PointerEvent) => {
			if (optionsRef.current.interactive === false || reducedMotion.matches || event.pointerType === "touch")
				return;
			const rect = canvas.getBoundingClientRect();
			pointer.targetX = (event.clientX - rect.left) / rect.width;
			pointer.targetY = 1 - (event.clientY - rect.top) / rect.height;
			pointer.targetStrength =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom
					? 1
					: 0;
			invalidate();
		};
		const onPointerLeave = () => {
			pointer.targetStrength = 0;
			invalidate();
		};
		const onVisibility = () => {
			previousTime = 0;
			invalidate();
		};
		const onContextLost = (event: Event) => {
			event.preventDefault();
			contextLost = true;
			cancelAnimationFrame(frameId);
			frameId = 0;
			canvas.dataset.renderer = "fallback";
			if (fallbackRef.current) fallbackRef.current.style.display = "block";
		};
		const resizeObserver = new ResizeObserver(invalidate);
		resizeObserver.observe(canvas);
		const intersectionObserver = new IntersectionObserver(([entry]) => {
			inView = entry.isIntersecting;
			previousTime = 0;
			invalidate();
		});
		intersectionObserver.observe(canvas);
		document.addEventListener("pointermove", onPointerMove, {passive: true});
		document.addEventListener("pointerleave", onPointerLeave);
		document.addEventListener("visibilitychange", onVisibility);
		reducedMotion.addEventListener("change", onVisibility);
		canvas.addEventListener("webglcontextlost", onContextLost);
		invalidate();

		return () => {
			cancelAnimationFrame(frameId);
			invalidateRef.current = null;
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerleave", onPointerLeave);
			document.removeEventListener("visibilitychange", onVisibility);
			reducedMotion.removeEventListener("change", onVisibility);
			canvas.removeEventListener("webglcontextlost", onContextLost);
			dispose();
		};
	}, []);

	const {position, colors: palette, intensity, spread} = resolved;
	const anchor = anchors[position];
	const origin = `${anchor[0] * 100}% ${(1 - anchor[1]) * 100}%`;
	return (
		<div
			aria-hidden="true"
			className={className}
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 0,
				pointerEvents: "none",
				overflow: "hidden",
				borderRadius: "inherit",
			}}
		>
			<div
				ref={fallbackRef}
				style={{
					position: "absolute",
					inset: 0,
					opacity: clamp(intensity ?? 0.65, 0, 1),
					background: `radial-gradient(ellipse at ${origin}, ${palette[0]}99, ${palette[1]}55 24%, transparent 58%)`,
					maskImage: `radial-gradient(ellipse at ${origin}, black, transparent ${clamp(spread ?? 0.8, 0.2, 1) * 80}%), radial-gradient(ellipse at center, transparent 13%, black 38%)`,
					maskComposite: "intersect",
				}}
			/>
			<canvas ref={canvasRef} style={{width: "100%", height: "100%", display: "block"}} />
		</div>
	);
};
