import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

test('realistic city kit and sky have all local files needed at runtime',async()=>{
  const root=path.resolve('public/assets');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
  assert.ok(fs.existsSync(path.join(root,manifest.sky.slice('/assets/'.length))));
  for(const asset of Object.values(manifest.ground))assert.ok(fs.existsSync(path.join(root,asset.slice('/assets/'.length))),`missing ${asset}`);
  const model=path.join(root,manifest.building.slice('/assets/'.length));
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const kit=(await io.read(model)).getRoot();
  const names=new Set(kit.listNodes().map(node=>node.getName()));
  for(const name of ['wall_window_centered_large_01','window_centered_large_01','wall_window_centered_small_01','window_centered_small_01','wall_door_centered_small_01','door_centered_small_01','cornice_standard_standard_01']){
    assert.ok(names.has(name),`missing module ${name}`);
  }
  for(const asset of Object.values(manifest.cityProps)){
    const file=path.join(root,asset.slice('/assets/'.length));
    const prop=JSON.parse(fs.readFileSync(file));
    for(const uri of [...prop.buffers.map(buffer=>buffer.uri),...prop.images.map(image=>image.uri)]){
      assert.ok(fs.existsSync(path.join(path.dirname(file),uri)),`missing prop dependency ${uri}`);
    }
  }
});
