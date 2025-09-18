// scripts/make-index-Items.js
// Génère Items/index.json à partir de Items/*.json
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'Items'); // si tu exécutes depuis la racine du repo
if(!fs.existsSync(dir)){
  console.error('Dossier Items/ introuvable au chemin:', dir);
  process.exit(1);
}
const out = path.join(dir, 'index.json');
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.json') && f!=='index.json');

const entries = files.map(f=>{
  const raw = fs.readFileSync(path.join(dir,f),'utf-8');
  let name = f.replace('.json','');
  try{
    const j = JSON.parse(raw);
    name = j.name || j.id || name;
  }catch(e){}
  return { file: f, id: f.replace('.json',''), name };
});

fs.writeFileSync(out, JSON.stringify(entries, null, 2), 'utf-8');
console.log('Wrote', out);
