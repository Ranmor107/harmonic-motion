// Paper pigment from the standalone Ink Studies; fixed seeded fields, absolute song time.
export const inkVertex = `#version 300 es
      precision highp float;
      in vec2 aCorner;
      in vec4 aStamp;
      in vec4 aStyle;
      in vec4 aLife;
      uniform vec2 uSize; uniform float uOffset;
      uniform float uTime;
      out vec2 vLocal;
      out vec2 vPaper;
      flat out vec4 vStyle;
      flat out vec4 vLife;
      flat out float vBorn;
      void main() {
        float angle = aStyle.w;
        vec2 p = aCorner * aStamp.z * vec2(aStyle.z, 1.0);
        p = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * p;
        vec2 position = aStamp.xy + p;
        float landing = (1. - step(.5, aLife.y)) * (1. - smoothstep(0., .095, uTime - aStamp.w));
        position.y -= landing * aStamp.z * .18;
        gl_Position = vec4(position / uSize * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
        vLocal = aCorner;
        vPaper = position + vec2(uOffset, 0.);
        vStyle = aStyle;
        vLife = aLife;
        vBorn = aStamp.w;
      }`
export const inkFragment = `#version 300 es
      precision highp float;
      in vec2 vLocal;
      in vec2 vPaper;
      flat in vec4 vStyle;
      flat in vec4 vLife;
      flat in float vBorn;
      uniform float uTime;
      uniform float uFade; uniform float uEffects;
      out vec4 color;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }
      float field(vec2 p) { return .58 * noise(p) + .28 * noise(p * 2.07) + .14 * noise(p * 4.17); }
      void main() {
        float age = uTime - vBorn;
        if (age < 0.) discard;
        float isBrush = step(.5, vLife.y) * (1. - step(1.5, vLife.y));
        float isWash = step(1.5, vLife.y);
        float released = max(0., age - vLife.x);
        float dry = smoothstep(.14, 2.5 + vLife.x * .35, released);
        float remembered = 1. - smoothstep(3.8 + vLife.w * 2., 8. + vLife.w * 6., released);
        vec2 p = vLocal;
        float seed = vStyle.x * 71.7;
        float grain = noise(vPaper * 1.9);
        float fiber = field(vPaper * vec2(.16, .91));
        float cloud = field(p * 4.1 + seed);
        float branch = noise(p * vec2(19., 31.) + seed);
        float radius = length(p);
        float theta = atan(p.y, p.x);
        float lobes = (.075 * sin(theta * 3. + seed) + .04 * sin(theta * 7. - seed)) * smoothstep(.1, .55, radius);
        float contour = radius + lobes + (cloud - .5) * .32 * smoothstep(.02,.3,radius)
                      + (branch - .5) * .09 * smoothstep(.04,.45,radius);

        // The wet front travels across a FIXED paper field. It is not a scaled fuzzy disc.
        float rate = mix(1.9, .8, smoothstep(.22, 2.3, vLife.x));
        float spread = (1. - exp(-max(age - .075, 0.) * rate)) * uEffects;
        float front = .065 + mix(.71, .52, isBrush) * spread;
        float wick = smoothstep(.51, .77, fiber) * .075 * spread;
        float wet = 1. - smoothstep(front - .075, front + .014 + wick, contour);
        float rim = exp(-abs(contour - front + .035) * 38.) * smoothstep(.25, .7, cloud);
        float middle = 1. - smoothstep(.065, .26 + spread * .11, contour);

        // Compact pigment deposit; the translucent body occupies most of the mark.
        float coreRadius = mix(.115, .17, isBrush) * (.66 + vStyle.y * .55);
        float core = (1. - smoothstep(coreRadius * .25, coreRadius, contour)) * (1. - isWash);
        float dryGrain = mix(.72 + grain * .28, .16 + smoothstep(.25, .68, fiber) * .84, dry);
        float pools = smoothstep(.37, .71, field(vPaper * .052 + seed));
        float bristles = mix(1., mix(.56, .055, vLife.z) + (1. - mix(.56, .055, vLife.z)) * smoothstep(.3, .68, fiber), isBrush);
        float water = 1. - isBrush * vLife.z * .54;
        float alpha = wet * mix(.14, .045, dry) * (.34 + cloud * 1.12) * water
                    + wet * pools * .115 * (1. - dry * .68) * (.4 + fiber) * water
                    + rim * .10 * spread * (1. - dry * .6) * water
                    + middle * .12 * (1. - dry * .6) * (1. - isWash) * smoothstep(.025, .22, age)
                    + core * mix(.79, .34, dry) * dryGrain * bristles;
        alpha *= (.20 + .88 * vStyle.y) * (.88 + grain * .12);
        alpha *= smoothstep(0., .018, age) * uFade * remembered;
        if (alpha < .003) discard;
        color = vec4(.095, .145, .14, min(alpha, .88));
      }`
