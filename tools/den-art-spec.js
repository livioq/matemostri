// Refreshes the code-owned geometry in the approved separate-layer den art contract and
// redraws its placement guide. Art direction remains authored in docs/DEN_ART_SPEC.json.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext([
  src.match(/const DEN_CANVAS=\{[^}]*\};/)[0],
  src.match(/const DEN_ROOMS=\[[\s\S]*?\n\];/)[0],
  'this.canvas=DEN_CANVAS;this.rooms=DEN_ROOMS;'
].join('\n'), ctx);

const specPath = path.join(root, 'docs', 'DEN_ART_SPEC.json');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const first = ctx.rooms[0];

spec.coordinateSystem.canvasWidth = ctx.canvas.width;
spec.coordinateSystem.canvasHeight = ctx.canvas.height;
spec.coordinateSystem.aspectRatio = +(ctx.canvas.width / ctx.canvas.height).toFixed(4);
spec.backgrounds.forEach(background => {
  const room = ctx.rooms.find(candidate => candidate.level === background.level);
  if (!room) return;
  background.name = room.name;
  background.unlockedAtBadges = room.badges;
  background.asset = room.art || `assets/den/den-${room.level}.webp`;
});
spec.overlayGeometry.momo = {
  x: first.pet.x,
  floorY: first.pet.y,
  height: first.pet.height,
  clearBackgroundArea: {
    x: Math.round(first.pet.x - first.pet.height * .45),
    y: first.pet.y - first.pet.height,
    width: Math.round(first.pet.height * .9),
    height: first.pet.height
  },
  note: 'Phase 1 places Momo on the left beside the sleeping nook, leaving the right-hand collection area unobstructed.'
};
if (first.display) {
  spec.overlayGeometry.displayZone = {
    preferredSide: 'right', x: first.display.x, y: first.display.y,
    width: first.display.width, height: first.display.height,
    note: 'The Phase 1 cabinet occupies this calm right-hand zone. Display furniture is composited separately; exact treasure slots belong to the display layout data, not the generated background.'
  };
}
ctx.rooms.filter(room => room.display).forEach(room => {
  const display = spec.displayFurniture.levels.find(level => level.level === room.level);
  display.asset = room.display.art;
  display.geometry = {x:room.display.x, y:room.display.y,
    width:room.display.width, height:room.display.height};
  display.slotCentres = room.display.slots;
});
fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + '\n');

const W = ctx.canvas.width, H = ctx.canvas.height, GAP = 34, COLS = 2;
const rows = Math.ceil(ctx.rooms.length / COLS);
const sheetW = COLS * W + (COLS + 1) * GAP;
const sheetH = rows * (H + 44) + (rows + 1) * GAP;
const g = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetW} ${sheetH}" width="${sheetW}" height="${sheetH}">`,
  `<rect width="${sheetW}" height="${sheetH}" fill="#FFF9FE"/>`,
  '<style>text{font-family:system-ui,sans-serif}.t{font-size:19px;font-weight:700;fill:#50319A}' +
    '.l{font-size:12px;font-weight:700;fill:#8069B5}.k{font-size:11px;fill:#D94B92;font-weight:700}</style>'
];
ctx.rooms.forEach((room, i) => {
  const ox = GAP + (i % COLS) * (W + GAP), oy = GAP + Math.floor(i / COLS) * (H + 44 + GAP);
  g.push(`<text class="t" x="${ox}" y="${oy + 16}">Room ${room.level} — ${room.name}` +
    ` <tspan class="l">(${room.badges} badges)</tspan></text>`);
  g.push(`<g transform="translate(${ox},${oy + 30})">`);
  g.push(`<rect width="${W}" height="${H}" fill="#EDE7F7" stroke="#50319A" stroke-width="2" rx="10"/>`);
  g.push(`<rect x="${Math.round(room.pet.x - room.pet.height * .45)}" y="${room.pet.y - room.pet.height}" ` +
    `width="${Math.round(room.pet.height * .9)}" height="${room.pet.height}" fill="#D94B92" fill-opacity=".13" ` +
    'stroke="#D94B92" stroke-width="2" stroke-dasharray="7 5"/>');
  g.push(`<circle cx="${room.pet.x}" cy="${room.pet.y}" r="6" fill="#2E9E7A"/>`);
  if (room.display) {
    g.push(`<rect x="${room.display.x}" y="${room.display.y}" width="${room.display.width}" height="${room.display.height}" ` +
      'fill="#F2B93B" fill-opacity=".12" stroke="#F2B93B" stroke-width="3"/>');
    room.display.slots.forEach(slot => g.push(`<circle cx="${slot.x}" cy="${slot.y}" r="7" fill="#FFF3C9" stroke="#50319A" stroke-width="2"/>`));
  }
  room.shelves.forEach(shelf => g.push(`<line x1="${shelf.x1}" y1="${shelf.y}" x2="${shelf.x2}" y2="${shelf.y}" stroke="#50319A" stroke-width="4"/>`));
  g.push('</g>');
});
g.push(`<text class="l" x="${GAP}" y="${sheetH - 12}">Layer order: den background → display furniture → collectible slots → Momo. Canvas ${W}×${H}.</text>`);
g.push('</svg>');
fs.writeFileSync(path.join(root, 'docs', 'DEN_ART_GUIDE.svg'), g.join('\n') + '\n');
console.log('refreshed docs/DEN_ART_SPEC.json and docs/DEN_ART_GUIDE.svg');
