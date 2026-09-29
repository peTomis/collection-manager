// Home screen icons (iOS apple-touch-icon, Android manifest icons) from the logo mark of public/favicon.svg, in a light and a dark set.
// Home screens don't switch icons with dark mode, so pages/_document.tsx points at the set matching the device theme when the app is added.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";

// The favicon's colours in each scheme, on a fixed background (the manifests' background_color)
const THEMES = {
  light: { background: "#f6f4ef", ink: "#1d1b18", suffix: "" },
  dark: { background: "#161512", ink: "#f2efe8", suffix: "-dark" },
};

// scale: share of the icon the mark takes (maskable icons keep it inside the central safe circle)
const icon = ({ background, ink }, scale) => {
  // The mark spans 30 units around (16, 14.8) in favicon.svg's coordinates
  const size = 30 / scale;
  const x = 16 - size / 2;
  const y = 14.8 - size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}">
  <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${background}"/>
  <rect x="9.5" y="5" width="13" height="18" rx="2.4" fill="#ad7300" stroke="${background}" stroke-width="1.4" transform="rotate(-20 16 27)"/>
  <rect x="9.5" y="5" width="13" height="18" rx="2.4" fill="#7860b5" stroke="${background}" stroke-width="1.4"/>
  <rect x="9.5" y="5" width="13" height="18" rx="2.4" fill="${ink}" stroke="${background}" stroke-width="1.4" transform="rotate(20 16 27)"/>
  <rect x="13.6" y="10.6" width="4.8" height="4.8" fill="${background}" transform="rotate(20 16 27) rotate(45 16 13)"/>
</svg>`;
};

const OUTPUTS = [
  { name: "apple-touch-icon", size: 180, scale: 0.62 },
  { name: "icon-192", size: 192, scale: 0.62 },
  { name: "icon-512", size: 512, scale: 0.62 },
  { name: "icon-maskable-512", size: 512, scale: 0.5 },
];

for (const theme of Object.values(THEMES)) {
  for (const { name, size, scale } of OUTPUTS) {
    const file = `public/${name}${theme.suffix}.png`;
    await sharp(Buffer.from(icon(theme, scale)), { density: 72 * (size / 30) * scale })
      .resize(size, size)
      .png()
      .toFile(file);
    console.log(`${file} (${size}×${size})`);
  }
}
