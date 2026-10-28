export const vertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const fragmentShader = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_anchor;
uniform vec2 u_extent;
uniform vec2 u_pointer;
uniform float u_pointerStrength;
uniform float u_variant;
uniform float u_intensity;
uniform float u_spread;
uniform float u_grain;
uniform float u_light;
uniform vec3 u_colors[6];
uniform int u_colorCount;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    f += a * noise(p);
    p = turn * p * 2.03 + 7.1;
    a *= 0.5;
  }
  return f;
}
void main() {
  vec2 uv = v_uv;
  float t = u_time;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 pointerDelta = (uv - u_pointer) * aspect;
  float influence = exp(-dot(pointerDelta, pointerDelta) * 14.0) * u_pointerStrength;
  vec2 p = uv * vec2(3.2, 2.6);
  p += vec2(-pointerDelta.y, pointerDelta.x) * influence * 0.65;
  vec2 warp = vec2(fbm(p + vec2(t * 0.34, -t * 0.2)), fbm(p + vec2(5.2, 1.3 + t * 0.28)));
  vec2 q = p + warp * 1.9;
  float n = fbm(q + vec2(-t * 0.2, t * 0.15));
  vec2 local = (uv - u_anchor) / (u_extent * u_spread);
  float distanceFromAnchor = length(local);
  // This mask is independent of turbulence: motion never spills into the content area.
  float edgeMask = 1.0 - smoothstep(0.18, 1.0, distanceFromAnchor);
  float centerMask = smoothstep(0.12, 0.38, length((uv - 0.5) * vec2(1.0, 1.1)));
  float density = 0.0;
  float colorFlow = n;
  if (u_variant < 0.5) {
    // Haze: broad, cloud-like banks with a dissolving contour.
    density = smoothstep(0.12, 0.79, n + 0.17) * 1.18;
    density *= 0.78 + 0.22 * fbm(q * 1.8 + t * 0.08);
    colorFlow = uv.x * 0.65 + warp.x * 0.65 + t * 0.012;
  } else if (u_variant < 1.5) {
    // Aurora: long, gently bending translucent curtains.
    float curtain = sin(p.x * 3.0 + warp.y * 5.0 + t * 0.3);
    density = pow(0.5 + 0.5 * curtain, 1.7) * 0.6 + n * 0.52;
    colorFlow = uv.x * 0.35 + warp.y * 0.8 + t * 0.018;
  } else if (u_variant < 2.5) {
    // Ink: a slow rotational field, with denser folded wisps.
    vec2 center = local * 1.5;
    float angle = atan(center.y + 0.001, center.x + 0.001);
    float fold = fbm(vec2(length(center) * 2.4 - t * 0.18, angle * 1.1) + warp * 2.0);
    density = smoothstep(0.14, 0.75, fold) * 1.15;
    colorFlow = fold * 0.7 + angle * 0.13 + t * 0.01;
  } else if (u_variant < 3.5) {
    // Silk: overlapping, very soft ribbons instead of cloud lobes.
    float ribbon = sin(p.y * 7.5 + warp.x * 6.0 + sin(p.x * 1.8 + t * 0.2) * 2.0);
    density = pow(0.5 + 0.5 * ribbon, 2.0) * 0.57 + n * 0.42;
    colorFlow = uv.y * 0.6 + warp.x * 0.7 + t * 0.015;
  } else {
    // Bloom: diffused overlapping pools of light, closest to a lens glow.
    vec2 drift = vec2(sin(t * 0.4), cos(t * 0.33)) * 0.1;
    float pool = exp(-dot(local + drift, local + drift) * 1.7);
    density = pool * (0.58 + n * 0.65);
    colorFlow = uv.x * 0.6 + uv.y * 0.15 + warp.x * 0.4 + t * 0.012;
  }
  // Smoothly wrap through the complete configurable palette.
  float palettePosition = fract(colorFlow) * float(u_colorCount);
  vec3 color = u_colors[0];
  for (int i = 0; i < 6; i++) {
    if (i < u_colorCount) {
      vec3 nextColor = u_colors[0];
      for (int j = 0; j < 6; j++) {
        if (j == i + 1 && j < u_colorCount) nextColor = u_colors[j];
      }
      if (palettePosition >= float(i) && palettePosition < float(i + 1)) {
        color = mix(u_colors[i], nextColor, smoothstep(0.0, 1.0, fract(palettePosition)));
      }
    }
  }
  float grain = (hash(gl_FragCoord.xy) - 0.5) * u_grain * 0.13;
  float alpha = clamp(density * edgeMask * centerMask * u_intensity * (1.0 + u_light * 0.1), 0.0, 0.85);
  color = clamp(color + grain, 0.0, 1.0);
  // Match the premultiplied-alpha drawing buffer, including exactly zero RGB at alpha=0.
  gl_FragColor = vec4(color * alpha, alpha);
}
`;
