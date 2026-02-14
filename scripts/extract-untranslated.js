const fs = require('fs');
const path = require('path');
const messagesDir = path.join(__dirname, '..', 'messages');
const es = JSON.parse(fs.readFileSync(path.join(messagesDir, 'es.json'), 'utf8'));
function flatten(obj, p=''){const r={};for(const k in obj){const pp=p?`${p}.${k}`:k;if(typeof obj[k]==='object'&&obj[k]!==null)Object.assign(r,flatten(obj[k],pp));else r[pp]=obj[k];}return r;}
const esFlat = flatten(es);
// Use RU as reference (most untranslated)
const ru = JSON.parse(fs.readFileSync(path.join(messagesDir, 'ru.json'), 'utf8'));
const ruFlat = flatten(ru);
const userFacing = ['common','forum','thread','reply','messages','editor','verification','favorites','search','alerts','contact','report','rules','user','favoritesPage','createThread','errors','passwordRecovery','notFound','faq','serverErrors','auth','home','account','onlineStatus','cookies','language','sidebar','nav','notifications','legal','roles'];
const adminSections = ['moderation','admin','customBadges','autoBadges','adminUsers','adminReports','adminLogs','adminSuspensions','adminWarnings','adminFilters','adminGeoForums','adminForums','adminBadges','publicidad','payments','adminPayments','ads'];
const longText = ['reputationPage','cookiesPage','privacyPage','termsPage'];

console.log('=== USER-FACING UNTRANSLATED ===');
for(const key in esFlat){
  const section = key.split('.')[0];
  if(!userFacing.includes(section)) continue;
  const ev = esFlat[key];
  const cv = ruFlat[key];
  if(cv===undefined||cv===ev){
    console.log(`"${ev}"`);
  }
}
console.log('\n=== ADMIN UNTRANSLATED (count by section) ===');
const adminCounts = {};
for(const key in esFlat){
  const section = key.split('.')[0];
  if(!adminSections.includes(section)) continue;
  const ev = esFlat[key];
  const cv = ruFlat[key];
  if(cv===undefined||cv===ev){
    if(!adminCounts[section]) adminCounts[section]=0;
    adminCounts[section]++;
  }
}
for(const [s,c] of Object.entries(adminCounts).sort((a,b)=>b[1]-a[1])){
  console.log(`  ${s}: ${c}`);
}
console.log('\n=== LONG TEXT UNTRANSLATED (count) ===');
for(const key in esFlat){
  const section = key.split('.')[0];
  if(!longText.includes(section)) continue;
  const ev = esFlat[key];
  const cv = ruFlat[key];
  if(cv===undefined||cv===ev){
    if(!adminCounts[section]) adminCounts[section]=0;
    adminCounts[section]++;
  }
}
for(const s of longText){
  if(adminCounts[s]) console.log(`  ${s}: ${adminCounts[s]}`);
}
