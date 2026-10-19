export function createCamera(width, height, worldWidth, worldHeight) {
  const camera = { width, height, worldWidth, worldHeight, x: worldWidth / 2, y: worldHeight / 2, scale: 1, fitScale: 1 };
  fitCamera(camera, width, height);
  return camera;
}
export function fitCamera(camera, width = camera.width, height = camera.height) {
  camera.width = width; camera.height = height;
  camera.fitScale = Math.min(width / camera.worldWidth, height / camera.worldHeight);
  camera.scale = camera.fitScale;
  camera.x = camera.worldWidth / 2; camera.y = camera.worldHeight / 2;
}
export function worldToScreen(camera, point) { return { x: (point.x - camera.x) * camera.scale + camera.width / 2, y: (point.y - camera.y) * camera.scale + camera.height / 2 }; }
export function screenToWorld(camera, point) { return { x: (point.x - camera.width / 2) / camera.scale + camera.x, y: (point.y - camera.height / 2) / camera.scale + camera.y }; }
export function zoomCamera(camera, factor, anchor) {
  const worldBefore = screenToWorld(camera, anchor);
  camera.scale = Math.max(camera.fitScale, Math.min(camera.fitScale * 2.8, camera.scale * factor));
  const worldAfter = screenToWorld(camera, anchor);
  camera.x += worldBefore.x - worldAfter.x; camera.y += worldBefore.y - worldAfter.y;
  clampCamera(camera);
}
export function panCamera(camera, dx, dy) { camera.x -= dx / camera.scale; camera.y -= dy / camera.scale; clampCamera(camera); }
function clampCamera(camera) {
  const marginX = camera.width / (camera.scale * 2), marginY = camera.height / (camera.scale * 2);
  camera.x = marginX >= camera.worldWidth / 2 ? camera.worldWidth / 2 : Math.max(marginX, Math.min(camera.worldWidth - marginX, camera.x));
  camera.y = marginY >= camera.worldHeight / 2 ? camera.worldHeight / 2 : Math.max(marginY, Math.min(camera.worldHeight - marginY, camera.y));
}

// Small DOM-free pointer state machine: same thresholds and cancellation for
// mouse, pen and touch. A second finger cancels a drag before camera gestures.
export class PointerGesture {
  constructor(callbacks) { this.callbacks = callbacks; this.pointers = new Map(); this.mode = 'idle'; }
  down(event, targetId = null) {
    if (event.button != null && event.button !== 0) return;
    const point = { x: event.x, y: event.y };
    this.pointers.set(event.id, point);
    if (this.pointers.size > 1) {
      if (this.mode === 'dragging') this.callbacks.cancel?.();
      this.mode = 'pinch'; this.pinch = this.pinchState(); return;
    }
    this.firstId = event.id; this.start = point; this.last = point; this.targetId = targetId; this.mode = 'pending';
  }
  move(event) {
    if (!this.pointers.has(event.id)) return;
    const point = { x: event.x, y: event.y };
    this.pointers.set(event.id, point);
    if (this.mode === 'pinch') {
      const next = this.pinchState();
      if (this.pinch && next) {
        this.callbacks.pan?.(next.x - this.pinch.x, next.y - this.pinch.y);
        this.callbacks.zoom?.(next.distance / Math.max(1, this.pinch.distance), { x: next.x, y: next.y });
      }
      this.pinch = next; return;
    }
    if (event.id !== this.firstId) return;
    if (this.mode === 'pending' && Math.hypot(point.x - this.start.x, point.y - this.start.y) >= 7) {
      this.mode = this.targetId ? 'dragging' : 'panning';
      if (this.targetId) this.callbacks.begin?.(this.targetId);
    }
    if (this.mode === 'dragging') this.callbacks.drag?.(point);
    if (this.mode === 'panning') this.callbacks.pan?.(point.x - this.last.x, point.y - this.last.y);
    this.last = point;
  }
  up(event) {
    if (!this.pointers.has(event.id)) return;
    const point = { x: event.x, y: event.y };
    if (this.mode === 'pending') this.callbacks.select?.(this.targetId, point);
    else if (this.mode === 'dragging') this.callbacks.drop?.(point);
    this.pointers.delete(event.id);
    if (!this.pointers.size || this.mode === 'pinch') this.reset();
  }
  cancel() { if (this.mode === 'dragging') this.callbacks.cancel?.(); this.reset(); }
  reset() { this.pointers.clear(); this.mode = 'idle'; this.pinch = null; this.targetId = null; }
  pinchState() {
    const points = [...this.pointers.values()];
    if (points.length < 2) return null;
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2, distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) };
  }
}
