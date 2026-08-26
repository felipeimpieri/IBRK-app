/**
 * Constantes y tablas fijas. Lo unico que hay que tocar para apuntar a otro Supabase.
 */
export const CAT = ['--s1','--s2','--s3','--s4','--s5','--s6','--s7','--s8'];

export const TABS = ['resumen', 'posiciones', 'simulador', 'ideas'];

// Mapea cada instrumento concreto del test opcional de personalización a una de las
// 8 temáticas que ya entiende THEME_IDEAS/renderIdeas() — así elegir "NVDA" tiene el
// mismo efecto que tildar el chip "Tecnología" a mano.
export const INSTRUMENT_THEME_MAP = {
  NVDA: 'tech', KO: 'dividends', RKLB: 'smallcaps', 'BRK.B': 'value', TLT: 'bonds', ICLN: 'esg',
  EWZ: 'intl', FXI: 'intl', EWJ: 'intl', INDA: 'intl', EWG: 'intl', BTC: 'crypto'
};

export const SUPABASE_URL = 'https://udttbufjeznrfpwfbzzz.supabase.co';

export const SUPABASE_ANON_KEY = 'sb_publishable_QbMJixOtimseWozCqs31YA_LRilCxPr';
