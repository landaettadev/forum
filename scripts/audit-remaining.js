const fs = require('fs');
const path = require('path');
const messagesDir = path.join(__dirname, '..', 'messages');
const es = JSON.parse(fs.readFileSync(path.join(messagesDir, 'es.json'), 'utf8'));
function flatten(obj, p=''){const r={};for(const k in obj){const pp=p?`${p}.${k}`:k;if(typeof obj[k]==='object'&&obj[k]!==null)Object.assign(r,flatten(obj[k],pp));else r[pp]=obj[k];}return r;}
const esFlat = flatten(es);
const langs=['en','pt','fr','de','it','nl','ja','zh','ru','ar','hi','ko','tr','pl','sv','id','th'];
const allUntranslated = {};
for(const lang of langs){
  const fp=path.join(messagesDir,`${lang}.json`);
  const data=JSON.parse(fs.readFileSync(fp,'utf8'));
  const df=flatten(data);
  let count=0;
  const sections={};
  for(const key in esFlat){
    const ev=esFlat[key];
    const cv=df[key];
    if(cv===undefined||cv===ev){
      count++;
      const section=key.split('.')[0];
      if(!sections[section])sections[section]=[];
      sections[section].push(key);
      if(!allUntranslated[key])allUntranslated[key]=new Set();
      allUntranslated[key].add(lang);
    }
  }
  const sectionSummary=Object.entries(sections).map(([s,k])=>`${s}:${k.length}`).join(', ');
  console.log(`${lang.toUpperCase()}: ${count} untranslated [${sectionSummary}]`);
}
// Show sample of most common untranslated values
console.log(`\n--- Top 50 untranslated Spanish values (by # of langs missing) ---`);
const sorted=Object.entries(allUntranslated).sort((a,b)=>b[1].size-a[1].size).slice(0,50);
for(const [key, langs] of sorted){
  console.log(`[${langs.size} langs] ${key} = "${esFlat[key]}"`);
}
