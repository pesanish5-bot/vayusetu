const cityConfig = {
  bengaluru:{name:'Bengaluru',area:'Peenya Industrial Area',node:'KA-BLR-01',lat:13.0298,lon:77.5197,aqi:78,agency:'KSPCB'},
  delhi:{name:'Delhi NCR',area:'Narela Industrial Area',node:'DL-NCR-01',lat:28.8527,lon:77.0929,aqi:146,agency:'DPCC'},
  mumbai:{name:'Mumbai MMR',area:'Taloja Industrial Area',node:'MH-MMR-01',lat:19.069,lon:73.099,aqi:92,agency:'MPCB'},
  hyderabad:{name:'Hyderabad',area:'Patancheru Industrial Area',node:'TS-HYD-01',lat:17.531,lon:78.264,aqi:85,agency:'TSPCB'}
};
const pilot={records:[],incident:null,source:'Scenario',rows:[],loading:false};
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateText=value=>new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
async function api(path,options={}){
  const response=await fetch('/api/'+path,{...options,headers:{'content-type':'application/json',...options.headers}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;
}
async function createRecord(kind,payload,city=state.city){return api('records',{method:'POST',body:JSON.stringify({city,kind,payload})});}
function download(name,text,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.head.insertAdjacentHTML('beforeend',`<style>
  .topbar{height:auto;min-height:68px;flex-wrap:wrap;gap:10px;padding:10px 18px}.view-btn{padding:10px 8px}.top-meta{gap:7px}.top-meta .demo-pill{display:none}.city-btn{padding:8px}.workspace{height:calc(100vh - 95px)}
  .pilot-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.pilot-note{color:var(--muted);font-size:13px;line-height:1.5}.pilot-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pilot-card{border:1px solid var(--line);border-radius:14px;padding:16px;background:#09191e;min-width:0}.pilot-card h3{margin:0 0 8px;font-size:16px}.pilot-card input,.pilot-card textarea{font-size:14px}.record-list{display:grid;gap:9px;margin-top:12px}.record-item{border:1px solid var(--line);border-radius:10px;padding:12px;font-size:14px}.record-item small{display:block;color:var(--muted);margin:5px 0;font-size:12px}.record-item img{max-width:140px;max-height:100px;border-radius:8px}.record-item button{margin-right:8px;margin-top:8px}.pilot-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}.pilot-table th,.pilot-table td{text-align:left;padding:9px;border-bottom:1px solid var(--line)}.pilot-chart{width:100%;height:145px;margin-top:10px}.pilot-error{color:#ff9994;min-height:20px;font-size:13px}.geo-frame{width:100%;height:290px;border:1px solid var(--line);border-radius:12px;margin-top:10px}.pilot-wide{grid-column:1/-1}.pilot-status{padding:8px 10px;border:1px solid var(--line);border-radius:8px;color:var(--cyan);font-size:12px}.map-column{min-width:0}.facility-list[hidden],.zones[hidden]{display:none}.priority-banner b{white-space:normal}.scenario-badge{max-width:100px}.pilot-card label{display:block;font-size:14px}.directive i{background:var(--faint);box-shadow:none}.alternatives{display:none}
  @media(max-width:980px){.workspace{height:auto}.top-meta .live-pill{display:none}.view-nav{overflow:auto}.pilot-grid{grid-template-columns:1fr}.map-column{height:660px}}
  @media(max-width:620px){.view-nav{display:flex;width:100%;margin:0}.brand-sub{display:none}.city-tabs{overflow:auto;max-width:calc(100vw - 100px)}.city-btn{font-size:12px;white-space:nowrap}.top-meta{display:none}.pilot-card{padding:12px}.pilot-table{font-size:12px}.modal{padding:10px}.pilot-actions button{flex:1}.workspace{height:auto}}
</style>`);
document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="pilotModal"><div class="modal-card wide-modal"><div class="modal-head"><div><span class="eyebrow">Pilot workspace</span><h2>Evidence, records & evaluation</h2></div><button class="close" id="closePilot" aria-label="Close pilot tools">×</button></div><div class="form"><div class="pilot-status" id="storageStatus">Connecting to saved records…</div><div class="pilot-grid">
  <section class="pilot-card"><h3>Sensor data intake</h3><p class="pilot-note">Import a JSON array or CSV with timestamp, pm, baseline, sigma, reports, satellite, and optional label (0 or 1). Reports and satellite are booleans. Readings use µg/m³.</p><label>Reading file<input type="file" id="sensorFile" accept=".json,.csv"></label><label>Or paste readings<textarea id="sensorText" placeholder='[{"timestamp":"2026-09-30T08:32:00Z","pm":168,"baseline":45,"sigma":20,"reports":true,"satellite":false,"label":1}]'></textarea></label><div class="pilot-actions"><button class="secondary" id="sampleSensors">Load synthetic sample</button><button class="primary" id="importSensors">Validate & save</button></div><div id="sensorError" class="pilot-error" role="status"></div><div id="sensorSummary" class="pilot-note">No sensor dataset loaded.</div><svg id="sensorChart" class="pilot-chart" viewBox="0 0 500 145" role="img" aria-label="Imported PM2.5 time series"></svg></section>
  <section class="pilot-card"><h3>Detection evaluation</h3><p class="pilot-note">Compare the corroborated rule with a PM2.5-only threshold (≥150 µg/m³) on the labeled rows you supply. Synthetic samples measure rule behavior, not real-world accuracy.</p><div id="evaluationResult" class="pilot-note">Load labeled readings to calculate precision, recall and false positives.</div><div class="pilot-actions"><button class="secondary" id="exportEvaluation">Export evaluation</button></div><h3 style="margin-top:20px">Save the current case</h3><p class="pilot-note">Save current signals, source labels and response progress. The dossier is an operator review document.</p><div class="pilot-actions"><button class="primary" id="saveIncident">Save incident</button><button class="secondary" id="downloadDossier">Download dossier</button></div><div id="caseError" class="pilot-error" role="status"></div></section>
  <section class="pilot-card pilot-wide"><h3 id="geoTitle">Geographic context</h3><p class="pilot-note">Street map of the selected corridor. The command map remains a scenario diagram; its plume is an illustrative projection.</p><iframe id="geoMap" class="geo-frame" title="OpenStreetMap geographic corridor" loading="lazy" referrerpolicy="no-referrer"></iframe><a id="geoLink" target="_blank" rel="noopener noreferrer" style="color:var(--cyan);font-size:13px">Open full geographic map</a></section>
  <section class="pilot-card pilot-wide"><div class="section-title"><h3>Saved city records</h3><button class="secondary" id="refreshRecords">Refresh</button></div><div id="savedRecords" class="record-list">Loading…</div></section>
  <section class="pilot-card pilot-wide"><h3>Pilot feedback</h3><p class="pilot-note">Record a resident or operator observation, without personal identifiers, to document what needs improvement.</p><label>Observation<textarea id="feedbackText" maxlength="3000" placeholder="What helped? What was unclear? What action would you take?"></textarea></label><button class="secondary" id="saveFeedback" style="margin-top:10px">Save feedback</button><div id="feedbackStatus" class="pilot-error" role="status"></div></section>
</div></div></div></div>`);
$('.demo-cta').insertAdjacentHTML('beforeend','<button class="secondary" id="mapPilotBtn">Import sensors</button>');
$('.source-note').insertAdjacentHTML('beforebegin','<div class="pilot-actions"><button class="secondary" id="historyBtn">Incident history</button><button class="secondary" id="quickDossier">Evidence dossier</button></div>');
$('#reportForm').insertAdjacentHTML('beforeend','<p class="pilot-note">Submitted descriptions and optional photos are saved in this private Site. Keep personal identifiers out of reports.</p><div id="reportSaveStatus" class="pilot-error" role="status"></div>');
const openPilot=()=>{$('#pilotModal').classList.add('open');updateGeo();loadRecords();};
['pilotViewBtn','mapPilotBtn','historyBtn'].forEach(id=>$('#'+id).addEventListener('click',openPilot));
$('#closePilot').addEventListener('click',()=>$('#pilotModal').classList.remove('open'));
$('#pilotModal').addEventListener('click',e=>{if(e.target.id==='pilotModal')$('#pilotModal').classList.remove('open');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#pilotModal').classList.remove('open');});

function updateGeo(){
  const c=cityConfig[state.city];$('#geoTitle').textContent=c.area+' · '+c.name;
  const bbox=[c.lon-.045,c.lat-.035,c.lon+.045,c.lat+.035].join(',');
  const src=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${c.lat},${c.lon}`;
  if($('#geoMap').getAttribute('src')!==src)$('#geoMap').src=src;
  $('#geoLink').href=`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=14/${c.lat}/${c.lon}`;
}
switchCity=function(city){
  if(!Object.hasOwn(cityConfig,city))return;
  clearTimeout(state.timer);stopReplay();$('#demoProgress').classList.remove('show');
  state.city=city;pilot.incident=null;pilot.source='Scenario';pilot.rows=[];resetSignals();
  const c=cityConfig[city];$$('.city-btn').forEach(b=>b.classList.toggle('active',b.dataset.city===city));
  $('#mapCity').textContent=c.name;$('#cityAqi').textContent=`${c.aqi} · Scenario AQI`;$('#avgValue').textContent=c.aqi;
  $('#centerLabel').textContent=c.name.toUpperCase();$('#industrialLabel').textContent=c.area.toUpperCase();$('#eastLabel').textContent='SCENARIO MAP';
  $('#eventLocation').textContent=c.area+' · '+c.name;$('#nodeStatus').textContent=c.node+' · Pilot';
  const zones={bengaluru:['Goraguntepalya','Mathikere','Vidyaranyapura'],delhi:['Narela','Bawana','Alipur'],mumbai:['Taloja','Kalamboli','Kharghar'],hyderabad:['Patancheru','Ameenpur','Miyapur']};
  $$('#zones .zone').forEach((el,i)=>el.textContent=zones[city][i]);
  $('#reportForm [name="location"]').value=c.area;$('#sensorSummary').textContent='No sensor dataset loaded for this city.';$('#sensorChart').replaceChildren();$('#evaluationResult').textContent='Load labeled readings to evaluate this city.';
  renderDashboard(false);loadLiveContext();loadRecords();if($('#pilotModal').classList.contains('open'))updateGeo();
};
const originalRender=renderDashboard;
renderDashboard=function(forceActive){
  originalRender(forceActive);const c=cityConfig[state.city],m=scoreModel();
  $('#confidence').textContent=(state.active||m.sensor)?`${m.confidence}/100`:'—';$('.confidence span').textContent='rule score';
  $('#eventType').textContent=state.active?'Corroborated particulate anomaly':m.sensor?'Sensor spike needs verification':c.area+' stable';
  $('#severity').textContent=state.active?(state.signals.pm>=150&&c.aqi<=80?'Scenario macro-masking detected':'Operator review required'):m.sensor?'Review required':'No active event';
    $('#priorityTitle').textContent=state.active?c.area+' · local anomaly':'Macro-masking watch active';
  $('#priorityText').textContent=state.active?`${state.signals.pm} µg/m³ · ${Math.round((state.signals.pm/state.signals.baseline-1)*100)}% above baseline · ${pilot.source}`:`${c.name} · ${pilot.source}`;
  $('#priorityMetric').textContent=state.active?`${m.confidence}/100 score`:'Scenario AQI '+c.aqi;
  $('#sourceConfidence').textContent=state.active?'Source unverified':'Awaiting anomaly';
  $('#synthesisText').textContent=state.active?`The local reading is ${m.z.toFixed(1)}σ above baseline with ${m.corroborators} corroborating flag(s). This rule flags an incident for review; it cannot identify a specific emission source. ${pilot.source==='Scenario'?'All supporting cues in this scenario are synthetic.':'Imported evidence flags require operator verification.'}`:'Compare local readings against their own baseline and check independent evidence before escalating.';
  $('#satEvidence').textContent=state.signals.satellite?'Supporting satellite flag · '+pilot.source:'No satellite evidence supplied';
  $('#citizenEvidence').textContent=state.signals.reports?`${state.reportCount||1} report(s) · ${pilot.source}`:'No reports linked to current signals';
  $('#leadTime').textContent='—';$('#population').textContent=state.active?'Scenario only':'—';
  $('#forecastTitle').textContent=state.active?'Illustrative plume · +'+state.forecastMinute+' min':'No localized spread risk';
  $('#forecastText').textContent=state.active?'Scenario dispersion diagram. Population and facility exposure are not measured; verify local wind, sensor locations and census data before operational use.':'Projection activates after a corroborated anomaly.';
  $('#actionList').innerHTML=state.active?`<li>Request ${escapeText(c.agency)} operator review.</li><li>Verify the source and downwind conditions.</li><li>Record an assignment and review status in this Site.</li>`:'<li>Review incoming sensor readings.</li><li>Await corroborating evidence.</li>';
  $('#timelineStatus').textContent=state.active?c.node+' · '+pilot.source:'No active case';
  $('.scenario-badge').textContent=/Scenario|Synthetic/.test(pilot.source)?'SCENARIO':'SUPPLIED DATA';
  $('.source-note span').textContent='Current evidence: '+pilot.source+' · operator verification required';
};
const originalPlume=updatePlume;
updatePlume=function(minute){originalPlume(minute);if(state.active){$('#forecastTitle').textContent=`Illustrative plume · +${minute} min`;$('#forecastText').textContent=`Wind input ${state.signals.wind} km/h · travel estimate ${(state.signals.wind*minute/60).toFixed(1)} km. Map geometry and exposure are scenario values.`;}};
eventPacket=function(city=state.city){
  const c=cityConfig[city],m=scoreModel();return {schema_version:'1.2',event_id:pilot.incident?.id||'UNSAVED-'+c.node,city_node:c.node,timestamp:new Date().toISOString(),location:{name:c.area,lat:c.lat,lon:c.lon},pollutants:{pm2_5:state.signals.pm,unit:'µg/m³'},severity:state.active?'review_required':'monitoring',predicted_source:'unverified',confidence:null,rule_score:m.confidence,evidence_summary:{sensor_deviation_sigma:+m.z.toFixed(2),citizen_reports:state.reportCount,satellite_flag:state.signals.satellite,provenance:pilot.source,raw_media_shared:false},forecast:{minutes:state.forecastMinute,wind_kmh:state.signals.wind,population_at_risk:null,model:'illustrative only'},recommended_action:'Operator verification required',model_version:'baseline-rule-0.6'};
};
// These labels replace prior scenario claims with explicit implementation status.
$('.privacy-band').innerHTML='<div><strong>No raw media in event packets</strong><span>Photos remain in this private Site</span></div><div><strong>Federated training planned</strong><span>No measured differential privacy budget yet</span></div><div><strong>Schema exchange implemented</strong><span>Model-weight transfer is a roadmap item</span></div>';
$$('.city-cockpit .node').forEach((node,i)=>{const city=Object.keys(cityConfig)[i];node.innerHTML=`<span class="eyebrow">${cityConfig[city].node}</span><strong>${cityConfig[city].name}</strong><span>Regional context + saved pilot records</span><button class="secondary" style="margin-top:12px" data-select-city="${city}">Open city</button>`;});
$$('[data-select-city]').forEach(b=>b.addEventListener('click',()=>{closeFed();switchCity(b.dataset.selectCity);}));
$('#federationPanel .data-note').textContent='Implemented: four selectable city contexts, durable pilot records and JSON schema exchange. Federated model training and verified agency integrations remain planned.';
$$('.directive span').forEach((el,i)=>el.textContent=['Record a field team assignment','Draft a downwind advisory for review','Prepare an inspection evidence dossier'][i]);
const validation=$$('.section').find(el=>el.textContent.includes('Prototype validation'));
validation.innerHTML='<div class="section-title"><h2>Measured evaluation</h2><span>Dataset required</span></div><p class="pilot-note">Import labeled readings in Pilot tools to calculate precision, recall and false positives. No audited accuracy results are claimed.</p>';
$('#compareModal .highlight').innerHTML='<span class="eyebrow">PRANA-NET rule detection</span><h3>Corroborated local view</h3><p class="pilot-note">The sample rises from 45 to 168 µg/m³. Sensor deviation and supporting flags trigger operator review. Source attribution and exposure remain unverified.</p>';
$('#compareModal .selection-moment').textContent='Demo hypothesis: combining a local anomaly with independent evidence can reduce false alerts compared with a PM-only threshold. Evaluate that hypothesis using labeled readings in Pilot tools.';
$('#compareModal .compare-row strong').textContent='78 · Scenario AQI';
$('#progressText').textContent='Compare current readings against the local baseline.';
$('.map-title .eyebrow').textContent='Command map · scenario geometry';
$$('.evidence-text strong').at(-1).textContent='Scenario meteorology';
$('#imageAnalysisText').textContent='Photo analysis uses a local color heuristic; submitted photos are saved in this private Site.';
const originalWorkflow=renderWorkflow;
renderWorkflow=function(){originalWorkflow();$('#operationsModal .modal-head h2').textContent='Case '+(pilot.incident?.id.slice(0,8)||'not yet saved');$('#workflowStatus').textContent=state.active?['Detected','Verified','Assigned','Dispatched (record only)','Inspected','Resolved'][state.workflowStage]:'Awaiting active case';$('#operationsModal .data-note').textContent='Record an operator review and response here. This prototype does not contact agencies, send SMS or operate building controls.';$$('#operationsModal .resource-card strong').forEach((el,i)=>el.textContent=[cityConfig[state.city].agency+' review team','Source inspection','Community advisory review'][i]);$$('#operationsModal .resource-card span').forEach((el,i)=>el.textContent=['Assignment to be confirmed','Location: '+cityConfig[state.city].area,'No external message sent'][i]);};
$('#exportPacketBtn').textContent='Export current city packet';
$('#exportPacketBtn').replaceWith($('#exportPacketBtn').cloneNode(true));
$('#exportPacketBtn').addEventListener('click',()=>{const packet=eventPacket();showPacket(packet);download(packet.event_id+'.json',JSON.stringify(packet,null,2));});
$('#samplePacketBtn').replaceWith($('#samplePacketBtn').cloneNode(true));
$('#samplePacketBtn').textContent='Load example schema';$('#samplePacketBtn').addEventListener('click',()=>showPacket({...eventPacket(),event_id:'EXAMPLE',evidence_summary:{provenance:'synthetic sample',raw_media_shared:false}}));

async function loadRecords(){
  const city=state.city;try{const data=await api('records?city='+city);if(city!==state.city)return;pilot.records=data.records;$('#storageStatus').textContent='Hosted storage connected · '+cityConfig[city].name;renderRecords();}
  catch(error){if(city!==state.city)return;$('#storageStatus').textContent='Storage unavailable · retry to reconnect';$('#savedRecords').textContent=error.message;}
}
function renderRecords(){
  const root=$('#savedRecords');root.replaceChildren();if(!pilot.records.length){root.textContent='No saved records for this city. Save a report, incident or sensor dataset to begin.';return;}
  for(const row of pilot.records){
    const el=document.createElement('article');el.className='record-item';const title=document.createElement('strong');title.textContent=row.kind==='report'?row.payload.location:row.kind==='incident'?'Incident · '+['Detected','Verified','Assigned','Dispatched','Inspected','Resolved'][row.stage]:row.kind==='sensor'?'Sensor dataset · '+row.payload.rows.length+' readings':'Pilot feedback';el.append(title);
    const meta=document.createElement('small');meta.textContent=dateText(row.created)+' IST · '+row.id.slice(0,8);el.append(meta);
    const details=document.createElement('p');details.textContent=row.payload.description||row.payload.source||row.payload.observation||'Saved case';el.append(details);
    if(row.payload.photoUrl&&/^\/api\/photos\/[\w-]{36}$/.test(row.payload.photoUrl)){const image=document.createElement('img');image.src=row.payload.photoUrl;image.alt='Saved citizen evidence';el.append(image);}
    if(row.kind==='incident'){const open=document.createElement('button');open.className='secondary';open.textContent='Resume response';open.onclick=()=>{pilot.incident=row;pilot.source=row.payload.source||'Scenario';state.signals=row.payload.signals;state.reportCount=row.payload.reportCount||0;state.workflowStage=row.stage;syncLab();renderDashboard();$('#pilotModal').classList.remove('open');openOperations();};el.append(open);const dossier=document.createElement('button');dossier.className='secondary';dossier.textContent='Dossier';dossier.onclick=()=>exportDossier(row);el.append(dossier);}
    if(row.kind==='sensor'){const open=document.createElement('button');open.className='secondary';open.textContent='Load readings';open.onclick=()=>applyRows(row.payload.rows,row.payload.source);el.append(open);}
    root.append(el);
  }
}
async function saveCitizenReport(){
  const city=state.city,form=$('#reportForm'),button=form.querySelector('[type="submit"]'),data=new FormData(form),photo=$('#photoInput').files[0];button.disabled=true;$('#reportSaveStatus').textContent='Saving report…';
  try{let photoUrl=null;if(photo){if(photo.size>3000000)throw new Error('Use a photo smaller than 3 MB');const uploaded=await api('photos',{method:'POST',headers:{'content-type':photo.type},body:photo});photoUrl=uploaded.url;}
    await createRecord('report',{location:data.get('location'),description:data.get('description'),reading:data.get('reading')||null,photoUrl,imageHeuristic:state.imageScore,verification:'unverified citizen observation'},city);
    if(city===state.city){state.reportCount++;state.signals.reports=true;pilot.source='Citizen report + current signals';renderDashboard();loadRecords();}closeReport();$('#reportSaveStatus').textContent='';toast('Report saved to this Site');
  }catch(error){$('#reportSaveStatus').textContent=error.message;}finally{button.disabled=false;}
}
async function saveCurrentIncident(){
  if(!state.active)throw new Error('Load or run a corroborated anomaly first.');
  if(pilot.incident)return pilot.incident;
  const city=state.city,source=pilot.source,row=await createRecord('incident',{signals:{...state.signals},reportCount:state.reportCount,source,packet:eventPacket()},city);
  if(city===state.city){pilot.incident=row;loadRecords();}return row;
}
async function saveWorkflow(stage){
  if(!state.active){toast('An active case is required');return;}const city=state.city;
  $('#workflowNext').disabled=true;$('#workflowBack').disabled=true;
  try{const incident=await saveCurrentIncident();await api('records/'+incident.id+'/stage',{method:'PATCH',body:JSON.stringify({stage})});if(city===state.city){state.workflowStage=stage;pilot.incident.stage=stage;renderWorkflow();loadRecords();toast('Response progress saved · no external dispatch sent');}}
  catch(error){toast(error.message);renderWorkflow();}
}
$('#saveIncident').addEventListener('click',async()=>{try{$('#caseError').textContent='Saving…';await saveCurrentIncident();$('#caseError').textContent='Incident saved. Resume it from history.';}catch(error){$('#caseError').textContent=error.message;}});
function exportDossier(row=pilot.incident){
  const packet=row?.payload.packet||eventPacket(),signals=row?.payload.signals||state.signals;
  const dossier=`<!doctype html><html><head><meta charset="utf-8"><title>PRANA-NET evidence dossier</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:40px auto;padding:20px;color:#142d35}pre{white-space:pre-wrap;background:#edf4f5;padding:20px;border-radius:12px}h1{line-height:1.2}button{padding:10px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save PDF</button><h1>PRANA-NET · Evidence dossier</h1><p>Case: ${escapeText(row?.id||'Unsaved case')}<br>Generated: ${escapeText(dateText(new Date().toISOString()))} IST<br>Source: ${escapeText(row?.payload.source||pilot.source)}<br>Response: ${escapeText(['Detected','Verified','Assigned','Dispatched','Inspected','Resolved'][row?.stage||0])}</p><h2>Operator review brief</h2><p>Local PM2.5: ${escapeText(signals.pm)} µg/m³, baseline ${escapeText(signals.baseline)}. Citizen and satellite flags are supporting evidence, subject to verification. The rule score is not a calibrated probability. Source attribution and population exposure have not been validated. No regulatory notice or external dispatch is issued by this prototype.</p><h2>Evidence packet</h2><pre>${escapeText(JSON.stringify(packet,null,2))}</pre><h2>Review checklist</h2><p>Verify sensor calibration and location; check report timestamps; confirm wind direction; inspect the source; record an authorized response.</p></body></html>`;
  download('PRANA-dossier-'+(row?.id||state.city)+'.html',dossier,'text/html');
}
$('#downloadDossier').addEventListener('click',()=>exportDossier());$('#quickDossier').addEventListener('click',()=>exportDossier());
$('#refreshRecords').addEventListener('click',loadRecords);
$('#saveFeedback').addEventListener('click',async()=>{const observation=$('#feedbackText').value.trim();if(observation.length<3){$('#feedbackStatus').textContent='Enter a short observation.';return;}try{await createRecord('feedback',{observation});$('#feedbackText').value='';$('#feedbackStatus').textContent='Feedback saved.';loadRecords();}catch(error){$('#feedbackStatus').textContent=error.message;}});

function parseReadings(text){
  let rows;if(text.trim().startsWith('['))rows=JSON.parse(text);else{const lines=text.trim().split(/\r?\n/),headers=lines.shift().split(',').map(s=>s.trim());rows=lines.filter(Boolean).map(line=>Object.fromEntries(line.split(',').map((value,i)=>[headers[i],value.trim()])));}
  if(!Array.isArray(rows)||!rows.length||rows.length>500)throw new Error('Supply 1–500 readings.');
  const bool=(v)=>{if(v===undefined||v===''||v===false||v==='false'||v==='0'||v===0)return false;if(v===true||v==='true'||v==='1'||v===1)return true;throw new Error('Evidence flags must be true or false');};
  return rows.map((r,i)=>{const pm=Number(r.pm),baseline=Number(r.baseline),sigma=Number(r.sigma),timestamp=new Date(r.timestamp);if(!Number.isFinite(pm)||pm<0||pm>1000||!Number.isFinite(baseline)||baseline<=0||baseline>1000||!Number.isFinite(sigma)||sigma<=0||sigma>500||!Number.isFinite(timestamp.getTime()))throw new Error('Invalid PM, baseline, sigma or timestamp at row '+(i+1));if(r.label!==undefined&&r.label!==''&&![0,1,'0','1'].includes(r.label))throw new Error('Labels must be 0 or 1');return {timestamp:timestamp.toISOString(),pm,baseline,sigma,wind:11,reports:bool(r.reports),satellite:bool(r.satellite),label:r.label===undefined||r.label===''?null:Number(r.label)};}).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}
function predict(row){const z=Math.max(0,(row.pm-row.baseline)/row.sigma),score=Math.min(95,26+Math.min(z,6)*6+(row.reports?15:0)+(row.satellite?12:0)+5);return z>=2.5&&(row.reports||row.satellite)&&Math.round(score)>=65;}
function evaluateRows(rows){
  const labeled=rows.filter(r=>r.label===0||r.label===1);const metrics=fn=>{let tp=0,fp=0,tn=0,fnCount=0;for(const row of labeled){const positive=fn(row);if(positive&&row.label)tp++;else if(positive)fp++;else if(row.label)fnCount++;else tn++;}return {tp,fp,tn,fn:fnCount,precision:tp+fp?tp/(tp+fp):null,recall:tp+fnCount?tp/(tp+fnCount):null,falsePositiveRate:fp+tn?fp/(fp+tn):null};};return {rows:labeled.length,source:pilot.source,corroborated:metrics(predict),pmOnly:metrics(r=>r.pm>=150)};
}
function applyRows(rows,source){
  pilot.rows=rows;pilot.source=source;pilot.incident=null;const row=rows.at(-1);state.signals={pm:row.pm,baseline:row.baseline,sigma:row.sigma,wind:row.wind||11,reports:row.reports,satellite:row.satellite};state.reportCount=row.reports?1:0;state.workflowStage=0;syncLab();renderDashboard();
  $('#sensorSummary').textContent=`${rows.length} readings · ${source} · latest ${dateText(row.timestamp)} IST`;
  const max=Math.max(...rows.map(r=>r.pm),1),points=rows.map((r,i)=>`${10+i*480/Math.max(rows.length-1,1)},${130-r.pm/max*110}`).join(' ');$('#sensorChart').innerHTML=`<path d="M10 130H490" stroke="#34515a"/><polyline points="${points}" fill="none" stroke="#6de5dc" stroke-width="3"/><text x="10" y="14" fill="#8fa8aa" font-size="12">PM2.5 max ${max} µg/m³</text>`;
  const result=evaluateRows(rows),percent=n=>n===null?'N/A':Math.round(n*100)+'%';
  $('#evaluationResult').innerHTML=result.rows?`<p>${result.rows} labeled rows · ${escapeText(source)}</p><table class="pilot-table"><tr><th>Metric</th><th>Corroborated</th><th>PM only</th></tr>${[['Precision','precision'],['Recall','recall'],['False positive rate','falsePositiveRate']].map(([name,key])=>`<tr><td>${name}</td><td>${percent(result.corroborated[key])}</td><td>${percent(result.pmOnly[key])}</td></tr>`).join('')}<tr><td>TP / FP / FN / TN</td>${['corroborated','pmOnly'].map(k=>`<td>${result[k].tp} / ${result[k].fp} / ${result[k].fn} / ${result[k].tn}</td>`).join('')}</tr></table><p class="pilot-note">Row-level comparison. This does not measure event detection time or establish real-world accuracy.</p>`:'Readings loaded without labels; no accuracy metrics calculated.';
}
$('#sensorFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>200000){$('#sensorError').textContent='Use a file smaller than 200 KB.';return;}$('#sensorText').value=await file.text();});
$('#sampleSensors').addEventListener('click',()=>{const values=[45,52,160,48,168,170];$('#sensorText').value=JSON.stringify(values.map((pm,i)=>({timestamp:new Date(Date.UTC(2026,8,30,8,i)).toISOString(),pm,baseline:45,sigma:20,reports:i>=4,satellite:false,label:i>=4?1:0})),null,2);$('#sensorText').dataset.source='Synthetic sample';});
$('#sensorText').addEventListener('input',()=>{$('#sensorText').dataset.source='Uploaded readings · user supplied';});
$('#sensorFile').addEventListener('change',()=>{$('#sensorText').dataset.source='Uploaded readings · user supplied';});
$('#importSensors').addEventListener('click',async()=>{const button=$('#importSensors'),city=state.city;button.disabled=true;try{const rows=parseReadings($('#sensorText').value),source=$('#sensorText').dataset.source||'Uploaded readings · user supplied';await createRecord('sensor',{rows,source},city);if(city===state.city){applyRows(rows,source);loadRecords();}$('#sensorError').textContent='Readings validated and saved.';}catch(error){$('#sensorError').textContent=error.message;}finally{button.disabled=false;}});
$('#exportEvaluation').addEventListener('click',()=>{if(!pilot.rows.length){$('#sensorError').textContent='Load a labeled dataset first.';return;}download('PRANA-evaluation.json',JSON.stringify(evaluateRows(pilot.rows),null,2));});
registerWebMCP();switchCity('bengaluru');
