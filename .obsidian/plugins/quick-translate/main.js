var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => QuickTranslatePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/languages.ts
var LANGUAGES = {
  af: "Afrikaans",
  ar: "Arabic",
  bg: "Bulgarian",
  ca: "Catalan",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  et: "Estonian",
  fa: "Persian",
  fi: "Finnish",
  fr: "French",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  id: "Indonesian",
  is: "Icelandic",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  lt: "Lithuanian",
  lv: "Latvian",
  ms: "Malay",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sr: "Serbian",
  sv: "Swedish",
  sw: "Swahili",
  th: "Thai",
  tl: "Filipino",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)"
};
var DEFAULT_TARGET = "en";
var SOURCE_LANGUAGES = { auto: "Detect the language", ...LANGUAGES };
function languageName(code) {
  var _a;
  return (_a = LANGUAGES[code]) != null ? _a : code;
}
function matchLocale(locale) {
  const lower = locale.trim().toLowerCase().replace("_", "-");
  if (!lower)
    return null;
  const exact = Object.keys(LANGUAGES).find((code) => code.toLowerCase() === lower);
  if (exact)
    return exact;
  if (lower.startsWith("zh"))
    return /tw|hk|hant/.test(lower) ? "zh-TW" : "zh-CN";
  const base = lower.split("-")[0];
  if (base === "nb" || base === "nn")
    return "no";
  if (base === "iw")
    return "he";
  return base in LANGUAGES ? base : null;
}
function normalizeDetected(code) {
  var _a;
  if (!code)
    return void 0;
  return (_a = matchLocale(code)) != null ? _a : code;
}
var DEEPL_TARGETS = {
  ar: "AR",
  bg: "BG",
  cs: "CS",
  da: "DA",
  de: "DE",
  el: "EL",
  en: "EN-US",
  es: "ES",
  et: "ET",
  fi: "FI",
  fr: "FR",
  he: "HE",
  hu: "HU",
  id: "ID",
  it: "IT",
  ja: "JA",
  ko: "KO",
  lt: "LT",
  lv: "LV",
  no: "NB",
  nl: "NL",
  pl: "PL",
  pt: "PT-BR",
  ro: "RO",
  ru: "RU",
  sk: "SK",
  sl: "SL",
  sv: "SV",
  th: "TH",
  tr: "TR",
  uk: "UK",
  vi: "VI",
  "zh-CN": "ZH-HANS",
  "zh-TW": "ZH-HANT"
};
function deepLTarget(code) {
  var _a;
  return (_a = DEEPL_TARGETS[code]) != null ? _a : null;
}
function deepLSource(code) {
  const target = DEEPL_TARGETS[code];
  return target ? target.split("-")[0] : null;
}

// src/providers.ts
var PROVIDERS = {
  google: "Google Translate (no key, unofficial)",
  deepl: "DeepL (your own key)",
  mymemory: "MyMemory (no key, limited per day)"
};
var TranslateError = class extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "TranslateError";
    this.kind = kind;
  }
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function failStatus(status, service) {
  if (status === 429)
    throw new TranslateError("rate-limited", `${service} says too many requests. Wait a minute and try again.`);
  if (status === 403 || status === 503)
    throw new TranslateError("blocked", `${service} refused the request (${status}).`);
  throw new TranslateError("bad-response", `${service} answered with status ${status}.`);
}
var encode = encodeURIComponent;
var utf8Bytes = (text) => new TextEncoder().encode(text).length;
function splitLong(text, max, measure = (t) => t.length) {
  var _a, _b;
  if (measure(text) <= max)
    return [text];
  const out = [];
  let current = "";
  const add = (piece) => {
    if (current && measure(current + piece) > max) {
      out.push(current);
      current = "";
    }
    if (measure(piece) > max) {
      for (const ch of piece) {
        if (current && measure(current + ch) > max) {
          out.push(current);
          current = "";
        }
        current += ch;
      }
      return;
    }
    current += piece;
  };
  const sentences = (_a = text.match(/[^.!?。！？]+[.!?。！？]*\s*|\s+/g)) != null ? _a : [text];
  for (const sentence of sentences) {
    if (measure(sentence) <= max)
      add(sentence);
    else
      for (const word of (_b = sentence.match(/\S+\s*|\s+/g)) != null ? _b : [sentence])
        add(word);
  }
  if (current)
    out.push(current);
  return out;
}
function groups(texts, max, size, count = Infinity) {
  const out = [];
  let current = [];
  let total = 0;
  for (const text of texts) {
    const s = size(text);
    if (current.length > 0 && (total + s > max || current.length >= count)) {
      out.push(current);
      current = [];
      total = 0;
    }
    current.push(text);
    total += s;
  }
  if (current.length > 0)
    out.push(current);
  return out;
}
var GOOGLE_QUERY_LIMIT = 3e3;
function googleUrl(text, { source, target }) {
  return `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encode(source)}&tl=${encode(target)}&dt=t&dj=1&q=${encode(text)}`;
}
function parseGoogle(json) {
  let text = "";
  let detected;
  if (isRecord(json) && Array.isArray(json.sentences)) {
    for (const s of json.sentences)
      if (isRecord(s) && typeof s.trans === "string")
        text += s.trans;
    detected = json.src;
  } else if (Array.isArray(json) && Array.isArray(json[0])) {
    for (const s of json[0])
      if (Array.isArray(s) && typeof s[0] === "string")
        text += s[0];
    detected = json[2];
  } else
    return null;
  return { text, detected: typeof detected === "string" ? normalizeDetected(detected) : void 0 };
}
async function googleOne(text, languages, http) {
  let res;
  try {
    res = await http({ url: googleUrl(text, languages) });
  } catch (e) {
    throw new TranslateError("network", "Could not reach Google Translate. Check your connection.");
  }
  if (res.status !== 200)
    failStatus(res.status, "Google Translate");
  const parsed = parseGoogle(res.json);
  if (!parsed)
    throw new TranslateError("bad-response", "Google Translate answered in a format this version does not know. Try another provider.");
  return parsed;
}
var encodedLength = (text) => encode(text).length;
var GOOGLE_PIECE = 1e3;
var google = {
  id: "google",
  async translate(texts, languages, http) {
    const pieces = texts.map((t) => splitLong(t, GOOGLE_PIECE, encodedLength));
    const answers = [];
    let detected;
    for (const batch of groups(pieces.flat(), GOOGLE_QUERY_LIMIT, (t) => encodedLength(t) + 3)) {
      let lines = null;
      if (batch.length > 1) {
        const got = await googleOne(batch.join("\n"), languages, http);
        detected != null ? detected : detected = got.detected;
        const split = got.text.replace(/\n+$/, "").split("\n");
        if (split.length === batch.length && split.every((s) => s.trim()))
          lines = split;
      }
      if (!lines) {
        lines = [];
        for (const piece of batch) {
          const got = await googleOne(piece, languages, http);
          detected != null ? detected : detected = got.detected;
          lines.push(got.text);
        }
      }
      answers.push(...lines);
    }
    let at = 0;
    const out = pieces.map((parts) => {
      const text = parts.map((original, i) => {
        var _a;
        return answers[at + i].trimEnd() + ((_a = /\s*$/.exec(original)) == null ? void 0 : _a[0]);
      }).join("");
      at += parts.length;
      return text;
    });
    return { texts: out, detected };
  }
};
var DEEPL_TEXTS = 40;
var DEEPL_BYTES = 6e4;
function deepLHost(key) {
  return key.trim().endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
}
function parseDeepL(json) {
  if (!isRecord(json) || !Array.isArray(json.translations))
    return null;
  const texts = [];
  const detected = [];
  for (const t of json.translations) {
    if (!isRecord(t) || typeof t.text !== "string")
      return null;
    texts.push(t.text);
    detected.push(typeof t.detected_source_language === "string" ? normalizeDetected(t.detected_source_language.toLowerCase()) : void 0);
  }
  return { texts, detected };
}
function deepL(key) {
  return {
    id: "deepl",
    async translate(texts, { source, target }, http) {
      if (!key.trim())
        throw new TranslateError("auth", "Add your DeepL key in the settings first.");
      const to = deepLTarget(target);
      if (!to)
        throw new TranslateError("unsupported", `DeepL does not translate into ${languageName(target)}.`);
      const from = source === "auto" ? void 0 : deepLSource(source);
      if (source !== "auto" && !from)
        throw new TranslateError("unsupported", `DeepL does not read ${languageName(source)}.`);
      const out = [];
      let detected;
      for (const batch of groups(texts, DEEPL_BYTES, utf8Bytes, DEEPL_TEXTS)) {
        let res;
        try {
          res = await http({
            url: `${deepLHost(key)}/v2/translate`,
            method: "POST",
            headers: { Authorization: `DeepL-Auth-Key ${key.trim()}`, "Content-Type": "application/json" },
            body: JSON.stringify({ text: batch, target_lang: to, ...from ? { source_lang: from } : {}, preserve_formatting: true })
          });
        } catch (e) {
          throw new TranslateError("network", "Could not reach DeepL. Check your connection.");
        }
        if (res.status === 403)
          throw new TranslateError("auth", "DeepL rejected the key. Check it in the settings.");
        if (res.status === 456)
          throw new TranslateError("quota", "Your DeepL quota is used up for this period.");
        if (res.status === 400)
          throw new TranslateError("unsupported", "DeepL could not translate that text between those languages.");
        if (res.status !== 200)
          failStatus(res.status, "DeepL");
        const parsed = parseDeepL(res.json);
        if (!parsed || parsed.texts.length !== batch.length)
          throw new TranslateError("bad-response", "DeepL answered in a format this version does not know.");
        out.push(...parsed.texts);
        detected != null ? detected : detected = parsed.detected.find(Boolean);
      }
      return { texts: out, detected };
    }
  };
}
var MYMEMORY_BYTES = 450;
function myMemoryUrl(text, { source, target }, email) {
  const pair = `${source === "auto" ? "Autodetect" : source}|${target}`;
  return `https://api.mymemory.translated.net/get?q=${encode(text)}&langpair=${encode(pair)}${email.trim() ? `&de=${encode(email.trim())}` : ""}`;
}
function parseMyMemory(json, original) {
  if (!isRecord(json) || !isRecord(json.responseData) || typeof json.responseData.translatedText !== "string") {
    throw new TranslateError("bad-response", "MyMemory answered in a format this version does not know.");
  }
  const text = json.responseData.translatedText;
  const status = Number(json.responseStatus);
  if (json.quotaFinished === true || /^MYMEMORY WARNING/i.test(text)) {
    throw new TranslateError("quota", "MyMemory\u2019s free daily limit is used up. Add an email in the settings for a larger one, or try again tomorrow.");
  }
  if (status === 403 && /DISTINCT LANGUAGES/i.test(text))
    return original;
  if (status !== 200)
    throw new TranslateError("unsupported", `MyMemory could not translate that: ${text.slice(0, 120)}`);
  return text;
}
function myMemory(email) {
  return {
    id: "mymemory",
    async translate(texts, languages, http) {
      const out = [];
      for (const text of texts) {
        const pieces = [];
        for (const piece of splitLong(text, MYMEMORY_BYTES, utf8Bytes)) {
          let res;
          try {
            res = await http({ url: myMemoryUrl(piece, languages, email) });
          } catch (e) {
            throw new TranslateError("network", "Could not reach MyMemory. Check your connection.");
          }
          if (res.status !== 200)
            failStatus(res.status, "MyMemory");
          pieces.push(parseMyMemory(res.json, piece));
        }
        out.push(pieces.join(""));
      }
      return { texts: out };
    }
  };
}

// src/segment.ts
var LETTER = /\p{L}/u;
function keep(text) {
  return { text, keep: true };
}
function prose(text) {
  return { text, keep: !LETTER.test(text) };
}
function tidy(parts) {
  const out = [];
  for (const part of parts) {
    if (!part.text)
      continue;
    const last = out[out.length - 1];
    if (last && last.keep === part.keep && !last.cell && !part.cell)
      last.text += part.text;
    else
      out.push({ ...part });
  }
  return out;
}
var INLINE = new RegExp(
  [
    "`+",
    // 1: code span, closed by hand
    "\\$\\$[^\\n]*?\\$\\$",
    // 2: display maths on one line
    "\\$(?=[^\\s$])[^$\\n]*?[^\\s$]\\$(?!\\d)|\\$[^\\s$]\\$(?!\\d)",
    // 3: inline maths, but not "$5 and $10"
    "!?\\[\\[[^\\]\\n]*\\]\\]",
    // 4: wikilink or embed
    "!\\[[^\\]\\n]*\\]\\([^)\\n]*\\)",
    // 5: image
    "\\[([^\\]\\n]*)\\]\\(([^)\\n]*)\\)",
    // 6 (groups 1, 2): link
    "<[a-z][a-z0-9+.-]*:[^>\\s]+>",
    // 7: autolink
    "https?://[^\\s<>]+",
    // 8: bare address
    "</?[A-Za-z][^>\\n]*>",
    // 9: HTML tag
    "<%[^\\n]*?%>",
    // 10: Templater
    "\\[\\^[^\\]\\n]+\\]",
    // 11: footnote reference
    "%%[^\\n]*?%%|<!--[^\\n]*?-->",
    // 12: comment, Obsidian's or HTML
    "\\\\[\\\\`*_{}\\[\\]()#+\\-.!|~>$%^=]",
    // 13: escape
    "\\*\\*|__|~~|==",
    // 14: emphasis markers
    "#[\\p{L}\\p{N}_/-]+",
    // 15: tag
    "\\^[A-Za-z0-9-]+\\s*$"
    // 16: block id at the end
  ].join("|"),
  "gu"
);
var ADDRESS_END = /[.,;:!?'")\]}*_]+$/;
function inline(text) {
  const parts = [];
  let pos = 0;
  const flush = (end) => {
    if (end > pos)
      parts.push(prose(text.slice(pos, end)));
  };
  INLINE.lastIndex = 0;
  for (let m = INLINE.exec(text); m; m = INLINE.exec(text)) {
    const start = m.index;
    let end = start + m[0].length;
    const before = start > 0 ? text[start - 1] : "";
    const first = m[0][0];
    if (first === "`") {
      const close = findBackticks(text, end, m[0].length);
      if (close < 0) {
        INLINE.lastIndex = end;
        continue;
      }
      end = close;
    } else if (first === "#") {
      if (before && !/[\s([{]/.test(before) || !/\D/.test(m[0].slice(1))) {
        INLINE.lastIndex = start + 1;
        continue;
      }
    } else if (first === "^") {
      if (before && !/\s/.test(before)) {
        INLINE.lastIndex = start + 1;
        continue;
      }
    } else if (m[1] !== void 0 && first === "[") {
      flush(start);
      parts.push(keep("["), ...inline(m[1]), keep(`](${m[2]})`));
      pos = end;
      INLINE.lastIndex = end;
      continue;
    } else if (first === "h") {
      const trailing = ADDRESS_END.exec(m[0]);
      if (trailing)
        end -= trailing[0].length;
    }
    flush(start);
    parts.push(keep(text.slice(start, end)));
    pos = end;
    INLINE.lastIndex = end;
  }
  flush(text.length);
  return tidy(parts);
}
function findBackticks(text, from, size) {
  let i = from;
  while (i < text.length) {
    if (text[i] !== "`") {
      i++;
      continue;
    }
    let j = i;
    while (text[j] === "`")
      j++;
    if (j - i === size)
      return j;
    i = j;
  }
  return -1;
}
var RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
var TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
var HEADING = /^(\s{0,3}#{1,6}\s+)(.*?)(\s+#+\s*)?$/;
var QUOTE = /^(?:\s*>)+[ \t]?/;
var CALLOUT = /^\[![^\]\n]+\][+-]?\s*/;
var LIST = /^\s*(?:[-*+]|\d+[.)])[ \t]+(?:\[[^\]\n]\][ \t]+)?/;
var FOOTNOTE_DEFINITION = /^\s*\[\^[^\]\n]+\]:[ \t]*/;
var LINK_DEFINITION = /^\s*\[[^\]\n]+\]:\s*\S+(\s+("[^"]*"|'[^']*'|\([^)]*\)))?\s*$/;
function proseLine(line) {
  if (!line.trim() || RULE.test(line) || LINK_DEFINITION.test(line))
    return [keep(line)];
  if (line.includes("|") && TABLE_SEPARATOR.test(line))
    return [keep(line)];
  const parts = [];
  let rest = line;
  const take = (re) => {
    const m = re.exec(rest);
    if (!m || !m[0])
      return false;
    parts.push(keep(m[0]));
    rest = rest.slice(m[0].length);
    return true;
  };
  if (take(QUOTE))
    take(CALLOUT);
  const heading = HEADING.exec(rest);
  if (heading) {
    parts.push(keep(heading[1]), ...inline(heading[2]));
    if (heading[3])
      parts.push(keep(heading[3]));
    return tidy(parts);
  }
  if (!take(FOOTNOTE_DEFINITION))
    take(LIST);
  if (rest.trimStart().startsWith("|")) {
    for (const part of inline(rest)) {
      if (part.keep) {
        parts.push(part);
        continue;
      }
      part.text.split("|").forEach((cell, i) => {
        if (i > 0)
          parts.push({ text: "|", keep: true, cell: true });
        parts.push(prose(cell));
      });
    }
    return tidy(parts);
  }
  parts.push(...inline(rest));
  return tidy(parts);
}
var FENCE = /^\s*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?(`{3,}|~{3,})/;
var RAW_HTML = /^<(pre|script|style|textarea)(?=[\s>]|$)/i;
var QUOTE_MARKERS = /^(?:[ \t]*>[ \t]?)*/;
function quoteDepth(line) {
  var _a, _b;
  return ((_b = (_a = QUOTE_MARKERS.exec(line)) == null ? void 0 : _a[0]) != null ? _b : "").split(">").length - 1;
}
function segment(source) {
  var _a, _b, _c;
  if (!source)
    return [];
  const pieces = source.split(/(\r?\n)/);
  const out = [];
  let fence = "";
  let math = false;
  let depth = 0;
  let comment = "";
  let frontMatter = pieces[0].trimEnd() === "---" && pieces.some((p, i) => i > 0 && i % 2 === 0 && (p.trim() === "---" || p.trim() === "..."));
  for (let i = 0; i < pieces.length; i += 2) {
    const text = pieces[i];
    const eol = (_a = pieces[i + 1]) != null ? _a : "";
    if (i > 0 && !text && !eol)
      break;
    const whole = () => [keep(text + eol)];
    const body = text.slice(((_c = (_b = QUOTE_MARKERS.exec(text)) == null ? void 0 : _b[0]) != null ? _c : "").length);
    const trimmed = body.trim();
    if ((fence || math) && quoteDepth(text) < depth) {
      fence = "";
      math = false;
    }
    if (frontMatter) {
      out.push(whole());
      if (i > 0 && (trimmed === "---" || trimmed === "..."))
        frontMatter = false;
      continue;
    }
    if (fence) {
      out.push(whole());
      const close = FENCE.exec(body);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length && trimmed === close[1] && quoteDepth(text) === depth) {
        fence = "";
      }
      continue;
    }
    if (math) {
      out.push(whole());
      if (trimmed.includes("$$"))
        math = false;
      continue;
    }
    if (comment) {
      out.push(whole());
      if (comment === "%%" || comment === "-->" ? trimmed.includes(comment) : trimmed.toLowerCase().includes(comment))
        comment = "";
      continue;
    }
    const open = FENCE.exec(body);
    if (open) {
      fence = open[1];
      depth = quoteDepth(text);
      out.push(whole());
      continue;
    }
    if (trimmed.startsWith("$$") && !(trimmed.length > 3 && trimmed.endsWith("$$"))) {
      math = true;
      depth = quoteDepth(text);
      out.push(whole());
      continue;
    }
    const raw = RAW_HTML.exec(trimmed);
    if (raw) {
      out.push(whole());
      const closer = `</${raw[1].toLowerCase()}>`;
      if (!trimmed.toLowerCase().includes(closer))
        comment = closer;
      continue;
    }
    if (trimmed.startsWith("<!--") && !trimmed.includes("-->")) {
      comment = "-->";
      out.push(whole());
      continue;
    }
    if (trimmed === "%%" || trimmed.startsWith("%%") && !trimmed.slice(2).includes("%%")) {
      comment = "%%";
      out.push(whole());
      continue;
    }
    if (trimmed.startsWith("<!--")) {
      out.push(whole());
      continue;
    }
    out.push(tidy([...proseLine(text), keep(eol)]));
  }
  return out;
}
function join(lines) {
  return lines.map((line) => line.map((p) => p.text).join("")).join("");
}

// src/document.ts
var HOLE = /\{\s*(\d+)\s*\}/g;
function edges(text) {
  const core = text.trim();
  if (!core)
    return { before: text, core: "", after: "" };
  const start = text.indexOf(core);
  return { before: text.slice(0, start), core, after: text.slice(start + core.length) };
}
function regions(line) {
  const out = [];
  let from = 0;
  line.forEach((part, i) => {
    if (!part.cell)
      return;
    out.push([from, i]);
    from = i + 1;
  });
  out.push([from, line.length]);
  return out;
}
function unitOf(line, lo, hi) {
  const indexes = [];
  for (let i = lo; i < hi; i++)
    if (!line[i].keep)
      indexes.push(i);
  if (indexes.length < 2)
    return null;
  const from = indexes[0];
  const to = indexes[indexes.length - 1];
  const holes = [];
  let text = "";
  for (let i = from; i <= to; i++) {
    const part = line[i];
    if (part.keep)
      text += `{${holes.push(part.text) - 1}}`;
    else {
      if (/\{\s*\d+\s*\}/.test(part.text))
        return null;
      text += part.text;
    }
  }
  return { from, to, text, holes };
}
function restore(unit, translated) {
  const seen = /* @__PURE__ */ new Set();
  let ok = true;
  const text = translated.replace(HOLE, (whole, n) => {
    const index = Number(n);
    if (index >= unit.holes.length || seen.has(index)) {
      ok = false;
      return whole;
    }
    seen.add(index);
    return unit.holes[index];
  });
  return ok && seen.size === unit.holes.length ? text : null;
}
async function translateMarkdown(source, translate) {
  const lines = segment(source);
  const jobs = [];
  const queue = [];
  const slots = /* @__PURE__ */ new Map();
  const ask = (text) => {
    let index = slots.get(text);
    if (index === void 0) {
      index = queue.push(text) - 1;
      slots.set(text, index);
    }
    return index;
  };
  for (const line of lines) {
    for (const [lo, hi] of regions(line)) {
      const unit = unitOf(line, lo, hi);
      if (unit) {
        jobs.push({ line, unit, parts: [], slot: [ask(edges(unit.text).core)] });
        continue;
      }
      const parts = line.slice(lo, hi).filter((p) => !p.keep);
      if (parts.length > 0)
        jobs.push({ line, unit: null, parts, slot: parts.map((p) => ask(edges(p.text).core)) });
    }
  }
  if (queue.length === 0)
    return source;
  const first = await translate(queue);
  if (first.length !== queue.length)
    throw new Error("The translator returned a different number of texts.");
  const put = (part, translated) => {
    const { before, after } = edges(part.text);
    part.text = before + translated.trim() + after;
  };
  const retry = [];
  for (const job of [...jobs].reverse()) {
    const { line, unit } = job;
    if (!unit) {
      job.parts.forEach((part, i) => put(part, first[job.slot[i]]));
      continue;
    }
    const restored = restore(unit, first[job.slot[0]]);
    if (restored === null) {
      for (let i = unit.from; i <= unit.to; i++)
        if (!line[i].keep)
          retry.push(line[i]);
      continue;
    }
    const lead = edges(line[unit.from].text).before;
    const trail = edges(line[unit.to].text).after;
    line.splice(unit.from, unit.to - unit.from + 1, { text: lead + restored.trim() + trail, keep: false });
  }
  if (retry.length > 0) {
    const again = await translate(retry.map((part) => edges(part.text).core));
    if (again.length !== retry.length)
      throw new Error("The translator returned a different number of texts.");
    retry.forEach((part, i) => put(part, again[i]));
  }
  return join(lines);
}

// src/translator.ts
var CHUNK = 25;
var CACHE_LIMIT = 3e3;
var RETRY_DELAYS = [2e3, 5e3];
function providerFor(id, settings) {
  if (id === "deepl")
    return deepL(settings.deeplKey);
  if (id === "mymemory")
    return myMemory(settings.email);
  return google;
}
var Translator = class {
  constructor(http, sleep = () => Promise.resolve()) {
    this.cache = /* @__PURE__ */ new Map();
    this.http = http;
    this.sleep = sleep;
  }
  key(provider, { source, target }, text) {
    return `${provider}\0${source}\0${target}\0${text}`;
  }
  async run(provider, texts, languages) {
    for (let attempt = 0; ; attempt++) {
      try {
        const got = await provider.translate(texts, languages, this.http);
        if (got.texts.length !== texts.length || got.texts.some((t, i) => !t.trim() && texts[i].trim())) {
          throw new TranslateError("bad-response", "The translation came back incomplete.");
        }
        return got;
      } catch (error) {
        if (error instanceof TranslateError && error.kind === "rate-limited" && attempt < RETRY_DELAYS.length) {
          await this.sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        throw error;
      }
    }
  }
  /** Translates `texts` (no blank ones), reporting after each chunk how many are done. It throws a `TranslateError`. */
  async translate(texts, languages, settings, progress) {
    let provider = settings.provider;
    let detected;
    let fellBack;
    const out = new Array(texts.length);
    const missing = [];
    texts.forEach((text, i) => {
      const hit = this.cache.get(this.key(provider, languages, text));
      if (hit === void 0)
        missing.push(i);
      else {
        out[i] = hit.text;
        detected != null ? detected : detected = hit.detected;
      }
    });
    progress == null ? void 0 : progress(texts.length - missing.length, texts.length);
    for (let at = 0; at < missing.length; at += CHUNK) {
      const slice = missing.slice(at, at + CHUNK);
      const chunk = slice.map((i) => texts[i]);
      let got;
      try {
        got = await this.run(providerFor(provider, settings), chunk, languages);
      } catch (error) {
        const reason = error instanceof TranslateError ? error : new TranslateError("bad-response", "The translation failed.");
        if (provider === "mymemory" || !settings.fallback || reason.kind === "auth")
          throw reason;
        fellBack = reason.message;
        provider = "mymemory";
        got = await this.run(providerFor(provider, settings), chunk, languages);
      }
      detected != null ? detected : detected = got.detected;
      slice.forEach((i, j) => {
        out[i] = got.texts[j];
        this.remember(this.key(provider, languages, texts[i]), { text: got.texts[j], detected: got.detected });
      });
      progress == null ? void 0 : progress(texts.length - missing.length + at + slice.length, texts.length);
    }
    return { texts: out, detected, provider, fellBack };
  }
  remember(key, value) {
    if (this.cache.size >= CACHE_LIMIT)
      this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, value);
  }
};
async function translateDocument(translator, source, languages, settings, progress) {
  const result = { text: source, provider: settings.provider, sent: false };
  const text = await translateMarkdown(source, async (texts) => {
    var _a, _b;
    result.sent = true;
    const got = await translator.translate(texts, languages, settings, progress);
    (_a = result.detected) != null ? _a : result.detected = got.detected;
    result.provider = got.provider;
    (_b = result.fellBack) != null ? _b : result.fellBack = got.fellBack;
    return got.texts;
  });
  result.text = text;
  return result;
}

// main.ts
var appLocale = () => import_obsidian.moment.locale();
var SELECTION_ACTIONS = {
  popup: "Show it in a window",
  replace: "Replace the selection",
  below: "Insert it below"
};
var DEFAULT_SETTINGS = {
  provider: "google",
  target: DEFAULT_TARGET,
  source: "auto",
  fallback: true,
  deeplSecret: "",
  email: "",
  selectionAction: "popup",
  folder: "",
  openTranslatedNote: true
};
var TEXT = {
  provider: {
    name: "Translation service",
    desc: "Google Translate needs no account but uses an unofficial web address that Google can change. DeepL needs your own key. MyMemory needs nothing and allows a limited amount of text a day. Your text is sent to the service you pick."
  },
  target: { name: "Translate into", desc: "The language the translation comes out in. Each command also has a version that asks." },
  source: { name: "Translate from", desc: "Leave on detect unless the service guesses the wrong language." },
  fallback: {
    name: "Retry with MyMemory",
    desc: "When the service you picked is down or refuses a request, send that text to MyMemory instead. Turn off to send text only to the service you picked. A wrong DeepL key is never retried elsewhere."
  },
  deeplSecret: { name: "DeepL key", desc: "Stored in Obsidian\u2019s secret storage, not in this plugin\u2019s settings file. Free keys end in :fx." },
  email: { name: "MyMemory email", desc: "Optional. MyMemory allows more text a day when it knows an address. It is sent with each request." },
  selectionAction: { name: "Translate selection", desc: "What the command does with the translation. The window lets you copy it or choose another language first." },
  folder: { name: "Translated notes folder", desc: "New notes are created here. Empty puts each one beside its original." },
  openTranslatedNote: { name: "Open the translated note", desc: "Open a note in a new tab when it is made." }
};
var QuickTranslatePlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    /**
     * Every request goes through here. A property, so the end-to-end tests can replace it and run without a network.
     */
    this.http = async ({ url, method, headers, body }) => {
      const { "Content-Type": contentType, ...rest } = headers != null ? headers : {};
      const res = await (0, import_obsidian.requestUrl)({ url, method, headers: rest, body, contentType, throw: false });
      let json = null;
      try {
        json = res.json;
      } catch (e) {
      }
      return { status: res.status, json };
    };
    this.translator = new Translator(
      (request) => this.http(request),
      (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
    );
    /** Notes being translated, so a second command on the same note waits. */
    this.busy = /* @__PURE__ */ new Set();
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new QuickTranslateSettingTab(this.app, this));
    this.addCommand({
      id: "translate-selection",
      name: "Translate selection",
      icon: "languages",
      editorCallback: (editor) => void this.translateSelection(editor, this.settings.target)
    });
    this.addCommand({
      id: "translate-selection-to",
      name: "Translate selection into\u2026",
      icon: "languages",
      editorCallback: (editor) => this.pickLanguage((code) => void this.translateSelection(editor, code))
    });
    this.addCommand({
      id: "translate-selection-replace",
      name: "Translate selection and replace it",
      icon: "replace",
      editorCallback: (editor) => void this.translateSelection(editor, this.settings.target, "replace")
    });
    this.addCommand({
      id: "translate-selection-below",
      name: "Translate selection and insert it below",
      icon: "arrow-down-to-line",
      editorCallback: (editor) => void this.translateSelection(editor, this.settings.target, "below")
    });
    this.addCommand({
      id: "translate-note",
      name: "Translate note into a new note",
      icon: "file-output",
      checkCallback: (checking) => this.noteCommand(checking, this.settings.target)
    });
    this.addCommand({
      id: "translate-note-to",
      name: "Translate note into a new note in\u2026",
      icon: "file-output",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md")
          return false;
        if (!checking)
          this.pickLanguage((code) => void this.translateNote(file, code));
        return true;
      }
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        if (!editor.getSelection().trim())
          return;
        const target = languageName(this.settings.target);
        menu.addItem(
          (item) => item.setTitle(`Translate selection into ${target}`).setIcon("languages").setSection("selection").onClick(() => void this.translateSelection(editor, this.settings.target))
        );
        menu.addItem(
          (item) => item.setTitle("Translate selection into\u2026").setIcon("languages").setSection("selection").onClick(() => this.pickLanguage((code) => void this.translateSelection(editor, code)))
        );
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian.TFile) || file.extension !== "md")
          return;
        menu.addItem(
          (item) => item.setTitle(`Translate note into ${languageName(this.settings.target)}`).setIcon("file-output").setSection("action").onClick(() => void this.translateNote(file, this.settings.target))
        );
      })
    );
  }
  async loadSettings() {
    const data = await this.loadData();
    const own = matchLocale(appLocale());
    this.settings = { ...DEFAULT_SETTINGS, ...own ? { target: own } : {}, ...data != null ? data : {} };
    if (!(this.settings.provider in PROVIDERS))
      this.settings.provider = DEFAULT_SETTINGS.provider;
    if (!(this.settings.target in LANGUAGES))
      this.settings.target = DEFAULT_TARGET;
    if (!(this.settings.source in SOURCE_LANGUAGES))
      this.settings.source = "auto";
    if (!(this.settings.selectionAction in SELECTION_ACTIONS))
      this.settings.selectionAction = "popup";
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  providerSettings() {
    var _a;
    const { provider, fallback, email, deeplSecret } = this.settings;
    const deeplKey = deeplSecret ? (_a = this.app.secretStorage.getSecret(deeplSecret)) != null ? _a : "" : "";
    return { provider, fallback, email, deeplKey };
  }
  pickLanguage(onChoose) {
    new LanguageModal(this.app, this.settings.target, onChoose).open();
  }
  /** Tells the person what went wrong, in the words of the error when it is one of ours. */
  fail(error) {
    if (error instanceof TranslateError)
      new import_obsidian.Notice(error.message);
    else {
      console.error("Quick Translate:", error);
      new import_obsidian.Notice("The translation failed.");
    }
  }
  noteFallback(result) {
    if (result.fellBack)
      new import_obsidian.Notice(`${result.fellBack} Used MyMemory for this one.`);
  }
  // --- Selections -----------------------------------------------------------------------------------------------
  /** Translates `text` into `target`, as the commands and the window both need. */
  translate(text, target, progress) {
    return translateDocument(this.translator, text, { source: this.settings.source, target }, this.providerSettings(), progress);
  }
  async translateSelection(editor, target, action = this.settings.selectionAction) {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const raw = editor.getRange(from, to);
    if (!raw.trim()) {
      new import_obsidian.Notice("Select the text to translate first.");
      return;
    }
    const selection = { from, to, raw };
    if (action === "popup") {
      new TranslationModal(this.app, this, selection, editor, target).open();
      return;
    }
    const wait = new import_obsidian.Notice("Translating\u2026", 0);
    try {
      const result = await this.translate(raw, target);
      if (!result.sent) {
        new import_obsidian.Notice("There is no text to translate in the selection.");
        return;
      }
      this.noteFallback(result);
      this.apply(editor, selection, result.text, action);
    } catch (error) {
      this.fail(error);
    } finally {
      wait.hide();
    }
  }
  /** Puts a translation into the note, in one transaction, only if the selected text is still there. */
  apply(editor, selection, text, action) {
    if (editor.getRange(selection.from, selection.to) !== selection.raw) {
      new import_obsidian.Notice("The text changed while it was being translated. Select it again.");
      return false;
    }
    if (action === "replace") {
      editor.transaction({ changes: [{ from: selection.from, to: selection.to, text }] });
    } else {
      const end = { line: selection.to.line, ch: editor.getLine(selection.to.line).length };
      editor.transaction({ changes: [{ from: end, to: end, text: `

${text.replace(/\s+$/, "")}` }] });
    }
    return true;
  }
  // --- Notes ------------------------------------------------------------------------------------------------------
  noteCommand(checking, target) {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md")
      return false;
    if (!checking)
      void this.translateNote(file, target);
    return true;
  }
  /** The note as the person sees it: unsaved edits of an open note included. */
  async readNote(file) {
    const leaf = this.app.workspace.getLeavesOfType("markdown").find((l) => l.view instanceof import_obsidian.MarkdownView && l.view.file === file);
    if (leaf && leaf.view instanceof import_obsidian.MarkdownView)
      return leaf.view.editor.getValue();
    return this.app.vault.read(file);
  }
  /** Writes the translation of a note beside it (or in the folder of the settings) and opens it. */
  async translateNote(file, target) {
    if (this.busy.has(file.path)) {
      new import_obsidian.Notice(`\u201C${file.basename}\u201D is already being translated.`);
      return null;
    }
    this.busy.add(file.path);
    const wait = new import_obsidian.Notice(`Translating \u201C${file.basename}\u201D\u2026`, 0);
    try {
      const source = await this.readNote(file);
      const result = await this.translate(source, target, (done, total) => wait.setMessage(`Translating \u201C${file.basename}\u201D\u2026 ${done} of ${total}`));
      if (!result.sent) {
        new import_obsidian.Notice("There is no text to translate in this note.");
        return null;
      }
      if (result.detected === target) {
        new import_obsidian.Notice(`This note already seems to be in ${languageName(target)}. Choose another language with \u201CTranslate note into a new note in\u2026\u201D.`);
        return null;
      }
      this.noteFallback(result);
      const created = await this.createTranslation(file, target, result.text);
      new import_obsidian.Notice(`Translated into ${languageName(target)}: \u201C${created.basename}\u201D.`);
      if (this.settings.openTranslatedNote)
        await this.app.workspace.getLeaf("tab").openFile(created);
      return created;
    } catch (error) {
      this.fail(error);
      return null;
    } finally {
      wait.hide();
      this.busy.delete(file.path);
    }
  }
  async createTranslation(file, target, text) {
    var _a, _b;
    const folder = this.settings.folder.trim() ? (0, import_obsidian.normalizePath)(this.settings.folder.trim()) : (_b = (_a = file.parent) == null ? void 0 : _a.path) != null ? _b : "";
    const base = folder && folder !== "/" ? `${folder}/` : "";
    if (base && !this.app.vault.getAbstractFileByPath(folder))
      await this.app.vault.createFolder(folder);
    let path = (0, import_obsidian.normalizePath)(`${base}${file.basename} (${target}).md`);
    for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++)
      path = (0, import_obsidian.normalizePath)(`${base}${file.basename} (${target} ${n}).md`);
    return this.app.vault.create(path, text);
  }
};
var LanguageModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, current, onPick) {
    super(app);
    this.onPick = onPick;
    this.setPlaceholder(`Translate into\u2026 (now ${languageName(current)})`);
  }
  getItems() {
    return Object.keys(LANGUAGES);
  }
  getItemText(code) {
    return LANGUAGES[code];
  }
  onChooseItem(code) {
    this.onPick(code);
  }
};
var TranslationModal = class extends import_obsidian.Modal {
  constructor(app, plugin, range, editor, language) {
    super(app);
    this.token = 0;
    this.result = "";
    this.statusEl = null;
    this.outEl = null;
    this.buttons = [];
    this.plugin = plugin;
    this.range = range;
    this.source = editor;
    this.language = language;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("quick-translate-modal");
    this.setTitle("Translation");
    const bar = contentEl.createDiv({ cls: "quick-translate-bar" });
    this.statusEl = bar.createDiv({ cls: "quick-translate-status" });
    const select = bar.createEl("select", { cls: "dropdown", attr: { "aria-label": "Translate into" } });
    for (const [code, name] of Object.entries(LANGUAGES))
      select.createEl("option", { value: code, text: name });
    select.value = this.language;
    select.addEventListener("change", () => {
      this.language = select.value;
      void this.run();
    });
    this.outEl = contentEl.createDiv({ cls: "quick-translate-text" });
    contentEl.createDiv({ cls: "quick-translate-original", text: this.range.raw.trim().slice(0, 400) });
    const row = contentEl.createDiv({ cls: "modal-button-container" });
    this.buttons = [
      this.button(row, "Copy", false, () => {
        navigator.clipboard.writeText(this.result).then(
          () => new import_obsidian.Notice("Copied."),
          () => new import_obsidian.Notice("Could not copy. Select the text and copy it.")
        );
      }),
      this.button(row, "Insert below", false, () => {
        if (this.plugin.apply(this.source, this.range, this.result, "below"))
          this.close();
      }),
      this.button(row, "Replace selection", true, () => {
        if (this.plugin.apply(this.source, this.range, this.result, "replace"))
          this.close();
      })
    ];
    void this.run();
  }
  onClose() {
    this.token++;
    this.contentEl.empty();
  }
  button(parent, text, cta, onClick) {
    const button = parent.createEl("button", { text, cls: cta ? "mod-cta" : "" });
    button.addEventListener("click", onClick);
    return button;
  }
  show(status, text, ready) {
    var _a, _b;
    (_a = this.statusEl) == null ? void 0 : _a.setText(status);
    (_b = this.outEl) == null ? void 0 : _b.setText(text);
    this.buttons.forEach((b) => b.disabled = !ready);
  }
  async run() {
    const ticket = ++this.token;
    this.result = "";
    this.show(`Translating into ${languageName(this.language)}\u2026`, "", false);
    try {
      const got = await this.plugin.translate(this.range.raw, this.language);
      if (ticket !== this.token)
        return;
      if (!got.sent) {
        this.show("", "There is no text to translate in the selection.", false);
        return;
      }
      this.result = got.text;
      const from = got.detected ? `From ${languageName(got.detected)} \xB7 ` : "";
      const via = got.fellBack ? " (MyMemory, the first service failed)" : "";
      this.show(`${from}${PROVIDERS[got.provider].split(" (")[0]}${via}`, got.text, true);
    } catch (error) {
      if (ticket !== this.token)
        return;
      if (!(error instanceof TranslateError))
        console.error("Quick Translate:", error);
      this.show("", error instanceof TranslateError ? error.message : "The translation failed.", false);
    }
  }
};
var QuickTranslateSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  /**
   * The settings of Obsidian 1.13 and later: it renders this itself and indexes it for the settings
   * search. Older versions ignore it and call `display()`.
   */
  getSettingDefinitions() {
    return [
      {
        type: "group",
        heading: "Translation",
        items: [
          { ...TEXT.provider, control: { type: "dropdown", key: "provider", options: PROVIDERS, defaultValue: DEFAULT_SETTINGS.provider } },
          { ...TEXT.target, control: { type: "dropdown", key: "target", options: LANGUAGES, defaultValue: DEFAULT_SETTINGS.target } },
          { ...TEXT.source, control: { type: "dropdown", key: "source", options: SOURCE_LANGUAGES, defaultValue: "auto" } },
          { ...TEXT.fallback, control: { type: "toggle", key: "fallback", defaultValue: true } }
        ]
      },
      {
        type: "group",
        heading: "Accounts",
        items: [
          { ...TEXT.deeplSecret, control: { type: "secret", key: "deeplSecret" } },
          { ...TEXT.email, control: { type: "text", key: "email", placeholder: "you@example.com" } }
        ]
      },
      {
        type: "group",
        heading: "Results",
        items: [
          { ...TEXT.selectionAction, control: { type: "dropdown", key: "selectionAction", options: SELECTION_ACTIONS, defaultValue: "popup" } },
          { ...TEXT.folder, control: { type: "folder", key: "folder", placeholder: "Translations" } },
          { ...TEXT.openTranslatedNote, control: { type: "toggle", key: "openTranslatedNote", defaultValue: true } }
        ]
      }
    ];
  }
  getControlValue(key) {
    return this.plugin.settings[key];
  }
  async setControlValue(key, value) {
    Object.assign(this.plugin.settings, { [key]: value });
    await this.plugin.saveSettings();
  }
  /** The pre-1.13 rendering, from the same text. Obsidian skips it once `getSettingDefinitions()` returns anything. */
  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Translation").setHeading();
    this.dropdown("provider", TEXT.provider, PROVIDERS);
    this.dropdown("target", TEXT.target, LANGUAGES);
    this.dropdown("source", TEXT.source, SOURCE_LANGUAGES);
    this.toggle("fallback", TEXT.fallback);
    new import_obsidian.Setting(containerEl).setName("Accounts").setHeading();
    new import_obsidian.Setting(containerEl).setName(TEXT.deeplSecret.name).setDesc(TEXT.deeplSecret.desc).addComponent((el) => new import_obsidian.SecretComponent(this.app, el).setValue(s.deeplSecret).onChange((v) => this.setControlValue("deeplSecret", v != null ? v : "")));
    this.text("email", TEXT.email);
    new import_obsidian.Setting(containerEl).setName("Results").setHeading();
    this.dropdown("selectionAction", TEXT.selectionAction, SELECTION_ACTIONS);
    this.text("folder", TEXT.folder);
    this.toggle("openTranslatedNote", TEXT.openTranslatedNote);
  }
  dropdown(key, text, options) {
    new import_obsidian.Setting(this.containerEl).setName(text.name).setDesc(text.desc).addDropdown((d) => d.addOptions(options).setValue(String(this.plugin.settings[key])).onChange((v) => this.setControlValue(key, v)));
  }
  text(key, text) {
    new import_obsidian.Setting(this.containerEl).setName(text.name).setDesc(text.desc).addText((t) => t.setValue(String(this.plugin.settings[key])).onChange((v) => this.setControlValue(key, v)));
  }
  toggle(key, text) {
    new import_obsidian.Setting(this.containerEl).setName(text.name).setDesc(text.desc).addToggle((t) => t.setValue(Boolean(this.plugin.settings[key])).onChange((v) => this.setControlValue(key, v)));
  }
};

/* nosourcemap */