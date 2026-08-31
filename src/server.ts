import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data.json');
const PORT = Number(process.env.PORT || 3000);

type Meal = { id: string; date: string; name: string; calories: number; protein: number; carbs: number; fat: number };
type Spot = { id: string; date: string; name: string; address: string; latitude?: number; longitude?: number; note?: string; calories?: number; protein?: number };
type GroceryItem = { id: string; date: string; item: string; quantity?: string; note?: string };
type Store = { targets: { calories: number; protein: number; carbs: number; fat: number }; meals: Meal[]; spots: Spot[]; groceries: GroceryItem[] };

const defaultStore: Store = {
  targets: { calories: 2600, protein: 220, carbs: 260, fat: 75 },
  meals: [], spots: [], groceries: []
};

function readStore(): Store {
  if (!fs.existsSync(DATA_FILE)) return structuredClone(defaultStore);
  return { ...structuredClone(defaultStore), ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
}
function writeStore(store: Store) { fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2)); }
function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()); }
function summary(date = today()) {
  const s = readStore(); const meals = s.meals.filter(m => m.date === date);
  const total = meals.reduce((a,m)=>({ calories:a.calories+m.calories, protein:a.protein+m.protein, carbs:a.carbs+m.carbs, fat:a.fat+m.fat }), { calories:0, protein:0, carbs:0, fat:0 });
  return { date, targets:s.targets, totals:total, remaining:{ calories:s.targets.calories-total.calories, protein:s.targets.protein-total.protein, carbs:s.targets.carbs-total.carbs, fat:s.targets.fat-total.fat }, meals, spots:s.spots.filter(x=>x.date===date), groceries:s.groceries.filter(x=>x.date===date) };
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));
app.get('/api/day', (req,res)=>res.json(summary(String(req.query.date || today()))));
app.post('/api/meals', (req,res)=>{ const s=readStore(); const m:Meal={id:randomUUID(),date:req.body.date||today(),name:req.body.name,calories:+req.body.calories||0,protein:+req.body.protein||0,carbs:+req.body.carbs||0,fat:+req.body.fat||0}; s.meals.push(m); writeStore(s); res.status(201).json(m); });
app.delete('/api/meals/:id', (req,res)=>{ const s=readStore(); s.meals=s.meals.filter(m=>m.id!==req.params.id); writeStore(s); res.status(204).end(); });
app.post('/api/targets', (req,res)=>{ const s=readStore(); s.targets={...s.targets,...req.body}; writeStore(s); res.json(s.targets); });

function makeMcpServer() {
  const server = new McpServer({ name:'calorie-tracker', version:'0.1.0' });
  server.tool('get_daily_nutrition', 'Read calories, macros, meals, suggested food spots, and grocery list for a date.', { date:z.string().optional() }, async ({date}) => ({ content:[{type:'text',text:JSON.stringify(summary(date||today()))}] }));
  server.tool('log_meal', 'Log a meal to the calorie tracker.', { name:z.string(), calories:z.number(), protein:z.number().default(0), carbs:z.number().default(0), fat:z.number().default(0), date:z.string().optional() }, async (input)=>{ const s=readStore(); const meal={id:randomUUID(),date:input.date||today(),name:input.name,calories:input.calories,protein:input.protein,carbs:input.carbs,fat:input.fat}; s.meals.push(meal); writeStore(s); return {content:[{type:'text',text:`Logged ${meal.name}. ${JSON.stringify(summary(meal.date))}`} ]}; });
  server.tool('set_daily_targets', 'Set calorie and macro targets.', { calories:z.number(), protein:z.number(), carbs:z.number(), fat:z.number() }, async (targets)=>{ const s=readStore(); s.targets=targets; writeStore(s); return {content:[{type:'text',text:`Targets updated: ${JSON.stringify(targets)}`}]}; });
  server.tool('replace_food_suggestions', 'Replace suggested nearby food spots for a date. Use addresses and optional coordinates so the website can map them.', { date:z.string().optional(), spots:z.array(z.object({name:z.string(),address:z.string(),latitude:z.number().optional(),longitude:z.number().optional(),note:z.string().optional(),calories:z.number().optional(),protein:z.number().optional()})) }, async ({date,spots})=>{ const d=date||today(); const s=readStore(); s.spots=s.spots.filter(x=>x.date!==d); s.spots.push(...spots.map(x=>({id:randomUUID(),date:d,...x}))); writeStore(s); return {content:[{type:'text',text:`Saved ${spots.length} food suggestions for ${d}.`}]}; });
  server.tool('replace_grocery_list', 'Replace the cook-at-home grocery list for a date.', { date:z.string().optional(), items:z.array(z.object({item:z.string(),quantity:z.string().optional(),note:z.string().optional()})) }, async ({date,items})=>{ const d=date||today(); const s=readStore(); s.groceries=s.groceries.filter(x=>x.date!==d); s.groceries.push(...items.map(x=>({id:randomUUID(),date:d,...x}))); writeStore(s); return {content:[{type:'text',text:`Saved ${items.length} grocery items for ${d}.`}]}; });
  return server;
}

app.post('/mcp', async (req,res)=>{
  const server = makeMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', ()=>{ transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req,res,req.body);
});
app.get('/health', (_req,res)=>res.json({ok:true}));
app.listen(PORT, ()=>console.log(`CalorieTracker listening on http://localhost:${PORT}`));
