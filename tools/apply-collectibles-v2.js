const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const testPath = path.join(root, 'tests', 'arithmetic-model.test.js');
let source = fs.readFileSync(indexPath, 'utf8');
let tests = fs.readFileSync(testPath, 'utf8');

function replaceOnce(label, before, after) {
  const at = source.indexOf(before);
  if (at < 0) throw new Error(`Could not find ${label}`);
  if (source.indexOf(before, at + before.length) >= 0) throw new Error(`${label} is not unique`);
  source = source.slice(0, at) + after + source.slice(at + before.length);
}
function replaceRange(label, start, end, replacement) {
  const a = source.indexOf(start);
  if (a < 0) throw new Error(`Could not find start of ${label}`);
  const b = source.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Could not find end of ${label}`);
  source = source.slice(0, a) + replacement + source.slice(b);
}
function replaceTest(label, before, after) {
  const at = tests.indexOf(before);
  if (at < 0) throw new Error(`Could not find test ${label}`);
  tests = tests.slice(0, at) + after + tests.slice(at + before.length);
}

const treasureModel = String.raw`const COLLECTIBLES=[
  {id:'stars',emoji:'⭐',name:'Stars',specimens:{
    easy:{id:'littleStar',name:'Little Star'},medium:{id:'moonStar',name:'Moon Star'},hard:{id:'guardianStar',name:'Guardian Star'}}},
  {id:'flowers',emoji:'🌸',name:'Flowers',specimens:{
    easy:{id:'bellFlower',name:'Bell Flower'},medium:{id:'moonBlossom',name:'Moon Blossom'},hard:{id:'auroraFlower',name:'Aurora Flower'}}},
  {id:'berries',emoji:'🍓',name:'Berries',specimens:{
    easy:{id:'glowberries',name:'Glowberries'},medium:{id:'moonberries',name:'Moonberries'},hard:{id:'starberries',name:'Starberries'}}},
  {id:'feathers',emoji:'🪶',name:'Feathers',specimens:{
    easy:{id:'softFeather',name:'Soft Feather'},medium:{id:'celestialFeather',name:'Celestial Feather'},hard:{id:'phoenixFeather',name:'Phoenix Feather'}}},
  {id:'mushrooms',emoji:'🍄',name:'Mushrooms',specimens:{
    easy:{id:'glowcap',name:'Glowcap'},medium:{id:'mooncap',name:'Mooncap'},hard:{id:'dreamcap',name:'Dreamcap'}}},
  {id:'crystals',emoji:'💎',name:'Crystals',specimens:{
    easy:{id:'blueCrystal',name:'Blue Crystal'},medium:{id:'moonCrystal',name:'Moon Crystal'},hard:{id:'heartCrystal',name:'Heart Crystal'}}},
  {id:'leaves',emoji:'🍀',name:'Leaves',specimens:{
    easy:{id:'luckyLeaf',name:'Lucky Leaf'},medium:{id:'silverLeaf',name:'Silver Leaf'},hard:{id:'goldenLeaf',name:'Golden Leaf'}}},
  {id:'shells',emoji:'🐚',name:'Shells',specimens:{
    easy:{id:'spiralShell',name:'Spiral Shell'},medium:{id:'pearlShell',name:'Pearl Shell'},hard:{id:'starShell',name:'Star Shell'}}}
];
const TREASURE_SPECIMENS=COLLECTIBLES.flatMap(family=>DIFFICULTY_IDS.map(difficulty=>({
  ...family.specimens[difficulty],familyId:family.id,difficulty:difficulty,emoji:family.emoji
})));
const TREASURE_BY_ID=id=>TREASURE_SPECIMENS.find(specimen=>specimen.id===id)||null;
const TREASURE_POOLS={
  'mysterious-egg':['stars','leaves'],
  'whispering-woods':['flowers','mushrooms','leaves'],
  'starlight-trail':['stars','berries'],
  'windy-cliffs':['feathers','stars'],
  'great-chasm':['feathers','stars'],
  'explorers-valley':['berries','leaves','flowers'],
  'crystal-caves':['crystals','mushrooms'],
  'rune-ruins':['crystals','leaves','shells'],
  'enchanted-garden':['flowers','berries','leaves','mushrooms'],
  'guardian-gate':['crystals','stars'],
  'star-fields':['stars','berries'],
  'celestial-heights':['feathers','stars'],
  'magicians-tower':['stars','crystals','feathers'],
  'arcane-library':['shells','crystals','stars'],
  'heart-of-matemostri':['shells','stars','crystals','feathers']
};
function blankCollectibleProgress(){ return {version:2,specimens:{},bests:{}}; }
function collectibleProgressOf(p){
  const saved=p&&p.collectibles&&typeof p.collectibles==='object'?p.collectibles:{};
  if(saved.version!==2||!saved.specimens||typeof saved.specimens!=='object'){
    const next=blankCollectibleProgress();
    COLLECTIBLES.forEach(family=>{
      const old=Math.max(0,Number(saved[family.id])||0);
      if(old) next.specimens[family.specimens.easy.id]=old;
    });
    p.collectibles=next;
  }
  const progress=p.collectibles;
  if(!progress.bests||typeof progress.bests!=='object') progress.bests={};
  TREASURE_SPECIMENS.forEach(specimen=>{
    progress.specimens[specimen.id]=Math.max(0,Number(progress.specimens[specimen.id])||0);
  });
  return progress;
}
function specimenQuantity(p,specimenId){ return Number(collectibleProgressOf(p).specimens[specimenId])||0; }
function collectibleTotal(p){
  const progress=collectibleProgressOf(p);
  return TREASURE_SPECIMENS.reduce((n,specimen)=>n+(Number(progress.specimens[specimen.id])||0),0);
}
function bestSpecimenForFamily(p,family){
  const progress=collectibleProgressOf(p);
  for(let i=DIFFICULTY_IDS.length-1;i>=0;i--){
    const specimen=family.specimens[DIFFICULTY_IDS[i]],quantity=Number(progress.specimens[specimen.id])||0;
    if(quantity>0) return {family:family,specimen:{...specimen,difficulty:DIFFICULTY_IDS[i]},quantity:quantity};
  }
  return null;
}
function treasurePoolFor(stageId,difficulty){
  const node=NODE_BY_LESSON(stageId),tier=DIFFICULTY_IDS.includes(difficulty)?difficulty:'medium';
  if(!node) return [];
  const families=TREASURE_POOLS[node.id]||[];
  return families.map(id=>COLLECTIBLES.find(family=>family.id===id)).filter(Boolean).map(family=>({
    family:family,specimen:{...family.specimens[tier],difficulty:tier}
  }));
}
function pickTreasure(p,stageId,difficulty,preferNew,random){
  const progress=collectibleProgressOf(p),pool=treasurePoolFor(stageId,difficulty);
  if(!pool.length) return null;
  const unseen=pool.filter(choice=>(Number(progress.specimens[choice.specimen.id])||0)===0);
  const choices=preferNew&&unseen.length?unseen:pool;
  const roll=typeof random==='function'?random():Math.random();
  const picked=choices[Math.min(choices.length-1,Math.max(0,Math.floor(roll*choices.length)))];
  const before=Number(progress.specimens[picked.specimen.id])||0,quantity=before+1;
  progress.specimens[picked.specimen.id]=quantity;
  return {family:picked.family,specimen:picked.specimen,quantity:quantity,first:before===0,
    milestone:quantity===5?'sparkling':quantity===10?'master':null};
}
function treasureBest(p,stageId,difficulty){
  const bests=collectibleProgressOf(p).bests,stage=bests[stageId];
  if(!stage||stage[difficulty]===undefined) return null;
  const value=Number(stage[difficulty]); return Number.isFinite(value)?value:null;
}
function setTreasureBest(p,stageId,difficulty,mastered){
  const bests=collectibleProgressOf(p).bests;
  if(!bests[stageId]||typeof bests[stageId]!=='object') bests[stageId]={};
  const previous=treasureBest(p,stageId,difficulty),score=Math.max(0,Number(mastered)||0);
  if(previous===null||score>previous) bests[stageId][difficulty]=score;
  return {previous:previous,best:previous===null?score:Math.max(previous,score),improved:previous!==null&&score>previous};
}
function treasureBonusEligible(previous,mastered,total,wasCompleted){
  return !!wasCompleted&&previous!==null&&(Number(mastered)>Number(previous)||Number(mastered)===Number(total));
}
`;

replaceRange('collectible model', 'const COLLECTIBLES=[', 'const COSMETIC_REWARDS=[', treasureModel + 'const COSMETIC_REWARDS=[');
replaceOnce('old collectible total', "const collectibleTotal=p=>COLLECTIBLES.reduce((n,c)=>n+Number((p.collectibles&&p.collectibles[c.id])||0),0);\n", '');
replaceOnce('new-player collectibles', "stageProgress:blankStageProgress(),monsterStage:1,momoName:'Momo',collectibles:{},accessories:[]", "stageProgress:blankStageProgress(),monsterStage:1,momoName:'Momo',collectibles:blankCollectibleProgress(),accessories:[]");
replaceOnce('collectible migration', "  if(!p.collectibles||typeof p.collectibles!=='object') p.collectibles={};\n  COLLECTIBLES.forEach(c=>{ p.collectibles[c.id]=Math.max(0,Number(p.collectibles[c.id])||0); });\n", "  collectibleProgressOf(p);\n");

replaceOnce('home collection rendering', "  $('collectionBox').innerHTML=COLLECTIBLES.filter(c=>P.collectibles[c.id]>0).map(c=>'<span class=\"collectible\">'+c.emoji+' '+c.name+' ×'+P.collectibles[c.id]+'</span>').join('')||'<span class=\"magic-whisper\">Replay a glowing lesson to discover magical treasures.</span>';", "  const homeTreasures=COLLECTIBLES.map(family=>bestSpecimenForFamily(P,family)).filter(Boolean);\n  $('collectionBox').innerHTML=homeTreasures.map(found=>'<span class=\"collectible\">'+found.family.emoji+' '+found.specimen.name+' ×'+found.quantity+'</span>').join('')||'<span class=\"magic-whisper\">Complete or replay lessons to discover magical treasures.</span>';");

const denProps = String.raw`function denProps(level,p){
  const room=denRoomOf(level); if(!room) return '';
  const held=COLLECTIBLES.map(family=>bestSpecimenForFamily(p,family)).filter(Boolean);
  const out=[]; let n=0;
  room.shelves.forEach(shelf=>{
    denSlotPoints(shelf).forEach(x=>{
      const found=held[n++]; if(!found) return;
      out.push('<span title="'+found.specimen.name+'" style="left:'+denPctX(x).toFixed(2)+'%;bottom:'+
        (100-denPctY(shelf.y)).toFixed(2)+'%">'+found.family.emoji+'</span>');
    });
  });
  return out.join('');
}
`;
replaceRange('den props', 'function denProps(level,p){', '/* She stands where the room says', denProps + '/* She stands where the room says');

const denShelf = String.raw`  $('denShelf').innerHTML=COLLECTIBLES.map(family=>{
    const found=bestSpecimenForFamily(P,family),held=!!found;
    return '<div class="den-trophy'+(held?'':' empty')+'">'+
      '<span class="den-emoji">'+family.emoji+'</span>'+
      '<span class="den-name">'+esc(held?found.specimen.name:family.name)+'</span>'+
      '<b>'+(held?'\u00D7'+found.quantity:'\u2014')+'</b></div>';
  }).join('');
  const found=COLLECTIBLES.filter(family=>bestSpecimenForFamily(P,family)).length;
  $('denShelfLabel').textContent=found?'On the shelf \u00B7 '+found+' of '+COLLECTIBLES.length+' families found'
    :'On the shelf \u00B7 nothing found yet';
`;
replaceRange('den shelf', "  $('denShelf').innerHTML=COLLECTIBLES.map(item=>{", '}\nfunction openDen(){', denShelf + '}\nfunction openDen(){');

const awardCollectible = String.raw`function awardCollectible(preferNew){
  const previous=treasureBest(P,S.stageId,S.difficulty);
  const first=pickTreasure(P,S.stageId,S.difficulty,!!preferNew);
  const bonus=treasureBonusEligible(previous,S.mastered,S.total,S.wasCompleted)
    ?pickTreasure(P,S.stageId,S.difficulty,false):null;
  const best=setTreasureBest(P,S.stageId,S.difficulty,S.mastered);
  const before=P.accessories.slice();
  COSMETIC_REWARDS.forEach(a=>{ if(collectibleTotal(P)>=a.total&&!P.accessories.includes(a.id)) P.accessories.push(a.id); });
  return {items:[first,bonus].filter(Boolean),best:best,
    bonusReason:bonus?(S.mastered===S.total?'perfect':'improved'):null,
    newCosmetics:COSMETIC_REWARDS.filter(a=>P.accessories.includes(a.id)&&!before.includes(a.id))};
}
function treasureFoundText(found){
  if(!found) return '';
  let text=found.family.emoji+' '+found.specimen.name;
  text+=found.first?' — new!':' ×'+found.quantity;
  if(found.milestone==='sparkling') text+=' It now sparkles on the shelf!';
  else if(found.milestone==='master') text+=' Master display reached!';
  return text;
}
function treasureRewardText(reward){
  if(!reward||!reward.items||!reward.items.length) return '';
  let text=petName()+' found '+treasureFoundText(reward.items[0])+'.';
  if(reward.items[1]) text+=' Bonus find: '+treasureFoundText(reward.items[1])+'.';
  const cosmetic=reward.newCosmetics&&reward.newCosmetics[0];
  if(cosmetic) text+=' A new '+cosmetic.name+' appeared in the magic wardrobe!';
  return text;
}

`;
replaceRange('award collectible', 'function awardCollectible(){', '\nfunction maybeCompleteStage(){', awardCollectible + 'function maybeCompleteStage(){');

const maybeComplete = String.raw`function maybeCompleteStage(){
  if(!S.stageId||S.mastered<S.pass) return false;
  S.newBadge=awardBadges(P,S.stageId,S.difficulty);
  S.reward=awardCollectible(S.newBadge);
  if(S.wasCompleted){ save(); return 'collectible'; }
  const beforeArt=P.monsterStage;
  const next=completeMathStage(P,S.stageId);
  const count=completedCount(P),afterEvolution=evolutionForCount(count),node=NODE_BY_LESSON(S.stageId);
  P.monsterStage=P.devMonsterOverride||afterEvolution.art;
  save();
  pendingUnlockStage=next;
  const evolved=beforeArt!==P.monsterStage,message=afterEvolution.message.replaceAll('{name}',petName());
  $('unlockBox').classList.toggle('major-transition',!!afterEvolution.majorEvolution);
  $('unlockPair').style.display=afterEvolution.majorEvolution?'grid':'none';
  $('unlockArrow').style.display=afterEvolution.majorEvolution?'block':'none';
  $('unlockPet').style.display=afterEvolution.majorEvolution?'none':'flex';
  if(afterEvolution.majorEvolution){
    $('unlockBeforePet').innerHTML=monsterMarkup(beforeArt,'idle','',petName()+' before transforming');
    $('unlockAfterPet').innerHTML=monsterMarkup(P.monsterStage,'levelUp','evolution-burst',petName()+' transformed');
  }else $('unlockPet').innerHTML=monsterMarkup(P.monsterStage,'levelUp','evolution-burst',petName()+' celebrating');
  $('unlockTitle').textContent=evolved?afterEvolution.title:S.stage.magic+' is glowing!';
  $('unlockText').textContent=evolved?message:(node?node.storyAfter.replaceAll('{name}',petName()):petName()+' has grown because you learned together.');
  $('unlockOk').textContent='See your result';
  $('unlockBox').classList.add('on');
  sLvl(); return 'completed';
}
`;
replaceRange('maybe complete stage', 'function maybeCompleteStage(){', '\n\nlet endRetryDifficulty=', maybeComplete + '\nlet endRetryDifficulty=');

replaceOnce('end title', "  $('endTitle').textContent=S.mastered>=S.pass?(S.wasCompleted?'Treasure discovered!':'The path is glowing!')", "  $('endTitle').textContent=S.mastered>=S.pass?(S.wasCompleted?'Treasure hunt complete!':'The path is glowing!')");
replaceRange('collectible end reward', "  if(result==='collectible'){", "  }else if(S.stoppedEarly){", "  if(result==='collectible'){\n    $('endReward').textContent=treasureRewardText(S.reward);\n  }else if(S.stoppedEarly){");
replaceOnce('first completion reward', "    $('endReward').textContent=node?node.storyAfter.replaceAll('{name}',petName()):petName()+' has grown because you learned together.';", "    const story=node?node.storyAfter.replaceAll('{name}',petName()):petName()+' has grown because you learned together.';\n    const treasure=treasureRewardText(S.reward);\n    $('endReward').textContent=story+(treasure?' '+treasure:'');");

replaceOnce('developer unlock treasures', "$('devUnlockCollectibles').onclick=()=>{ COLLECTIBLES.forEach(c=>P.collectibles[c.id]=5); P.accessories=COSMETIC_REWARDS.map(a=>a.id); save(); renderDeveloper(); sLvl(); };", "$('devUnlockCollectibles').onclick=()=>{ const progress=collectibleProgressOf(P); TREASURE_SPECIMENS.forEach(specimen=>progress.specimens[specimen.id]=5); P.accessories=COSMETIC_REWARDS.map(a=>a.id); save(); renderDeveloper(); sLvl(); };");

replaceTest('current collectible migration', "assert.deepEqual(plain(currentSave.collectibles).stars, 3, 'collectibles survive');", "assert.equal(currentSave.collectibles.version, 2, 'collectibles migrate to the specimen schema');\nassert.equal(currentSave.collectibles.specimens.littleStar, 3, 'old star copies survive as the easy specimen');\nassert.equal(currentSave.collectibles.specimens.moonStar, 0, 'old duplicates do not invent a medium treasure');");

fs.writeFileSync(indexPath, source);
fs.writeFileSync(testPath, tests);
console.log('Collectibles v2 applied to index.html and arithmetic-model.test.js');
