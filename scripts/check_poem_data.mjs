import { readFile } from "node:fs/promises";
import process from "node:process";

const DATA_PATH = new URL("../public/data/places.json", import.meta.url);
const MIN_HAN_CHARACTERS = 20;
const EXPECTED_COUNTS = { places: 89, poems: 323, relations: 340 };
const PLACE_TYPES = new Set([
  "city",
  "tower",
  "mountain",
  "lake",
  "temple",
  "pass",
  "river",
  "bridge",
  "garden",
  "palace",
]);
const DYNASTY_IDS = new Set([
  "先秦",
  "汉",
  "三国",
  "晋",
  "魏晋",
  "南北朝",
  "隋",
  "唐",
  "五代",
  "宋",
  "金",
  "元",
  "明",
  "清",
  "近现代",
  "当代",
]);
const REQUIRED_ANCIENT_NAMES = new Map([
  ["hangzhou", ["临安", "钱塘"]],
  ["xian", ["长安"]],
  ["nanjing", ["金陵", "建康"]],
  ["chengdu", ["锦官城", "益州"]],
  ["suzhou", ["姑苏", "吴门"]],
  ["yangzhou", ["广陵"]],
  ["beijing", ["幽州", "燕京"]],
  ["shaoxing", ["会稽"]],
  ["kaifeng_new", ["汴京", "汴州"]],
  ["jingzhou_new", ["江陵"]],
  ["jinan_new", ["历下"]],
]);

const places = JSON.parse(await readFile(DATA_PATH, "utf8"));
const failures = [];
const canonicalContent = new Map();
const placeIds = new Set();
let relationCount = 0;

function identity(poem) {
  return `${poem.title.trim()}\u0000${poem.author.trim()}`;
}

function normalizedContent(content) {
  return content.replace(/[\s\p{P}\p{S}]/gu, "");
}

for (const place of places) {
  if (placeIds.has(place.id)) failures.push(`地点 ID 重复：${place.id}`);
  placeIds.add(place.id);

  if (!PLACE_TYPES.has(place.type)) {
    failures.push(`${place.name} 使用未知地点类型：${place.type}`);
  }
  if (!Number.isFinite(place.lng) || !Number.isFinite(place.lat)) {
    failures.push(`${place.name} 的坐标无效`);
  }

  const ancientNames = place.ancient_names ?? [];
  if (
    !Array.isArray(ancientNames) ||
    ancientNames.some((name) => typeof name !== "string" || name.trim() === "")
  ) {
    failures.push(`${place.name} 的 ancient_names 必须是非空字符串数组`);
  } else if (new Set(ancientNames).size !== ancientNames.length) {
    failures.push(`${place.name} 的 ancient_names 含重复项`);
  }

  for (const requiredName of REQUIRED_ANCIENT_NAMES.get(place.id) ?? []) {
    if (!ancientNames.includes(requiredName)) {
      failures.push(`${place.name} 缺少古地名“${requiredName}”`);
    }
  }

  if (place.poems.length === 0) {
    failures.push(`${place.name} 没有任何可展示的诗词`);
  }

  relationCount += place.poems.length;

  for (const poem of place.poems) {
    const label = `《${poem.title}》${poem.author}（${place.name}）`;
    const hanCharacters = poem.content.match(/\p{Script=Han}/gu)?.length ?? 0;

    if (!DYNASTY_IDS.has(poem.dynasty)) {
      failures.push(`${label} 使用未映射朝代“${poem.dynasty}”`);
    }

    const explicitlyMarkedExcerpt =
      poem.contentStatus === "excerpt" || /[（(]节选[）)]/u.test(poem.title);
    if (hanCharacters < MIN_HAN_CHARACTERS && !explicitlyMarkedExcerpt) {
      failures.push(`${label} 正文仅 ${hanCharacters} 个汉字`);
    }

    if (/[�□]|[A-Za-z_]{3,}/u.test(poem.content)) {
      failures.push(`${label} 含乱码或异常英文片段`);
    }

    const key = identity(poem);
    const content = normalizedContent(poem.content);
    const previous = canonicalContent.get(key);
    if (previous && previous !== content) {
      failures.push(`${label} 与同标题、同作者的另一条正文不一致`);
    } else {
      canonicalContent.set(key, content);
    }
  }
}

if (places.length !== EXPECTED_COUNTS.places) {
  failures.push(`地点数应为 ${EXPECTED_COUNTS.places}，实际为 ${places.length}`);
}
if (canonicalContent.size !== EXPECTED_COUNTS.poems) {
  failures.push(
    `规范诗词数应为 ${EXPECTED_COUNTS.poems}，实际为 ${canonicalContent.size}`,
  );
}
if (relationCount !== EXPECTED_COUNTS.relations) {
  failures.push(`诗词地点关系数应为 ${EXPECTED_COUNTS.relations}，实际为 ${relationCount}`);
}

const requiredEndings = [
  ["寻隐者不遇", "贾岛", "云深不知处"],
  ["从军行", "王昌龄", "不破楼兰终不还"],
  ["钱塘湖春行", "白居易", "绿杨阴里白沙堤"],
  ["念奴娇·赤壁怀古", "苏轼", "一尊还酹江月"],
  ["水调歌头", "苏轼", "千里共婵娟"],
];

for (const [title, author, ending] of requiredEndings) {
  const matchingPoems = places.flatMap((place) =>
    place.poems.filter((poem) => poem.title === title && poem.author === author),
  );

  if (matchingPoems.length === 0) {
    failures.push(`缺少《${title}》${author}`);
  } else if (matchingPoems.some((poem) => !poem.content.includes(ending))) {
    failures.push(`《${title}》${author} 正文不完整，缺少结尾“${ending}”`);
  }
}

if (failures.length > 0) {
  console.error(`Poem data quality check failed with ${failures.length} problem(s):`);
  for (const failure of failures.slice(0, 50)) {
    console.error(`- ${failure}`);
  }
  if (failures.length > 50) {
    console.error(`- ... and ${failures.length - 50} more`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Poem data quality check passed: ${canonicalContent.size} canonical poems across ${places.length} places.`,
  );
}
