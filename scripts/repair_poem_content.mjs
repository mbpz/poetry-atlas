import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenCC from "opencc-js";

const DATA_PATH = new URL("../public/data/places.json", import.meta.url);
const SOURCE_LABEL = "chinese-poetry@2.0.1";
const toSimplified = OpenCC.Converter({ from: "tw", to: "cn" });

const args = process.argv.slice(2);
const corpusFlag = args.indexOf("--corpus");
const corpusRoot = corpusFlag >= 0 ? args[corpusFlag + 1] : undefined;
const inputFlag = args.indexOf("--input");
const inputPath = inputFlag >= 0 ? args[inputFlag + 1] : DATA_PATH;
const shouldWrite = args.includes("--write");
const shouldDropUnmatched = args.includes("--drop-unmatched");

if (!corpusRoot) {
  console.error(
    "Usage: node scripts/repair_poem_content.mjs --corpus <chinese-poetry package>/dist [--input places.json] [--write] [--drop-unmatched]",
  );
  process.exit(2);
}

const sourceRoots = [
  "quantangshi",
  "songci",
  "wudaishici",
  "yuanqu",
  "nalanxingde",
  "caocaoshiji",
  "chuci",
  "shijing",
  "mengxue",
].map((directory) => path.join(corpusRoot, directory));

function simplify(value) {
  return toSimplified(String(value ?? "").normalize("NFKC"));
}

function formatSourceLine(value) {
  return simplify(value)
    .replace(/\.\.\./gu, "……")
    .replace(/--/gu, "——")
    .replace(/,/gu, "，")
    .replace(/\./gu, "。")
    .replace(/\?/gu, "？")
    .replace(/!/gu, "！")
    .replace(/;/gu, "；")
    .replace(/:/gu, "：")
    .replace(/\(/gu, "（")
    .replace(/\)/gu, "）");
}

function normalizeIdentity(value) {
  return simplify(value).replace(/[\s\p{P}\p{S}]/gu, "");
}

function normalizeAuthor(value) {
  return normalizeIdentity(
    simplify(value).replace(
      /^(?:先秦|秦|汉|三国|晋|南北朝|隋|唐|五代|宋|辽|金|元|明|清|近现代|当代)代?[：:]?/u,
      "",
    ),
  );
}

function normalizeContent(value) {
  return simplify(value).replace(/[^\p{Script=Han}]/gu, "");
}

function hanLength(value) {
  return normalizeContent(value).length;
}

function isSuspicious(poem) {
  return hanLength(poem.content) < 20 || /[�□]|[A-Za-z_]{3,}/u.test(poem.content);
}

function extractParagraphs(entry) {
  const paragraphs = entry.paragraphs ?? entry.para;
  return Array.isArray(paragraphs) ? paragraphs : [];
}

function extractTitle(entry) {
  return entry.title ?? entry.rhythmic ?? entry.chapter;
}

function* extractEntries(value) {
  if (Array.isArray(value)) {
    for (const item of value) yield* extractEntries(item);
    return;
  }
  if (!value || typeof value !== "object") return;

  if ((value.author || value.source) && extractTitle(value) && extractParagraphs(value).length > 0) {
    yield value;
    return;
  }

  for (const child of Object.values(value)) {
    yield* extractEntries(child);
  }
}

async function listJsonFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(entryPath)));
    } else if (entry.name.endsWith(".json") && !entry.name.startsWith("author")) {
      files.push(entryPath);
    }
  }
  return files;
}

function bigrams(value) {
  if (value.length < 2) return new Set(value ? [value] : []);
  const result = new Set();
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2));
  }
  return result;
}

function diceSimilarity(left, right) {
  if (left === right) return 1;
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  if (leftBigrams.size === 0 || rightBigrams.size === 0) return 0;

  let intersection = 0;
  for (const pair of leftBigrams) {
    if (rightBigrams.has(pair)) intersection += 1;
  }
  return (2 * intersection) / (leftBigrams.size + rightBigrams.size);
}

function contentSimilarity(localContents, sourceContent) {
  const normalizedSource = normalizeContent(sourceContent);
  let best = 0;

  for (const content of localContents) {
    const normalizedLocal = normalizeContent(content);
    if (!normalizedLocal) continue;
    if (normalizedSource.includes(normalizedLocal)) return 1;
    best = Math.max(best, diceSimilarity(normalizedLocal, normalizedSource));
  }
  return best;
}

const places = JSON.parse(await readFile(inputPath, "utf8"));
const localGroups = new Map();

for (const place of places) {
  for (const poem of place.poems) {
    const author = normalizeAuthor(poem.author);
    const title = normalizeIdentity(poem.title);
    const key = `${title}\u0000${author}`;
    const group = localGroups.get(key) ?? {
      key,
      title,
      author,
      displayTitle: poem.title,
      displayAuthor: poem.author,
      contents: new Set(),
    };
    group.contents.add(poem.content);
    localGroups.set(key, group);
  }
}

const targetAuthors = new Set([...localGroups.values()].map((group) => group.author));
const candidatesByAuthor = new Map();
const sourceFiles = (await Promise.all(sourceRoots.map(listJsonFiles))).flat().sort();

for (const sourceFile of sourceFiles) {
  const parsed = JSON.parse(await readFile(sourceFile, "utf8"));

  for (const entry of extractEntries(parsed)) {
    const author = normalizeAuthor(entry.author ?? entry.source);
    const titleValue = extractTitle(entry);
    const paragraphs = extractParagraphs(entry);
    if (!targetAuthors.has(author) || !titleValue || paragraphs.length === 0) continue;

    const content = paragraphs.map((paragraph) => formatSourceLine(paragraph).trim()).join("\n");
    if (hanLength(content) < 20) continue;

    const candidate = {
      author,
      title: normalizeIdentity(titleValue),
      displayTitle: simplify(titleValue),
      content,
      sourceFile: path.relative(corpusRoot, sourceFile),
    };
    const candidates = candidatesByAuthor.get(author) ?? [];
    candidates.push(candidate);
    candidatesByAuthor.set(author, candidates);
  }
}

const decisions = new Map();
const report = {
  matched: [],
  verifiedLocal: [],
  unverifiedLocal: [],
  ambiguous: [],
  unmatched: [],
};

for (const group of localGroups.values()) {
  const localContents = [...group.contents];
  const authorCandidates = candidatesByAuthor.get(group.author) ?? [];
  const scored = authorCandidates
    .map((candidate) => {
      const exactTitle = candidate.title === group.title;
      const relatedTitle =
        group.title.length >= 2 &&
        (candidate.title.includes(group.title) || group.title.includes(candidate.title));
      const similarity = contentSimilarity(localContents, candidate.content);
      const score = similarity * 100 + (exactTitle ? 60 : relatedTitle ? 25 : 0);
      return { ...candidate, exactTitle, relatedTitle, similarity, score };
    })
    .filter((candidate) => candidate.exactTitle || candidate.relatedTitle || candidate.similarity >= 0.8)
    .sort((left, right) => right.score - left.score || right.content.length - left.content.length);

  const deduplicated = [];
  const seenContent = new Set();
  for (const candidate of scored) {
    const signature = normalizeContent(candidate.content);
    if (!seenContent.has(signature)) {
      seenContent.add(signature);
      deduplicated.push(candidate);
    }
  }

  const best = deduplicated[0];
  const runnerUp = deduplicated[1];
  const uniqueExactTitle = deduplicated.filter((candidate) => candidate.exactTitle).length === 1;
  const confident =
    best &&
    (best.similarity >= 0.8 ||
      (best.exactTitle && uniqueExactTitle) ||
      (best.relatedTitle && best.similarity >= 0.45)) &&
    (!runnerUp || best.score - runnerUp.score >= 5 || best.similarity === 1);

  const localByLength = localContents.toSorted(
    (left, right) => normalizeContent(right).length - normalizeContent(left).length,
  );
  const longest = localByLength[0];
  const longestLength = normalizeContent(longest).length;
  const hasSuspiciousLocalCopy = localContents.some(
    (content) => hanLength(content) < 20 || /[�□]|[A-Za-z_]{3,}/u.test(content),
  );
  const hasDivergentLocalCopies =
    new Set(localContents.map((content) => normalizeContent(content))).size > 1;
  const sourceIsMateriallyLonger =
    best && normalizeContent(best.content).length >= longestLength + Math.max(5, longestLength * 0.15);
  const sourceImprovesLineBreaks =
    best &&
    longest.split("\n").length === 1 &&
    best.content.split("\n").length > 1 &&
    best.similarity >= 0.8;
  const sourceReplacementNeeded =
    hasSuspiciousLocalCopy ||
    hasDivergentLocalCopies ||
    sourceIsMateriallyLonger ||
    sourceImprovesLineBreaks;

  if (confident && sourceReplacementNeeded) {
    decisions.set(group.key, { action: "replace", content: best.content });
    report.matched.push({
      poem: `《${group.displayTitle}》${group.displayAuthor}`,
      sourceTitle: best.displayTitle,
      sourceFile: best.sourceFile,
      similarity: best.similarity,
    });
    continue;
  }

  if (confident) {
    decisions.set(group.key, { action: "replace", content: longest });
    report.verifiedLocal.push(`《${group.displayTitle}》${group.displayAuthor}`);
    continue;
  }

  const normalizedLongest = normalizeContent(longest);
  const localVariantsArePrefixes = localByLength.every((content) =>
    normalizedLongest.includes(normalizeContent(content)),
  );

  if (localVariantsArePrefixes && hanLength(longest) >= 20 && !/[�□]|[A-Za-z_]{3,}/u.test(longest)) {
    decisions.set(group.key, { action: "replace", content: longest });
    report.unverifiedLocal.push(`《${group.displayTitle}》${group.displayAuthor}`);
  } else if (best) {
    report.ambiguous.push({
      poem: `《${group.displayTitle}》${group.displayAuthor}`,
      candidate: `《${best.displayTitle}》`,
      similarity: best.similarity,
    });
  } else {
    report.unmatched.push(`《${group.displayTitle}》${group.displayAuthor}`);
  }
}

let replacedAssociations = 0;
let droppedAssociations = 0;
for (const place of places) {
  place.poems = place.poems.filter((poem) => {
    const key = `${normalizeIdentity(poem.title)}\u0000${normalizeAuthor(poem.author)}`;
    const decision = decisions.get(key);
    if (decision) {
      if (poem.content !== decision.content) replacedAssociations += 1;
      poem.content = decision.content;
      return true;
    }
    if (shouldDropUnmatched && isSuspicious(poem)) {
      droppedAssociations += 1;
      return false;
    }
    return true;
  });
}

console.log(`Source: ${SOURCE_LABEL}`);
console.log(`Scanned ${sourceFiles.length} source files for ${localGroups.size} local poems.`);
console.log(`Matched to source: ${report.matched.length}`);
console.log(`Verified local text already complete: ${report.verifiedLocal.length}`);
console.log(`Preserved without an external match: ${report.unverifiedLocal.length}`);
console.log(`Ambiguous source matches: ${report.ambiguous.length}`);
console.log(`Unmatched: ${report.unmatched.length}`);
console.log(`Associations to replace: ${replacedAssociations}`);
console.log(`Suspicious unmatched associations to drop: ${droppedAssociations}`);

const outputPlaces = shouldDropUnmatched
  ? places.filter((place) => place.poems.length > 0)
  : places;
console.log(`Empty places to drop: ${places.length - outputPlaces.length}`);

for (const item of report.ambiguous.slice(0, 20)) {
  console.log(
    `AMBIGUOUS ${item.poem} -> ${item.candidate} (${item.similarity.toFixed(2)})`,
  );
}
for (const item of report.unmatched.slice(0, 20)) {
  console.log(`UNMATCHED ${item}`);
}
for (const item of report.unverifiedLocal.slice(0, 50)) {
  console.log(`UNVERIFIED ${item}`);
}

if (shouldWrite) {
  await writeFile(DATA_PATH, `${JSON.stringify(outputPlaces, null, 2)}\n`);
  console.log(`Updated ${DATA_PATH.pathname}`);
} else {
  console.log("Dry run only; pass --write to update the dataset.");
}
