// Home screen icons (iOS apple-touch-icon, Android manifest icons) from the logo mark of components/atoms/logo.tsx, in a light and a dark set.
// Home screens don't switch icons with dark mode, so pages/_document.tsx points at the set matching the device theme when the app is added.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";

// The logo's colours in each scheme, on a fixed background (the manifests' background_color)
const THEMES = {
  light: { background: "#f6f4ef", ink: "#1d1b18", suffix: "" },
  dark: { background: "#161512", ink: "#f2efe8", suffix: "-dark" },
};

// The logo mark's pockets (components/atoms/logo.tsx): filled with ink or left empty
const POCKETS = [
  [6, 5, 1], [19, 5, 1], [32, 5, 0.2],
  [6, 19.5, 1], [19, 19.5, 1], [32, 19.5, 0.2],
  [6, 34, 1], [19, 34, 0.2], [32, 34, 0.2],
];

// scale: share of the icon that 48 logo units take (the grid is 36×41, the card pulled out of it reaches 28 units above the centre)
// Maskable icons keep the card's farthest corner, ~34 units from the centre, inside the safe circle of radius 40% of the icon
const icon = ({ background, ink }, scale) => {
  // Centred on the 3×3 grid of pockets (x 6–42, y 5–46), so equal margins on opposite sides
  const size = 48 / scale;
  const x = 24 - size / 2;
  const y = 25.5 - size / 2;
  const pockets = POCKETS.map(([px, py, opacity]) => `<rect x="${px}" y="${py}" width="10" height="12" rx="2" fill="${ink}" opacity="${opacity}"/>`).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}">
  <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${background}"/>
  ${pockets}
  <rect x="32.5" y="-1" width="11" height="13.2" rx="2.2" fill="#ad7300" stroke="${background}" stroke-width="1.6" transform="rotate(12 38 5.6)"/>
</svg>`;
};

const OUTPUTS = [
  { name: "apple-touch-icon", size: 180, scale: 0.72 },
  { name: "icon-192", size: 192, scale: 0.84 },
  { name: "icon-512", size: 512, scale: 0.84 },
  { name: "icon-maskable-512", size: 512, scale: 0.55 },
];

for (const theme of Object.values(THEMES)) {
  for (const { name, size, scale } of OUTPUTS) {
    const file = `public/${name}${theme.suffix}.png`;
    await sharp(Buffer.from(icon(theme, scale)), { density: 72 * (size / 48) * scale })
      .resize(size, size)
      .png()
      .toFile(file);
    console.log(`${file} (${size}×${size})`);
  }
}
