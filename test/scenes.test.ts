import test from 'node:test';
import assert from 'node:assert/strict';
import { useSceneStore } from '../src/store/viewerStore.ts';
test('scene selection updates the selected scene atomically and ignores invalid IDs', () => {
  const scenes = [{ id: 'one', title: 'One', image: '/one.jpg', hotspots: [] }, { id: 'two', title: 'Two', image: '/two.jpg', hotspots: [] }];
  useSceneStore.getState().setScenes(scenes);
  useSceneStore.getState().setCurrentScene('two');
  assert.equal(useSceneStore.getState().currentScene?.id, 'two');
  useSceneStore.getState().setCurrentScene('missing');
  assert.equal(useSceneStore.getState().currentSceneId, 'two');
});
import { validateScenes } from '../src/scene-manifest.ts';
test('manifest rejects traversal, duplicate hotspots, and non-text content', () => {
  const valid = {id:'one',title:'One',image:'/panoramas/one.jpg',hotspots:[]};
  assert.throws(() => validateScenes([{...valid,image:'/panoramas/../../secret'}]));
  const hotspot = {id:'info',type:'info',yaw:0,pitch:0};
  assert.throws(() => validateScenes([{...valid,hotspots:[hotspot,hotspot]}]));
  assert.throws(() => validateScenes([{...valid,description:{html:'bad'}}]));
});
