import test from 'node:test';
import assert from 'node:assert/strict';
import { cappedResolutionScale, installDrawingBufferCap } from './viewer.js';

const fakeViewer = ({ width, height, scale = 1, browserResolution = true }) => {
  const sizes = [];
  const widget = {
    canvas: { clientWidth: width, clientHeight: height },
    resolutionScale: scale,
    useBrowserRecommendedResolution: browserResolution,
    resize() {
      sizes.push([
        Math.floor(this.canvas.clientWidth * this.resolutionScale),
        Math.floor(this.canvas.clientHeight * this.resolutionScale),
      ]);
    },
  };
  return { viewer: { cesiumWidget: widget }, widget, sizes };
};
const LIMITS_2048 = { maximumTextureSize: 2048, maximumRenderbufferSize: 4096 };

test('the resolution scale is capped only when a side exceeds the limit', () => {
  assert.equal(
    cappedResolutionScale({ width: 1920, height: 1080, limit: 2048 }),
    1,
  );
  assert.equal(
    cappedResolutionScale({ width: 2560, height: 1440, limit: 2048 }),
    0.8,
  );
  assert.equal(
    cappedResolutionScale({
      width: 1920,
      height: 1080,
      pixelRatio: 2,
      limit: 2048,
    }),
    2048 / 3840,
  );
  assert.equal(
    cappedResolutionScale({
      width: 1000,
      height: 800,
      requested: 0.5,
      limit: 2048,
    }),
    0.5,
  );
  assert.equal(cappedResolutionScale({ width: 0, height: 0, limit: 2048 }), 1);
  assert.equal(cappedResolutionScale({ width: 5000, height: 10 }), 1);
});

test('a 1440p canvas on a 2048 texture limit renders within the limit', () => {
  const f = fakeViewer({ width: 2560, height: 1440 });
  installDrawingBufferCap(f.viewer, { limits: LIMITS_2048 });
  f.widget.resize();
  assert.deepEqual(f.sizes.at(-1), [2048, 1152]);
});

test('the cap follows resizes and restores the requested scale', () => {
  const f = fakeViewer({ width: 3840, height: 2160 });
  const dispose = installDrawingBufferCap(f.viewer, { limits: LIMITS_2048 });
  f.widget.resize();
  assert.ok(f.sizes.at(-1)[0] <= 2048);

  f.widget.canvas.clientWidth = 1280;
  f.widget.canvas.clientHeight = 720;
  f.widget.resize();
  assert.deepEqual(f.sizes.at(-1), [1280, 720]);

  f.widget.canvas.clientWidth = 2560;
  f.widget.resize();
  dispose();
  assert.equal(f.widget.resolutionScale, 1);
});

test('a scale chosen elsewhere is kept as the request and still capped', () => {
  const f = fakeViewer({ width: 1000, height: 600 });
  installDrawingBufferCap(f.viewer, { limits: LIMITS_2048 });
  f.widget.resize();
  f.widget.resolutionScale = 0.5;
  f.widget.resize();
  assert.deepEqual(f.sizes.at(-1), [500, 300]);
  f.widget.canvas.clientWidth = 8192;
  f.widget.resize();
  assert.ok(f.sizes.at(-1)[0] <= 2048);
});

test('device pixels count when the browser-recommended resolution is off', () => {
  const f = fakeViewer({ width: 1920, height: 1080, browserResolution: false });
  installDrawingBufferCap(f.viewer, {
    limits: LIMITS_2048,
    devicePixelRatio: () => 2,
  });
  f.widget.resize();
  assert.ok(f.widget.resolutionScale * 2 * 1920 <= 2048);
});
