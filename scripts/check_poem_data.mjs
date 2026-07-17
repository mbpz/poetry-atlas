import { readFile } from "node:fs/promises";
import process from "node:process";

const DATA_PATH = new URL("../public/data/places.json", import.meta.url);
const MIN_HAN_CHARACTERS = 20;

const places = JSON.parse(await readFile(DATA_PATH, "utf8"));
const failures = [];
const canonicalContent = new Map();

function identity(poem) {
  return `${poem.title.trim()}\u0000${poem.author.trim()}`;
}

function normalizedContent(content) {
  return content.replace(/[\s\p{P}\p{S}]/gu, "");
}

for (const place of places) {
  if (place.poems.length === 0) {
    failures.push(`${place.name} 没有任何可展示的诗词`);
  }

  for (const poem of place.poems) {
    const label = `《${poem.title}》${poem.author}（${place.name}）`;
    const hanCharacters = poem.content.match(/\p{Script=Han}/gu)?.length ?? 0;

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
