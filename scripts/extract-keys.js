const fs = require('fs');
const path = require('path');
const messagesDir = path.join(__dirname, '..', 'messages');
const es = JSON.parse(fs.readFileSync(path.join(messagesDir, 'es.json'), 'utf8'));
function flatten(obj, p=''){const r={};for(const k in obj){const pp=p?`${p}.${k}`:k;if(typeof obj[k]==='object'&&obj[k]!==null)Object.assign(r,flatten(obj[k],pp));else r[pp]=obj[k];}return r;}
const esFlat = flatten(es);
const ru = JSON.parse(fs.readFileSync(path.join(messagesDir, 'ru.json'), 'utf8'));
const ruFlat = flatten(ru);
const sections = ['common','forum','thread','reply','messages','editor','verification','favorites','search','alerts','contact','report','rules','user','favoritesPage','createThread','errors','passwordRecovery','notFound','faq','serverErrors','auth','onlineStatus','cookies'];
for(const key in esFlat){
  const section = key.split('.')[0];
  if(!sections.includes(section)) continue;
  const ev = esFlat[key];
  const cv = ruFlat[key];
  if(cv===undefined||cv===ev){
    console.log(`${key} = ${JSON.stringify(ev)}`);
  }
}
