/**
 * Formateo de numeros, fechas y clases de color. Sin logica de negocio.
 */
export function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

export function fmtUSD(n, opts) {
  return new Intl.NumberFormat('en-US', Object.assign({style:'currency', currency:'USD', maximumFractionDigits:0}, opts||{})).format(n);
}

export function fmtUSD2(n) { return new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:2}).format(n); }

export function fmtPct(n, digits) { return (n>=0?'+':'') + (n*100).toFixed(digits==null?1:digits) + '%'; }

export function fmtShare(n, digits) { return (n*100).toFixed(digits==null?1:digits) + '%'; }

export function fmtNum(n) { return new Intl.NumberFormat('en-US', {maximumFractionDigits: 4}).format(n); }

export function deltaClass(n) { return n >= 0 ? 'pos' : 'neg'; }

export function fmtDate(yyyymmdd) {
  const y = yyyymmdd.slice(0,4), m = yyyymmdd.slice(4,6), d = yyyymmdd.slice(6,8);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return d + ' ' + meses[parseInt(m,10)-1];
}
