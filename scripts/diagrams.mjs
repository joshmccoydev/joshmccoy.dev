function svg(viewBox, body) {
  return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" focusable="false">${body}</svg>`;
}

const DIAGRAMS = {
  lanes: svg(
    '0 0 640 160',
    `<g fill="none" stroke-width="1"><path class="stroke" d="M320 80 H150 M320 80 H490 M320 80 L210 38 M320 80 L430 122"/><path class="stroke-sig flow" d="M320 80 H150"/></g><g class="fill-s stroke" stroke-width="1"><rect x="40" y="62" width="110" height="36" rx="8"/><rect x="490" y="62" width="110" height="36" rx="8"/><rect x="155" y="18" width="110" height="32" rx="8"/><rect x="375" y="108" width="110" height="32" rx="8"/></g><rect class="fill-bg stroke-sig" x="262" y="62" width="116" height="36" rx="8"/><text class="svgtxt hi" x="320" y="84" text-anchor="middle">asks first</text><g class="svgtxt" text-anchor="middle"><text x="95" y="84">drafts</text><text x="545" y="84">calendar</text><text x="210" y="38">edits</text><text x="430" y="128">code</text></g>`,
  ),
  approve: svg(
    '0 0 320 160',
    `<g class="fill-s stroke"><rect x="20" y="62" width="76" height="36" rx="8"/><rect x="224" y="62" width="76" height="36" rx="8"/></g><rect class="fill-bg stroke-sig" x="122" y="62" width="76" height="36" rx="8"/><path class="stroke-sig flow" d="M96 80 H122 M198 80 H224"/><g class="svgtxt" text-anchor="middle"><text x="58" y="84">draft</text><text class="svgtxt hi" x="160" y="84">approve</text><text x="262" y="84">post</text></g><text class="svgtxt" x="160" y="124" text-anchor="middle">every tuesday · human in the loop</text>`,
  ),
  hud: svg(
    '0 0 320 160',
    `<rect class="fill-s stroke" x="24" y="20" width="272" height="120" rx="8"/><text class="svgtxt hi" x="40" y="42">07:15</text><circle class="fill-sig" cx="276" cy="38" r="3"/><g class="stroke" fill="none"><path d="M24 52 H296 M114 52 V140 M206 52 V140"/></g><g class="fill-bar"><rect x="36" y="64" width="64" height="6" rx="3"/><rect x="36" y="78" width="48" height="6" rx="3"/><rect x="36" y="92" width="56" height="6" rx="3"/><rect x="128" y="64" width="64" height="6" rx="3"/><rect x="128" y="78" width="40" height="6" rx="3"/><rect x="128" y="92" width="60" height="6" rx="3"/><rect x="220" y="64" width="62" height="6" rx="3"/><rect x="220" y="78" width="50" height="6" rx="3"/></g><rect class="fill-sig" x="128" y="112" width="24" height="6" rx="3"/>`,
  ),
  sheet: svg(
    '0 0 320 160',
    `<rect class="fill-s stroke" x="24" y="16" width="272" height="24" rx="6"/><text class="svgtxt" x="36" y="32"><tspan class="svgtxt hi">fx</tspan>  =IF(ISNUMBER(I5),I5,NA())</text><g class="stroke" fill="none"><path d="M24 52 H296 M24 76 H296 M24 100 H296 M24 124 H296 M24 148 H296 M24 52 V148 M96 52 V148 M168 52 V148 M240 52 V148 M296 52 V148"/></g><rect class="fill-wash stroke-sig" x="168" y="76" width="72" height="24"/><g class="svgtxt"><text x="32" y="68">item</text><text x="104" y="68">unit</text><text x="176" y="68">cost</text><text x="248" y="68">%</text><text class="svgtxt hi" x="176" y="92">$2.84</text><text x="248" y="92">28.4</text><text x="176" y="116">$1.10</text><text x="248" y="116">31.0</text></g>`,
  ),
  cron: svg(
    '0 0 320 160',
    `<text class="svg-kicker" x="32" y="44">15 7 * * 1-5</text><text class="svgtxt" x="32" y="64">weekdays · 7:15 am CT</text><path class="stroke" d="M32 104 H288" fill="none"/><g class="fill-s stroke"><circle cx="56" cy="104" r="6"/><circle cx="114" cy="104" r="6"/><circle cx="172" cy="104" r="6"/><circle cx="230" cy="104" r="6"/></g><circle class="fill-sig" cx="288" cy="104" r="7"/><g class="svgtxt" text-anchor="middle"><text x="56" y="128">cal</text><text x="114" y="128">inbox</text><text x="172" y="128">loops</text><text x="230" y="128">bots</text><text class="svgtxt hi" x="288" y="128">note</text></g>`,
  ),
  wordmark: svg(
    '0 0 320 160',
    `<text class="wordmark" x="160" y="78" text-anchor="middle">j0sh<tspan class="fill-sig">.</tspan>wtf</text><text class="svgtxt" x="160" y="108" text-anchor="middle">static · 0 kb js · edge</text>`,
  ),
  sold: svg(
    '0 0 320 160',
    `<rect class="fill-s stroke" x="40" y="28" width="240" height="104" rx="10"/><path class="stroke" d="M72 108 C 96 60, 120 60, 136 92 S 180 120, 200 72 S 240 52, 252 84" fill="none" stroke-width="2" stroke-linecap="round"/><circle class="fill-sig" cx="252" cy="84" r="4"/><text class="svgtxt" x="160" y="152" text-anchor="middle">built · sold</text>`,
  ),
};

export function diagram(name) {
  const markup = DIAGRAMS[name];
  if (!markup) {
    throw new Error(`Unknown diagram: ${name}`);
  }
  return markup;
}

export const diagramNames = Object.keys(DIAGRAMS);
