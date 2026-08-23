// Writes docs/DEN_ART_SPEC.json from the tables in index.html, so the brief an artist works
// to and the numbers the game places things at are the same numbers.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext([
  src.match(/const DEN_CANVAS=\{[^}]*\};/)[0],
  src.match(/const DEN_ROOMS=\[[\s\S]*?\n\];/)[0],
  src.match(/function denSlotPoints\(shelf\)\{[\s\S]*?\n\}/)[0],
  src.match(/const COLLECTIBLES=\[[\s\S]*?\n\];/)[0],
  'this.canvas=DEN_CANVAS;this.rooms=DEN_ROOMS;this.slots=denSlotPoints;this.items=COLLECTIBLES;'
].join('\n'), ctx);

const spec = {
  generatedFrom: 'index.html DEN_CANVAS / DEN_ROOMS — regenerate with tools/den-art-spec.js',
  purpose: 'Brief for painting the den rooms. Each room is one image on the canvas below. ' +
    'Paint the backdrop only: the creature and the treasures are drawn over it by the game, ' +
    'at the anchors given here. Keep those areas clear.',
  style: {
    medium: 'Painted digital illustration, the same hand as the rest of the game: soft ' +
      'airbrushed rendering with real light and shadow, not flat vector art and not a photo.',
    palette: "Warm gold (#F2B93B) light against deep plum-purple walls (#50319A family), " +
      "with sage green, dusty pink and cream accents. Matches the game's own colour tokens " +
      'so the room does not clash with the card it sits inside.',
    mood: 'Cosy and a little magical, never dark or spooky despite "den": firefly-soft glow, ' +
      'gentle sparkle particles, the same wonder as a bedtime story rather than an adventure peril.',
    continuity: 'All four rooms are the SAME physical space, shown as it is furnished over ' +
      'time — the same walls, floor and cave shape in every image, with furniture added at ' +
      'each level. They should read as one den growing, not four different rooms. Room 4 keeps ' +
      'everything room 3 had, plus more.',
    framing: "A clean rectangular scene, full-bleed to the canvas edge. NOT a parchment scroll " +
      "or vignette border like the map art — this sits inside the app's own rounded card, " +
      'which supplies its own frame.',
    doNotInclude: [
      'The creature herself — the app draws her over the scene at the pet anchor below.',
      'Any of the treasures/collectibles — the app overlays those as small emoji on the shelves.',
      'Text, UI, logos, or a signature anywhere in the image.'
    ],
    referenceNote: 'This document has no pixels in it and cannot carry style on its own. When ' +
      'briefing an image model, attach one of the existing assets/monsters WebP files (for the ' +
      'painted-fur, sparkle, warm-light treatment) and one assets/map panel (for how an ' +
      'environment in this world is painted) alongside this spec.'
  },
  coordinateSystem: {
    canvasWidth: ctx.canvas.width,
    canvasHeight: ctx.canvas.height,
    aspectRatio: +(ctx.canvas.width / ctx.canvas.height).toFixed(4),
    note: 'Export at any size with this exact ratio; 1280x800 is a good target. The image is ' +
      'object-fit: cover inside a rounded frame, so keep anything that matters away from the ' +
      'outermost 12px and expect the corners to be rounded off.'
  },
  swapProcedure: [
    'Paint one image per room, named den-1.webp .. den-4.webp, and put them in assets/den.',
    'Set the matching room\'s art field in DEN_ROOMS to "assets/den/den-N.webp".',
    'Change nothing else: the creature and the treasures are positioned from the anchors.',
    'If the painting puts its shelves or its floor somewhere else, edit that room\'s pet/shelves ' +
      'numbers here in canvas units and regenerate this file. Do not edit index.html\'s CSS.',
    'Ship WebP. A test fails if a PNG appears in assets.'
  ],
  rooms: ctx.rooms.map(room => ({
    level: room.level,
    name: room.name,
    unlockedAtBadges: room.badges,
    art: room.art || null,
    mood: room.blurb,
    petAnchor: {
      x: room.pet.x, y: room.pet.y, height: room.pet.height,
      note: 'x is her centre, y is the floor line her feet stand on, height is how tall she is ' +
        'drawn. Keep this footprint clear of detail: a box ' +
        Math.round(room.pet.height * 0.9) + ' wide by ' + room.pet.height + ' tall, centred on x, ' +
        'sitting on y.'
    },
    shelves: room.shelves.map((shelf, i) => ({
      index: i,
      surfaceY: shelf.y,
      x1: shelf.x1, x2: shelf.x2, slots: shelf.slots,
      slotCentresX: ctx.slots(shelf).map(x => Math.round(x)),
      note: 'Paint a plank whose TOP SURFACE is exactly y=' + shelf.y + '. Treasures are drawn ' +
        'standing on that line at the x centres listed, about 26 canvas units tall.'
    })),
    clearAreas: [{x: room.pet.x - room.pet.height * 0.45, y: room.pet.y - room.pet.height,
      width: room.pet.height * 0.9, height: room.pet.height, what: 'the creature'}]
      .concat(room.shelves.map(shelf => ({
        x: shelf.x1, y: shelf.y - 30, width: shelf.x2 - shelf.x1, height: 30,
        what: 'treasures on the plank'
      }))).map(a => ({x: Math.round(a.x), y: Math.round(a.y),
        width: Math.round(a.width), height: Math.round(a.height), what: a.what}))
  })),
  treasures: ctx.items.map(i => ({id: i.id, emoji: i.emoji, name: i.name}))
};
fs.writeFileSync(path.join(root, 'docs', 'DEN_ART_SPEC.json'), JSON.stringify(spec, null, 2) + '\n');

// and the same brief as a picture, which is easier to paint to than a list of numbers
const W = ctx.canvas.width, H = ctx.canvas.height, GAP = 34, COLS = 2;
const rows = Math.ceil(spec.rooms.length / COLS);
const sheetW = COLS * W + (COLS + 1) * GAP, sheetH = rows * (H + 44) + (rows + 1) * GAP;
const g = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheetW} ${sheetH}" width="${sheetW}" height="${sheetH}">`,
  `<rect width="${sheetW}" height="${sheetH}" fill="#FFF9FE"/>`,
  `<style>text{font-family:system-ui,sans-serif}.t{font-size:19px;font-weight:700;fill:#50319A}` +
  `.l{font-size:12px;font-weight:700;fill:#8069B5}.k{font-size:11px;fill:#D94B92;font-weight:700}</style>`];
spec.rooms.forEach((room, i) => {
  const ox = GAP + (i % COLS) * (W + GAP), oy = GAP + Math.floor(i / COLS) * (H + 44 + GAP);
  g.push(`<text class="t" x="${ox}" y="${oy + 16}">Room ${room.level} — ${room.name}` +
    ` <tspan class="l">(${room.unlockedAtBadges} badges)</tspan></text>`);
  g.push(`<g transform="translate(${ox},${oy + 30})">`);
  g.push(`<rect width="${W}" height="${H}" fill="#EDE7F7" stroke="#50319A" stroke-width="2" rx="10"/>`);
  g.push(`<line x1="0" y1="${room.petAnchor.y}" x2="${W}" y2="${room.petAnchor.y}" stroke="#2E9E7A" stroke-width="2"/>`);
  g.push(`<text class="k" x="6" y="${room.petAnchor.y - 6}" fill="#2E9E7A">floor y=${room.petAnchor.y}</text>`);
  room.clearAreas.forEach(a => {
    g.push(`<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" fill="#D94B92" ` +
      `fill-opacity=".13" stroke="#D94B92" stroke-width="2" stroke-dasharray="7 5"/>`);
    g.push(`<text class="k" x="${a.x + 5}" y="${a.y - 5}">keep clear \u2014 ${a.what}</text>`);
  });
  room.shelves.forEach(shelf => {
    g.push(`<line x1="${shelf.x1}" y1="${shelf.surfaceY}" x2="${shelf.x2}" y2="${shelf.surfaceY}" ` +
      `stroke="#50319A" stroke-width="4"/>`);
    g.push(`<text class="k" x="${shelf.x1}" y="${shelf.surfaceY + 17}" fill="#50319A">plank top y=${shelf.surfaceY}</text>`);
    shelf.slotCentresX.forEach(x => g.push(`<circle cx="${x}" cy="${shelf.surfaceY}" r="4" fill="#F2B93B" stroke="#50319A" stroke-width="1.5"/>`));
  });
  g.push(`<circle cx="${room.petAnchor.x}" cy="${room.petAnchor.y}" r="6" fill="#2E9E7A"/>`);
  g.push('</g>');
});
g.push(`<text class="l" x="${GAP}" y="${sheetH - 12}">Canvas ${W}x${H} (ratio ` +
  `${spec.coordinateSystem.aspectRatio}). Paint the backdrop only — dashed boxes are drawn over by the game.</text>`);
g.push('</svg>');
fs.writeFileSync(path.join(root, 'docs', 'DEN_ART_GUIDE.svg'), g.join('\n') + '\n');
console.log('wrote docs/DEN_ART_SPEC.json and docs/DEN_ART_GUIDE.svg — ' + spec.rooms.length + ' rooms');
