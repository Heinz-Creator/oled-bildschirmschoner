export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const limit = (value, min, max) => Math.min(max, Math.max(min, value));
// Width multiplier, jaw opening in canvas pixels, and visible upper teeth.
const mouthShapes = {
  X: [1, 0, 0], A: [.94, 0, 0], B: [1.04, 2.8, .9],
  C: [1.02, 7.4, 1.6], D: [1, 12.4, 1.8], E: [.86, 8.1, .7],
  F: [.68, 4.3, 0], G: [.94, 2.8, 1.5], H: [.96, 6.6, 1.3],
};
const smooth = value => value * value * (3 - 2 * value);

export function mouthShape(timeline, time) {
  if (!timeline) return mouthShapes.X;
  const next = timeline.findIndex(([start]) => start > time);
  if (next === -1) return mouthShapes[timeline.at(-1)[1]];
  const [start, shape] = timeline[next];
  const [previousStart, previousShape] = timeline[next - 1] ?? [0, 'X'];
  const blendTime = Math.min(.062, (start - previousStart) * .7);
  const blend = blendTime ? smooth(limit(1 - (start - time) / blendTime, 0, 1)) : 0;
  if (!blend) return mouthShapes[previousShape];
  return mouthShapes[previousShape].map((value, index) => value + (mouthShapes[shape][index] - value) * blend);
}

class Mouth {
  constructor(picture, width, height, { x, y, rx }) {
    const patch = document.createElement('canvas');
    const cx = Math.round(x * width);
    const cy = Math.round(y * height);
    this.radius = rx * width;
    this.side = Math.ceil(this.radius * 1.55);
    this.above = 22;
    this.below = 73;
    patch.width = this.side * 2 + 1;
    patch.height = this.above + this.below;
    this.x = cx - this.side;
    this.y = cy - this.above;
    const context = patch.getContext('2d');
    const sx = picture.naturalWidth / width;
    const sy = picture.naturalHeight / height;
    context.drawImage(picture, this.x * sx, this.y * sy, patch.width * sx, patch.height * sy,
      0, 0, patch.width, patch.height);
    this.source = context.getImageData(0, 0, patch.width, patch.height).data;
    this.frame = context.createImageData(patch.width, patch.height);
    this.frame.data.set(this.source);
  }

  draw(context, shape) {
    const [width, opening, teeth] = shape;
    if (opening < .08 && Math.abs(width - 1) < .005) return;
    if (this.previous === shape) {
      context.putImageData(this.frame, this.x, this.y);
      return;
    }
    this.previous = shape;
    const { side, radius, above, below, source, frame } = this;
    const stride = frame.width;
    const pixels = frame.data;
    for (let x = 1; x < stride - 1; x++) {
      const dx = x - side;
      const lip = Math.abs(dx) / (radius * width);
      const profile = Math.sqrt(Math.max(0, 1 - lip * lip));
      const seam = above - .8 + 1.6 * Math.min(1, lip * lip);
      const top = seam - opening * profile * .22;
      const bottom = seam + opening * profile * .78;
      const widthFalloff = 1 - smooth(limit((Math.abs(dx) - radius * .61) / (side - radius * .61), 0, 1));
      const jawFalloff = 1 - smooth(limit((Math.abs(dx) - radius * .35) / (side - radius * .35), 0, 1));
      for (let y = 1; y < frame.height - 1; y++) {
        const upper = y < seam;
        const verticalFalloff = 1 - smooth(limit(Math.abs(y - seam) / (upper ? above - 2 : below - 3), 0, 1));
        const sourceX = limit(x + dx * (1 / width - 1) * widthFalloff * verticalFalloff, 0, stride - 1);
        const sourceY = limit(y + (upper ? seam - top : seam - bottom - opening * .21 * jawFalloff) * verticalFalloff,
          0, frame.height - 1);
        const x0 = Math.min(stride - 2, Math.floor(sourceX));
        const y0 = Math.min(frame.height - 2, Math.floor(sourceY));
        const fx = sourceX - x0;
        const fy = sourceY - y0;
        const offset = (y * stride + x) * 4;
        const sample = (y0 * stride + x0) * 4;
        const cavity = limit(Math.min(y - top + .5, bottom - y + .5, opening * profile), 0, 1);
        const depth = limit((y - top) / Math.max(1, bottom - top), 0, 1);
        const tooth = limit(teeth * profile - (y - top), 0, .88) * profile;
        for (let c = 0; c < 3; c++) {
          const high = source[sample + c] * (1 - fx) + source[sample + 4 + c] * fx;
          const low = source[sample + stride * 4 + c] * (1 - fx) + source[sample + stride * 4 + 4 + c] * fx;
          const texture = high * (1 - fy) + low * fy;
          const shadow = c === 0 ? 23 + depth * 23 : 9 + depth * 9;
          const inside = shadow + (c === 0 ? 136 : c === 1 ? 111 : 95) * tooth;
          pixels[offset + c] = texture * (1 - cavity) + inside * cavity;
        }
      }
    }
    context.putImageData(frame, this.x, this.y);
  }
}

export class Portrait {
  constructor(canvas, avatar) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.avatar = avatar;
    this.picture = new Image();
    this.picture.src = avatar.image;
    this.since = performance.now();
  }

  draw(now, shape, speaking) {
    if (!this.picture.complete || !this.picture.naturalWidth) return;
    const { canvas, context, picture, avatar } = this;
    const width = canvas.width;
    const height = canvas.height;
    const time = (now - this.since) / 1000;
    const rest = reducedMotion.matches;
    const glance = rest ? 0 : Math.sin(time * 1.15 + 0.6) * (speaking ? 0.3 : 0.85);
    const blinkTime = (time + 2.2) % 5.4;
    const blink = rest || blinkTime > .24 ? 1 : Math.max(.05, Math.abs(blinkTime - .12) / .12);
    const turn = glance * 6;
    canvas.style.transform = `rotateY(${turn}deg) rotateZ(${turn * .15}deg) translateX(${turn * .6}px)`;
    context.clearRect(0, 0, width, height);
    context.drawImage(picture, 0, 0, width, height);
    this.mouth ??= new Mouth(picture, width, height, avatar.mouth);
    this.mouth.draw(context, avatar.mechanical ? [1, shape[1] * .58, 0] : shape);
    for (const eye of avatar.eyes) this.eye(eye, glance, blink);
  }

  eye({ x, y, rx, ry, iris }, glance, blink) {
    const { canvas, context, picture } = this;
    const w = canvas.width;
    const h = canvas.height;
    const cx = x * w;
    const cy = y * h;
    const rw = rx * w;
    const rh = ry * h;
    const ir = Math.min(iris * w * .78, rh * .8);
    const scaleX = picture.naturalWidth / w;
    const scaleY = picture.naturalHeight / h;
    if (blink < .94) {
      const shift = rh * (1 - blink);
      context.save();
      context.beginPath();
      context.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
      context.clip();
      context.drawImage(picture, (cx - rw) * scaleX, (cy - 2 * rh) * scaleY, 2 * rw * scaleX, rh * scaleY,
        cx - rw, cy - rh, 2 * rw, shift);
      context.drawImage(picture, (cx - rw) * scaleX, (cy - rh) * scaleY, 2 * rw * scaleX, 2 * rh * scaleY,
        cx - rw, cy - rh + shift, 2 * rw, Math.max(1, 2 * rh - shift));
      context.restore();
      return;
    }
    const move = glance * rw * .24;
    if (Math.abs(move) < .2) return;
    context.save();
    context.beginPath();
    context.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    context.clip();
    context.drawImage(picture, (cx - rw * 1.2) * scaleX, (cy - rh) * scaleY,
      rw * 2.4 * scaleX, rh * 2 * scaleY, cx - rw * 1.2 + move, cy - rh, rw * 2.4, rh * 2);
    const highlight = context.createRadialGradient(cx + move, cy, ir * .55, cx + move, cy, ir * 1.15);
    highlight.addColorStop(0, '#61e7ff00');
    highlight.addColorStop(.76, '#6ceaff35');
    highlight.addColorStop(1, '#61e7ff00');
    context.fillStyle = highlight;
    context.fillRect(cx + move - ir * 1.2, cy - ir * 1.2, ir * 2.4, ir * 2.4);
    context.restore();
  }
}

export function drawDial(context, x, y, radius, color, time, level) {
  context.save();
  context.translate(x, y);
  context.lineWidth = 1.2;
  context.strokeStyle = color;
  for (const ratio of [.72, .86, 1]) {
    context.globalAlpha = .28;
    context.beginPath();
    context.arc(0, 0, radius * ratio, 0, Math.PI * 2);
    context.stroke();
  }
  context.rotate(time);
  context.globalAlpha = .75;
  context.lineWidth = 2 + 3 * level;
  for (const start of [0, 2.15, 4.55]) {
    context.beginPath();
    context.arc(0, 0, radius, start, start + .55 + .45 * level);
    context.stroke();
  }
  for (let index = 0; index < 28; index++) {
    const angle = index * Math.PI / 14;
    const inner = radius * (index % 7 === 0 ? .88 : .94);
    context.globalAlpha = .48;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    context.stroke();
  }
  context.restore();
}

