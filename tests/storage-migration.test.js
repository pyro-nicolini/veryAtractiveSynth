import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('storage v2 has migration path and separates audio from metadata',()=>{
 const source=readFileSync(new URL('../src/project-store.js',import.meta.url),'utf8');
 assert.match(source,/VERSION=2/);
 assert.match(source,/createObjectStore\('audio'\)/);
 assert.match(source,/record\.format!==2/);
 assert.match(source,/if\(!req\.result\)audio\.put\(pcmFor/);
 assert.match(source,/bufferCache=new Map/);
});
