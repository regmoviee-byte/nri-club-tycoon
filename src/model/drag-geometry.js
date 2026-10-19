// SVG coordinates stay independent of viewport pixels and pointer hardware.
export const DEFAULT_CHAIR_SCALE = .148;
const positive = value => Number.isFinite(value) && value > 0;
const rotate = (point, angle) => ({
  x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
  y: point.x * Math.sin(angle) + point.y * Math.cos(angle),
});

export function chairScale(rect, fallback = DEFAULT_CHAIR_SCALE) {
  const scale = rect && Math.min(rect.width / 300, rect.height / 500);
  return positive(scale) ? scale : positive(fallback) ? fallback : DEFAULT_CHAIR_SCALE;
}

export function figureAnchor(rect, frame) {
  const [vx, vy, vw, vh] = frame.split(' ').map(Number);
  if (!rect || !positive(rect.width) || !positive(rect.height) || !positive(vw) || !positive(vh)) return null;
  const scale = Math.min(rect.width / vw, rect.height / vh);
  // All three frames use preserveAspectRatio="xMidYMax meet" and root (180,190).
  return {
    x: rect.left + (rect.width - vw * scale) / 2 + (180 - vx) * scale,
    y: rect.top + rect.height - vh * scale + (190 - vy) * scale,
    scale,
  };
}

export function grabOffset(pointer, anchor) {
  return {x: (pointer.x - anchor.x) / anchor.scale, y: (pointer.y - anchor.y) / anchor.scale};
}

export function dragAnchor(pointer, offset, scale, angle = 0) {
  const point = rotate(offset, angle);
  return {x: pointer.x - point.x * scale, y: pointer.y - point.y * scale};
}

const segments = [
  ['shoulderL', 'elbowL'], ['elbowL', 'wristL'],
  ['shoulderR', 'elbowR'], ['elbowR', 'wristR'],
  ['hipL', 'kneeL'], ['kneeL', 'ankleL'],
  ['hipR', 'kneeR'], ['kneeR', 'ankleR'],
];

// Bind the painted point once, before the source changes size or pose. Keeping
// the binding in body coordinates also supports grabbing a hand or trouser leg.
export function bindGrip(pose, point) {
  if (point.y < pose.neck.y - 12) {
    return {part: 'head', ...rotate({x: point.x - pose.head.x, y: point.y - pose.head.y}, -pose.headAngle)};
  }
  if (point.y <= Math.max(pose.hipL.y, pose.hipR.y) + 24 &&
      point.x >= pose.shoulderL.x - 9 && point.x <= pose.shoulderR.x + 9) {
    return {part: 'body', ...rotate({x: point.x - pose.root.x, y: point.y - pose.root.y}, -pose.angle)};
  }
  let nearest;
  for (const [a, b] of segments) {
    const start = pose[a], end = pose[b], dx = end.x - start.x, dy = end.y - start.y;
    const length = Math.hypot(dx, dy), t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length);
    const bounded = Math.max(0, Math.min(1, t));
    const distance = Math.hypot(point.x - start.x - bounded * dx, point.y - start.y - bounded * dy);
    if (!nearest || distance < nearest.distance) nearest = {
      part: 'limb', a, b, t, normal: ((point.x - start.x) * -dy + (point.y - start.y) * dx) / length, distance,
    };
  }
  return nearest;
}

export function gripPoint(pose, grip) {
  if (grip.part === 'limb') {
    const start = pose[grip.a], end = pose[grip.b], dx = end.x - start.x, dy = end.y - start.y;
    const length = Math.max(1e-8, Math.hypot(dx, dy));
    return {x: start.x + dx * grip.t - dy / length * grip.normal, y: start.y + dy * grip.t + dx / length * grip.normal};
  }
  const head = grip.part === 'head', anchor = head ? pose.head : pose.root;
  const point = rotate(grip, head ? pose.headAngle : pose.angle);
  return {x: anchor.x + point.x, y: anchor.y + point.y};
}
