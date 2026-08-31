let map; let markers=[];
const fmt=n=>Math.round(n);
async function load(){
  const d=await fetch('/api/day').then(r=>r.json());
  document.querySelector('#date').textContent=new Date(d.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  document.querySelector('#calories').textContent=`${fmt(d.totals.calories)} / ${fmt(d.targets.calories)}`;
  document.querySelector('#calRemain').textContent=`${fmt(d.remaining.calories)} kcal remaining`;
  document.querySelector('#mealCount').textContent=`${d.meals.length} entries`;
  document.querySelector('#macroCards').innerHTML=['protein','carbs','fat'].map(k=>`<div><b>${fmt(d.totals[k])}g</b><span>${k}</span><small>${fmt(d.targets[k])}g goal</small></div>`).join('');
  document.querySelector('#meals').innerHTML=d.meals.length?d.meals.map(m=>`<article class="meal"><div><b>${esc(m.name)}</b><small>${fmt(m.protein)}P · ${fmt(m.carbs)}C · ${fmt(m.fat)}F</small></div><div><span>${fmt(m.calories)} kcal</span><button onclick="removeMeal('${m.id}')">×</button></div></article>`).join(''):'<p class="empty">No meals logged yet. Add one here or tell ChatGPT what you ate.</p>';
  document.querySelector('#spots').innerHTML=d.spots.length?d.spots.map(s=>`<article class="spot"><b>${esc(s.name)}</b><small>${esc(s.note||s.address)}</small>${s.calories?`<span>${fmt(s.calories)} kcal${s.protein?` · ${fmt(s.protein)}g protein`:''}</span>`:''}</article>`).join(''):'<p class="empty">Ask ChatGPT for food suggestions and they’ll appear here.</p>';
  document.querySelector('#groceries').innerHTML=d.groceries.length?`<ul>${d.groceries.map(g=>`<li><span>${esc(g.item)}</span><small>${esc(g.quantity||'')}${g.note?' · '+esc(g.note):''}</small></li>`).join('')}</ul>`:'<p class="empty">No grocery plan yet. Ask ChatGPT to build today’s cook-at-home list.</p>';
  drawMap(d.spots);
}
function esc(x=''){const e=document.createElement('div');e.textContent=x;return e.innerHTML}
function drawMap(spots){
  if(!map){map=L.map('map').setView([40.7128,-74.0060],13);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map)}
  markers.forEach(m=>m.remove()); markers=[];
  const usable=spots.filter(s=>s.latitude&&s.longitude);
  usable.forEach(s=>markers.push(L.marker([s.latitude,s.longitude]).addTo(map).bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.address)}`)));
  if(usable.length){map.fitBounds(L.latLngBounds(usable.map(s=>[s.latitude,s.longitude])),{padding:[30,30],maxZoom:15})}
}
async function removeMeal(id){await fetch('/api/meals/'+id,{method:'DELETE'});load()}
document.querySelector('#mealForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());await fetch('/api/meals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});e.currentTarget.reset();load()});
document.querySelector('#refresh').onclick=load;load();