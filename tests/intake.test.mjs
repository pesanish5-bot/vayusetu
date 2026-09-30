import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/features.js',import.meta.url),'utf8');
const logic=source.slice(source.indexOf('function parseReadings('),source.indexOf('function applyRows('));
const context=vm.createContext({pilot:{source:'Test'}});vm.runInContext(logic,context);
const reading={timestamp:'2026-09-30T08:00:00Z',pm:168,baseline:45,sigma:20,reports:true,satellite:false,label:1};
test('rejects malformed input and unsupported evidence flags',()=>{
  for(const row of [{...reading,sigma:0},{...reading,pm:-2},{...reading,timestamp:'bad'},{...reading,reports:'yes'},{...reading,label:2}])assert.throws(()=>context.parseReadings(JSON.stringify([row])));
  assert.throws(()=>context.parseReadings('[]'));
});
test('sensor-only spikes do not become corroborated alerts',()=>{
  assert.equal(context.predict({...reading,reports:false}),false);
  assert.equal(context.predict(reading),true);
  assert.equal(context.predict({...reading,pm:48}),false);
});
test('CSV preserves negative labels and sorts readings chronologically',()=>{
  const rows=context.parseReadings('timestamp,pm,baseline,sigma,reports,satellite,label\n2026-09-30T08:02:00Z,168,45,20,true,false,1\n2026-09-30T08:01:00Z,160,45,20,false,false,0');
  assert.equal(rows[0].label,0);assert.equal(rows[0].reports,false);
  const result=context.evaluateRows(rows);assert.equal(result.rows,2);assert.equal(result.corroborated.tp,1);assert.equal(result.corroborated.fp,0);assert.equal(result.pmOnly.fp,1);
});
