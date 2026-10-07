import test from 'node:test';
import assert from 'node:assert/strict';
import { ShareRestoration } from './shareRestoration.js';

const withFrameGlobals = async (callback) => {
  const saved = {
    requestAnimationFrame: globalThis.requestAnimationFrame,
    document: globalThis.document,
  };
  globalThis.requestAnimationFrame = (run) => setTimeout(() => run(0), 0);
  globalThis.document = { getElementById: () => null };
  try {
    await callback();
  } finally {
    Object.assign(globalThis, saved);
  }
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
const restoration = (initialShareState) => {
  const shown = [];
  const owner = new ShareRestoration({
    showStatus: (message) => shown.push(message),
  });
  owner._initialShareState = initialShareState;
  return { owner, shown };
};

test('a shared link with a rejected layer set says the layers were not restored', async () => {
  await withFrameGlobals(async () => {
    const { owner, shown } = restoration({ layerStateInvalid: true });
    owner._noticeRejectedShareLayers();
    owner._noticeRejectedShareLayers();
    await settle();
    assert.deepEqual(shown, [
      'Shared layers could not be restored — showing default layers',
    ]);
  });
});

test('valid or absent shared layers raise no notice', async () => {
  await withFrameGlobals(async () => {
    for (const state of [null, { layerStateInvalid: false }]) {
      const { owner, shown } = restoration(state);
      owner._noticeRejectedShareLayers();
      await settle();
      assert.deepEqual(shown, []);
    }
  });
});

test('a newer tracking notice replaces the rejected-layers notice', async () => {
  await withFrameGlobals(async () => {
    const { owner, shown } = restoration({ layerStateInvalid: true });
    owner._noticeRejectedShareLayers();
    owner._shareTrackingNoticeGeneration += 1;
    await settle();
    assert.deepEqual(shown, []);
  });
});
