import test from 'node:test'
import assert from 'node:assert/strict'
import { createObservation, encodeViewpoint, decodeViewpoint, readObservations } from '../src/observations'
test('saved viewpoints retain actual camera coordinates and round-trip Unicode notes', () => {
 const note=createObservation({yaw:1.2345,pitch:-.23,zoom:42},'Ridge & sky','My observation: café 🌿','note-1')
 assert.deepEqual(decodeViewpoint(encodeViewpoint(note)),{yaw:note.yaw,pitch:note.pitch,zoom:42,title:'Ridge & sky',note:'My observation: café 🌿'})
 assert.deepEqual(readObservations(JSON.stringify({version:1,observations:[note]})),[note])
})
test('unsafe camera values, unsupported payloads and malformed storage cannot become observations',()=>{
 assert.throws(()=>createObservation({yaw:NaN,pitch:0,zoom:50},'View','','x'))
 assert.throws(()=>createObservation({yaw:0,pitch:2,zoom:50},'View','','x'))
 assert.equal(decodeViewpoint('#view=1&yaw=NaN&pitch=0&zoom=30'),null)
 assert.deepEqual(readObservations('{broken'),[])
 assert.deepEqual(readObservations(JSON.stringify({version:2,observations:[]})),[])
 assert.deepEqual(readObservations(JSON.stringify({version:1,observations:[{id:'x',yaw:0,pitch:0,zoom:50,title:{html:'bad'},note:''}]})),[])
})
test('saving after corrupted storage preserves the original notebook for recovery', async()=>{
 const { persistObservations, OBSERVATIONS_KEY }=await import('../src/observations')
 const values=new Map([[OBSERVATIONS_KEY,'{original broken payload']]);const storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>{values.set(key,value)}}
 const note=createObservation({yaw:0,pitch:0,zoom:50},'A view','User note','one')
 assert.equal(persistObservations(storage,[note]),true)
 assert.equal([...values].some(([key,value])=>key.startsWith(OBSERVATIONS_KEY+'.recovery.') && value==='{original broken payload'),true)
 assert.equal(readObservations(values.get(OBSERVATIONS_KEY)!).length,1)
})
test('strict portable notebooks reject whole invalid files and merge only missing IDs within capacity',async()=>{
 const {parseNotebook,mergeNotebook,serializeNotebook}=await import('../src/observations')
 const make=(id:string)=>createObservation({yaw:.5,pitch:.1,zoom:42},id,'note',id)
 assert.deepEqual(parseNotebook(serializeNotebook([make('a')])),[make('a')])
 assert.throws(()=>parseNotebook(JSON.stringify({version:1,observations:[make('a'),make('a')]})))
 assert.throws(()=>parseNotebook('{broken'))
 assert.throws(()=>parseNotebook(JSON.stringify({version:1,observations:[null]})))
 assert.deepEqual(mergeNotebook([make('a')],[{...make('a'),note:'changed'},make('b')]),[make('a'),make('b')])
 assert.throws(()=>mergeNotebook(Array.from({length:100},(_,i)=>make('id'+i)),[make('extra')]))
})
test('edits retain identity/camera at capacity and deletions are reversible without overwriting newer IDs',async()=>{
 const {updateObservation,deleteObservation,undoObservation}=await import('../src/observations')
 const all=Array.from({length:100},(_,i)=>createObservation({yaw:.5,pitch:.1,zoom:42},'View','note','id'+i))
 const changed=updateObservation(all,'id1','Edited','new')
 assert.deepEqual(changed[1],{...all[1],title:'Edited',note:'new'})
 const deleted=deleteObservation(changed,'id1')
 assert.equal(deleted.length,99)
 assert.deepEqual(undoObservation(deleted,changed[1],1),changed)
 assert.throws(()=>undoObservation(changed,all[1],1))
 assert.throws(()=>updateObservation(all,'missing','Name',''))
})
test('confirmed clearing removes only this notebook/recoveries and reports partial failures',async()=>{
 const {clearNotebook,OBSERVATIONS_KEY}=await import('../src/observations')
 const values=new Map([[OBSERVATIONS_KEY,'notes'],[OBSERVATIONS_KEY+'.recovery.one','raw'],['unrelated-app','keep']]);const storage={get length(){return values.size},key:(index:number)=>[...values.keys()][index] || null,getItem:(key:string)=>values.get(key) ?? null,removeItem:(key:string)=>{values.delete(key)}}
 assert.deepEqual(clearNotebook(storage),{complete:true,remaining:[]});assert.equal(values.get('unrelated-app'),'keep')
 values.set(OBSERVATIONS_KEY,'notes');values.set(OBSERVATIONS_KEY+'.recovery.two','raw');const failure={...storage,get length(){return values.size},removeItem:(key:string)=>{if(key.endsWith('.two'))throw new Error('fixture failure');values.delete(key)}}
 assert.deepEqual(clearNotebook(failure),{complete:false,remaining:[OBSERVATIONS_KEY+'.recovery.two']});assert.equal(values.get('unrelated-app'),'keep')
})
