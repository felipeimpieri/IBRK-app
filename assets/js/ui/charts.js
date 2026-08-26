/**
 * Graficos en SVG puro: linea de rendimiento y barras horizontales.
 */
import { CAT } from './../config.js';
import { cssVar, fmtDate, fmtPct } from './../format.js';
import { DATA } from './../state.js';

export function smoothPath(pts) {
  if (pts.length < 3) return 'M ' + pts.map(p => p.x + ' ' + p.y).join(' L ');
  let d = 'M ' + pts[0].x + ' ' + pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p2.x + ' ' + p2.y;
  }
  return d;
}

export function renderPerfChart() {
  const series = DATA.performance_series;
  const svg = document.getElementById('perf-chart');
  const tooltip = document.getElementById('perf-tooltip');
  const W = 900, H = 260, PAD_L = 44, PAD_R = 12, PAD_T = 16, PAD_B = 28;
  const cps = series.cps, dates = series.dates;
  const min = Math.min(0, ...cps), max = Math.max(0, ...cps);
  const range = (max - min) || 0.01;
  const x = i => PAD_L + (i/(cps.length-1)) * (W - PAD_L - PAD_R);
  const y = v => PAD_T + (1 - (v - min)/range) * (H - PAD_T - PAD_B);

  const seriesColor = cssVar('--series-1');
  const softColor = cssVar('--series-1-soft');
  const grid = cssVar('--gridline');
  const baseline = cssVar('--baseline');
  const muted = cssVar('--text-muted');
  const good = cssVar('--good'), bad = cssVar('--bad');

  const pts = cps.map((v, i) => ({x: x(i), y: y(v)}));
  let path = smoothPath(pts);
  let area = path + ' L ' + x(cps.length-1) + ' ' + y(min<0?min:0) + ' L ' + x(0) + ' ' + y(min<0?min:0) + ' Z';

  const yTicks = 4;
  let gridSvg = '';
  for (let t=0; t<=yTicks; t++) {
    const v = min + (range * t / yTicks);
    const yy = y(v);
    gridSvg += '<line x1="'+PAD_L+'" y1="'+yy+'" x2="'+(W-PAD_R)+'" y2="'+yy+'" stroke="'+grid+'" stroke-width="1"/>';
    gridSvg += '<text x="'+(PAD_L-8)+'" y="'+(yy+4)+'" font-size="11" fill="'+muted+'" text-anchor="end" font-family="system-ui,sans-serif">'+(v*100).toFixed(1)+'%</text>';
  }
  const zeroY = y(0);
  gridSvg += '<line x1="'+PAD_L+'" y1="'+zeroY+'" x2="'+(W-PAD_R)+'" y2="'+zeroY+'" stroke="'+baseline+'" stroke-width="1" stroke-dasharray="3,3"/>';

  const last = cps[cps.length-1];
  const endColor = last >= 0 ? good : bad;

  svg.innerHTML =
    gridSvg +
    '<path d="'+area+'" fill="'+softColor+'" stroke="none"/>' +
    '<path d="'+path+'" fill="none" stroke="'+seriesColor+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="'+x(cps.length-1)+'" cy="'+y(last)+'" r="4.5" fill="'+endColor+'" stroke="'+cssVar('--surface-1')+'" stroke-width="2"/>' +
    '<line id="crosshair" x1="0" y1="'+PAD_T+'" x2="0" y2="'+(H-PAD_B)+'" stroke="'+muted+'" stroke-width="1" opacity="0" />' +
    '<circle id="hoverdot" cx="0" cy="0" r="4" fill="'+seriesColor+'" stroke="'+cssVar('--surface-1')+'" stroke-width="2" opacity="0"/>' +
    '<rect id="perf-overlay" x="'+PAD_L+'" y="0" width="'+(W-PAD_L-PAD_R)+'" height="'+H+'" fill="transparent" style="cursor:crosshair"/>';

  const overlay = document.getElementById('perf-overlay');
  const crosshair = document.getElementById('crosshair');
  const hoverdot = document.getElementById('hoverdot');
  overlay.addEventListener('mousemove', function(evt){
    const rect = svg.getBoundingClientRect();
    const px = (evt.clientX - rect.left) / rect.width * W;
    let idx = Math.round(((px - PAD_L) / (W - PAD_L - PAD_R)) * (cps.length-1));
    idx = Math.max(0, Math.min(cps.length-1, idx));
    const cx = x(idx), cy = y(cps[idx]);
    crosshair.setAttribute('x1', cx); crosshair.setAttribute('x2', cx); crosshair.setAttribute('opacity', 1);
    hoverdot.setAttribute('cx', cx); hoverdot.setAttribute('cy', cy); hoverdot.setAttribute('opacity', 1);
    tooltip.style.opacity = 1;
    tooltip.style.left = (cx / W * 100) + '%';
    tooltip.style.top = (cy / H * 100) + '%';
    tooltip.innerHTML = fmtDate(dates[idx]) + ' &middot; <b>' + fmtPct(cps[idx]) + '</b>';
  });
  overlay.addEventListener('mouseleave', function(){
    crosshair.setAttribute('opacity', 0); hoverdot.setAttribute('opacity', 0); tooltip.style.opacity = 0;
  });

  const p = DATA.performance;
  document.getElementById('perf-range').innerHTML =
    ['1D','7D','MTD','1M','YTD','1Y'].map(k => '<span>'+k+' &nbsp;<b style="color:'+(p[k]>=0?good:bad)+'">'+fmtPct(p[k])+'</b></span>').join('');
}

export function renderBarChart(elId, items, opts) {
  opts = opts || {};
  let list = items.slice().sort((a,b) => b.weight - a.weight);
  if (list.length > 8) {
    const top = list.slice(0,7);
    const restSum = list.slice(7).reduce((a,b)=>a+b.weight,0);
    list = top.concat([{name:'Otros', weight: restSum}]);
  }
  const el = document.getElementById(elId);
  el.innerHTML = list.map((item, i) => {
    const color = cssVar(CAT[i % CAT.length]);
    const pct = (item.weight*100);
    return '<div class="row">' +
      '<div class="name" title="'+item.name+'">'+item.name+'</div>' +
      '<div class="bar-bg"><div class="bar-fill" style="width:'+Math.max(pct,1.2)+'%;background:'+color+';"></div></div>' +
      '<div class="pct">'+pct.toFixed(1)+'%</div>' +
      '</div>';
  }).join('');
}
