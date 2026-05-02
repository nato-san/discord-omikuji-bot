require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const FORTUNES = ["大吉", "中吉", "小吉", "吉", "末吉", "凶", "大凶"];
const COMMENTS = [
  "今日は深追いしないのが勝ち。",
  "利確は正義。欲張りすぎ注意。",
  "チャンスはあるけど、必ず自分で再確認。",
  "勢いはある。ロットは小さく丁寧に。",
  "焦らず、ルール通りにいこう。",
  "今日は情報の一次ソース確認が開運ポイント。",
  "勝っても負けても、次に活きるメモを残そう。",
  "エントリー前に出口戦略を決めると吉。",
  "SNSの熱量より、数字を見ると運気アップ。",
  "無理な連打より、待つ勇気が幸運を呼ぶ。",
  "板が薄いときは慎重に。小ロットで試そう。",
  "今日は逆指値を置くと安心の日。",
  "ポジションを軽くして、頭をクリアにすると吉。",
  "勝率より期待値。冷静な判断がツキを呼ぶ。",
  "話題性だけで飛び乗らないのが大吉ムーブ。",
  "朝の相場チェックで流れをつかめる日。",
  "1回休む判断が、次のチャンスを守ってくれる。",
  "リスク管理を徹底すると運気が伸びる。",
  "今日は『見送り』も立派な正解。",
  "熱くなったら深呼吸。落ち着きが最強の武器。",
  "コツコツ継続が、いちばんのラッキー要素。",
  "含み益は幻。ルール通りの利確が吉。",
  "『なぜ買うか』を言語化できたら勝ちに近い。",
  "他人の正解より、自分のルールを信じよう。",
  "ムードに流されず、根拠で動ける日。",
];
const LUCKY_ITEMS = [
  "ハードウェアウォレット",
  "シードフレーズ保管カード",
  "2FA認証アプリ",
  "パスワードマネージャー",
  "秘密鍵オフラインメモ",
  "ウォレット専用ブラウザ",
  "トランザクションチェッカー",
  "Ledger用USBケーブル",
  "トークン監視用スマホスタンド",
  "コールドウォレットケース",
  "セキュリティキー",
  "トレード記録ノート",
  "時差確認用ワールドクロック",
  "ノイズキャンセリングイヤホン",
  "ボールペン",
  "マグカップ",
  "メモ帳",
  "ミートアップでもらったTシャツ",
  "塩漬けトークン",
  "ぬいぐるみ",
  "腕時計",
  "まくら",
  "パンケーキ",
  "寿司",
  "ハンバーガー",
  "猫",
];

const LUCKY_MOVES = [
  "ウォレット用の少額テスト送金",
  "ガス代チェック",
  "DEXブックマーク整理",
  "公式Discordのアナウンス確認",
  "公式Xアカウント確認",
  "トークンコントラクト再確認",
  "CAコピペ用メモ",
  "ポートフォリオ見直し",
  "利確ルールのメモ",
  "損切りラインの再設定",
  "板の厚みチェック",
  "出来高チェック",
  "ロック期間の確認",
  "監査レポート確認",
  "マルチシグ情報チェック",
  "ブリッジ利用前の少額テスト",
  "フィッシング対策ブックマーク確認",
  "Read-onlyウォレット接続",
  "通知BOTのアラート整理",
  "お気に入りチェーンの手数料比較",
  "Nansenダッシュボード確認",
  "DexScreenerウォッチリスト整理",
];

const PREFERRED_CHAINS_BY_SYMBOL = {
  SOL: "solana",
  ETH: "ethereum",
  WETH: "ethereum",
  BTC: "bitcoin",
  WBTC: "ethereum",
  BNB: "bnb",
  BASE: "base",
  MATIC: "polygon",
  POL: "polygon",
  AVAX: "avalanche",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  TON: "ton",
  TRX: "tron",
};

const CHAIN_HINTS = {
  solana: ["solana"],
  ethereum: ["ethereum", "eth mainnet"],
  bnb: ["bnb", "bsc", "binance smart chain"],
  base: ["base"],
  arbitrum: ["arbitrum"],
  optimism: ["optimism"],
  polygon: ["polygon", "matic"],
  avalanche: ["avalanche", "avax"],
  bitcoin: ["bitcoin"],
  sui: ["sui"],
  ton: ["ton", "the open network"],
  tron: ["tron"],
};

// $BTC みたいなティッカーを取る
function extractTickers(text) {
  const matches = text.match(/\$[a-zA-Z0-9]{2,12}/g) || [];
  return matches.map((t) => t.replace("$", "").toUpperCase());
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getSkipChanceByFortune(fortune) {
  if (fortune === "大凶") return 1;
  if (fortune === "凶") return 0.5;
  return 0;
}

function shouldSkipByFortune(fortune) {
  const chance = getSkipChanceByFortune(fortune);
  return Math.random() < chance;
}

function getFortuneColor(fortune) {
  if (fortune === "大凶") return 0xef4444;
  if (fortune === "凶") return 0xf97316;
  return 0x22c55e;
}

function getRandomExpiryMinutes() {
  const defaultList = [1, 5, 15, 30, 60, 69];
  const raw = process.env.OMIKUJI_EXPIRY_MINUTES_LIST;
  if (!raw) return pickRandom(defaultList);

  const parsed = raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
    .map((v) => Math.floor(v));

  if (!parsed.length) return pickRandom(defaultList);
  return pickRandom(parsed);
}

function detectMentionedChains(text) {
  const lower = (text || "").toLowerCase();
  const hits = new Set();

  for (const [chain, keywords] of Object.entries(CHAIN_HINTS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      hits.add(chain);
    }
  }

  return Array.from(hits);
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "N/A";
  return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function predictNansenLabel(pick, fortune) {
  const vol = Number(pick.volume || 0);
  const liq = Number(pick.liquidity || 0);
  const mcap = Number(pick.mcap || 0);
  const change = Number(pick.change || 0);

  if (["凶", "大凶"].includes(fortune)) {
    if (liq < 20000 || vol < 10000) return "☠️ 詐欺師の罠（ラグプル警戒）";
    return "🧟 ゾンビウォレットたちの墓場";
  }

  if (vol > mcap * 0.5 && mcap > 0) {
    return "🎢 ギャンブラーたちの鉄火場";
  } else if (liq > mcap * 0.2 && vol < mcap * 0.1 && mcap > 0) {
    return "👥 アーリーアダプターたちの密かな仕込み場";
  } else if (change > 20 && vol > 100000) {
    return "🔥 イナゴタワー建設中（モメンタム追従）";
  } else if (mcap > 5000000) {
    return "🐋 中堅クジラたちの回遊エリア";
  } else if (liq < 15000) {
    return "⚠️ 魔界の底（超ハイリスク）";
  } else {
    return "👀 スマートマネー監視対象";
  }
}

function buildSmartMoneyHeat(pick) {
  const volume = Number(pick.volume || 0);
  const mcap = Number(pick.mcap || 0);
  const change = Number(pick.change || 0);
  const volumeToMcap = mcap > 0 ? volume / mcap : 0;

  let level = 1;
  if (volumeToMcap > 0.2 || change > 10) level = 5;
  else if (volumeToMcap > 0.12 || change > 6) level = 4;
  else if (volumeToMcap > 0.07 || change > 3) level = 3;
  else if (volumeToMcap > 0.03 || change > 1) level = 2;

  const flames = "🔥".repeat(level) + "▫️".repeat(5 - level);
  const labels = ["LOW", "MILD", "WARM", "HOT", "EXTREME"];
  return `${flames} (${labels[level - 1]})`;
}

async function buildFomoHeat(channel, triggerMessageId) {
  const batch = await channel.messages.fetch({ limit: 100 });
  const words = [
    "moon",
    "pump",
    "100x",
    "爆益",
    "ガチホ",
    "買い",
    "all in",
    "fomo",
    "今すぐ",
    "飛ぶ",
    "上場",
  ];

  let score = 0;
  let messageCount = 0;
  for (const msg of batch.values()) {
    if (msg.author.bot) continue;
    if (triggerMessageId && msg.id === triggerMessageId) continue;
    if ((msg.content || "").trim() === "おみくじ") continue;
    messageCount += 1;
    const text = (msg.content || "").toLowerCase();
    for (const w of words) {
      if (text.includes(w)) score += 1;
    }
  }

  if (messageCount === 0) {
    return "▫️▫️▫️▫️▫️ (NO CHAT)";
  }

  let level = 0;
  if (score >= 30) level = 5;
  else if (score >= 20) level = 4;
  else if (score >= 12) level = 3;
  else if (score >= 6) level = 2;
  else if (score >= 1) level = 1;

  if (level === 0) {
    return "▫️▫️▫️▫️▫️ (QUIET)";
  }

  const therm = "🌡️".repeat(level) + "▫️".repeat(5 - level);
  const labels = ["CALM", "WARM", "HYPE", "HOT", "FEVER"];
  return `${therm} (${labels[level - 1]})`;
}

function getDexScreenerChainSlug(chain) {
  const map = {
    ethereum: "ethereum",
    bnb: "bsc",
    base: "base",
    solana: "solana",
    polygon: "polygon",
    arbitrum: "arbitrum",
    optimism: "optimism",
    avalanche: "avalanche",
  };
  return map[chain] || chain;
}

function buildDexScreenerTokenUrl(chain, tokenAddress) {
  if (!chain || !tokenAddress) return null;
  const slug = getDexScreenerChainSlug(chain);
  return `https://dexscreener.com/${slug}/${tokenAddress}`;
}

async function getDexScreenerExtra(tokenAddress) {
  if (!tokenAddress) return { imageUrl: null, pairUrl: null, ageLabel: "N/A" };
  try {
    const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
      timeout: 10000,
    });
    const pairs = res.data?.pairs || [];
    const first = pairs[0];

    let ageLabel = "N/A";
    if (first && first.pairCreatedAt) {
      const ms = Date.now() - first.pairCreatedAt;
      const days = ms / (1000 * 60 * 60 * 24);
      if (days < 1) {
        const hours = ms / (1000 * 60 * 60);
        ageLabel = hours < 1 ? `${Math.floor(hours * 60)}分` : `${Math.floor(hours)}時間`;
      } else if (days < 30) {
        ageLabel = `${Math.floor(days)}日`;
      } else if (days < 365) {
        ageLabel = `${Math.floor(days / 30)}ヶ月`;
      } else {
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        ageLabel = months > 0 ? `${years}年${months}ヶ月` : `${years}年`;
      }
    }

    return {
      imageUrl: first?.info?.imageUrl || null,
      pairUrl: first?.url || null,
      ageLabel,
    };
  } catch (e) {
    return { imageUrl: null, pairUrl: null, ageLabel: "N/A" };
  }
}

// 過去5日ぶんのメッセージからティッカー収集
async function collectRecentTickers(channel, days = 5, maxMessages = 1000) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  let beforeId = undefined;
  let readCount = 0;
  const set = new Set();
  const chainHintsByTicker = new Map();

  while (readCount < maxMessages) {
    const batch = await channel.messages.fetch({ limit: 100, before: beforeId });
    if (!batch.size) break;

    for (const msg of batch.values()) {
      readCount++;
      if (msg.createdTimestamp < since) {
        return {
          tickers: Array.from(set),
          chainHintsByTicker,
        };
      }
      if (msg.author.bot) continue;

      const tickers = extractTickers(msg.content || "");
      const mentionedChains = detectMentionedChains(msg.content || "");

      tickers.forEach((t) => {
        set.add(t);
        if (!chainHintsByTicker.has(t)) {
          chainHintsByTicker.set(t, new Set());
        }
        const hintSet = chainHintsByTicker.get(t);
        mentionedChains.forEach((chain) => hintSet.add(chain));
      });
    }

    beforeId = batch.last().id;
    if (batch.size < 100) break;
  }

  return {
    tickers: Array.from(set),
    chainHintsByTicker,
  };
}

// Nansenで候補をふるい分け
async function filterWithNansen(tickers, chainHintsByTicker = new Map()) {
  if (!tickers.length) return [];

  const chains = (process.env.NANSEN_CHAINS || "solana,ethereum,base,bnb")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const body = {
    chains,
    timeframe: "24h",
    pagination: { page: 1, per_page: 100 },
    filters: {
      token_symbol: tickers.slice(0, 50),
      include_stablecoins: false,
      liquidity: { min: 15000 }, // 流動性の足切りを下げて生まれたてのコインも拾えるように
      market_cap_usd: { min: 30000, max: 30000000 }, // 30Mドル(約45億円)以上の大型・メジャー銘柄をAPIレベルで完全に弾く
    },
  };

  const res = await axios.post("https://api.nansen.ai/api/v1/token-screener", body, {
    headers: {
      apiKey: process.env.NANSEN_API_KEY,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });

  const rows = res.data?.data || [];

  // ざっくり危険除外（急落しすぎは外す）
  const safeLike = rows.filter((r) => {
    const pc = Number(r.price_change ?? 0);
    return pc > -70;
  });

  // 同じティッカーが複数チェーンにいるときは、流動性・出来高・時価総額で最適候補を選ぶ
  const IGNORE_SYMBOLS = ["SOL", "WSOL", "ETH", "WETH", "BTC", "WBTC", "USDT", "USDC", "BNB", "POL", "MATIC", "ARB", "OP", "AVAX", "SUI", "TON", "TRX"];
  const bestBySymbol = new Map();
  for (const r of safeLike) {
    const symbol = (r.token_symbol || "").toUpperCase();
    if (!symbol || IGNORE_SYMBOLS.includes(symbol)) continue;
    const preferredChain = PREFERRED_CHAINS_BY_SYMBOL[symbol];
    const hintedChains = Array.from(chainHintsByTicker.get(symbol) || []);

    // 古いトークンばかり出る原因：チャットで言及されただけのトークンに「2兆点」のボーナスが入っていたため
    // これをさらに落とし、「直前の急上昇（Surge）」が圧倒的に有利になるようにする
    const preferredBonus = r.chain === preferredChain ? 100_000 : 0;
    const hintBonus = hintedChains.includes(r.chain) ? 500_000 : 0;
    // NEW BONUSES
    const isMetaChain = ["solana", "base"].includes(r.chain) ? 5_000_000 : 0;
    const liqRatio = Number(r.market_cap_usd) > 0 ? Number(r.liquidity) / Number(r.market_cap_usd) : 0;
    const stableLiqBonus = liqRatio > 0.1 ? 2_000_000 : 0;
    const jumpBonus = Number(r.price_change) > 0 ? Number(r.price_change) * 100_000 : 0;

    // 大きすぎるトークン（すでに成熟している）を避けるためのペナルティ
    const mcap = Number(r.market_cap_usd || 0);
    const mcapPenalty = mcap > 80_000_000 ? -20_000_000 : (mcap > 30_000_000 ? -5_000_000 : 0);

    // 単純な大きさより、時価総額に対する出来高の多さ（熱狂度）を重視
    const volRatio = mcap > 0 ? Number(r.volume || 0) / mcap : 0;
    const hypeBonus = volRatio * 10_000_000;

    // 大きさを平方根でマイルドにし、億単位の差で無条件に勝つことを防ぐ
    const normalizedSize = (Math.sqrt(Number(r.liquidity || 0)) * 50) + (Math.sqrt(Number(r.volume || 0)) * 100);

    const score =
      hintBonus +
      preferredBonus +
      isMetaChain +
      stableLiqBonus +
      jumpBonus +
      hypeBonus +
      normalizedSize +
      mcapPenalty;
    const current = bestBySymbol.get(symbol);
    if (!current || score > current.score) {
      bestBySymbol.set(symbol, {
        symbol,
        chain: r.chain,
        tokenAddress: r.token_address,
        price: r.price_usd,
        liquidity: r.liquidity,
        mcap: r.market_cap_usd,
        change: r.price_change,
        volume: r.volume,
        score,
      });
    }
  }

  return Array.from(bestBySymbol.values());
}

async function fetchSurgeCandidates() {
  const chains = (process.env.NANSEN_CHAINS || "solana,ethereum,base,bnb")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const headers = {
    apiKey: process.env.NANSEN_API_KEY,
    "Content-Type": "application/json",
  };

  const commonFilters = {
    include_stablecoins: false,
    liquidity: { min: 15000 },
    market_cap_usd: { min: 30000, max: 30000000 }, // ここでも大型をAPIで弾き、ランキング上位をすべて「低時価総額の熱狂銘柄」で埋める
  };

  const [res5m, res1h] = await Promise.all([
    axios.post(
      "https://api.nansen.ai/api/v1/token-screener",
      {
        chains,
        timeframe: "5m",
        pagination: { page: 1, per_page: 80 },
        filters: commonFilters,
        order_by: [{ field: "volume", direction: "DESC" }],
      },
      { headers, timeout: 15000 }
    ),
    axios.post(
      "https://api.nansen.ai/api/v1/token-screener",
      {
        chains,
        timeframe: "1h",
        pagination: { page: 1, per_page: 80 },
        filters: commonFilters,
        order_by: [{ field: "volume", direction: "DESC" }],
      },
      { headers, timeout: 15000 }
    ),
  ]);

  const rows5m = res5m.data?.data || [];
  const rows1h = res1h.data?.data || [];
  const map1h = new Map();

  for (const r of rows1h) {
    const key = `${(r.token_symbol || "").toUpperCase()}|${r.chain}`;
    map1h.set(key, r);
  }

  const IGNORE_SYMBOLS = ["SOL", "WSOL", "ETH", "WETH", "BTC", "WBTC", "USDT", "USDC", "BNB", "POL", "MATIC", "ARB", "OP", "AVAX", "SUI", "TON", "TRX"];
  const surge = [];
  for (const r5 of rows5m) {
    const symbol = (r5.token_symbol || "").toUpperCase();
    if (!symbol || IGNORE_SYMBOLS.includes(symbol)) continue;
    const key = `${symbol}|${r5.chain}`;
    const r1 = map1h.get(key);

    const v5 = Number(r5.volume || 0);
    const v1 = Number(r1?.volume || 0);
    const hourlyPaceFrom5m = v5 * 12;
    const surgeRatio = v1 > 0 ? hourlyPaceFrom5m / v1 : 0;
    const pc = Number(r5.price_change ?? 0);
    if (pc <= -70) continue;

    // 5mペースが1h平均より強い銘柄を急増候補として扱う（弾く基準を下げ、より多くの候補を入れる）
    if (surgeRatio < 1.05) continue;

    surge.push({
      symbol,
      chain: r5.chain,
      tokenAddress: r5.token_address,
      price: r5.price_usd,
      liquidity: r5.liquidity,
      mcap: r5.market_cap_usd,
      change: r5.price_change,
      volume: r5.volume,
      surgeRatio,
      score:
        (Math.sqrt(Number(r5.liquidity || 0)) * 50) +
        (Math.sqrt(Number(r5.volume || 0)) * 100) +
        surgeRatio * 5_000_000 +
        (["solana", "base"].includes(r5.chain) ? 5_000_000 : 0) +
        ((Number(r5.market_cap_usd) > 0 ? Number(r5.liquidity) / Number(r5.market_cap_usd) : 0) > 0.1 ? 2_000_000 : 0) +
        (Number(r5.price_change) > 0 ? Number(r5.price_change) * 100_000 : 0) -
        (Number(r5.market_cap_usd || 0) > 80_000_000 ? 20_000_000 : 0),
      sourceFlags: { surge: true, chat: false },
    });
  }

  return surge;
}

function mergeCandidates(chatCandidates, surgeCandidates) {
  const merged = new Map();

  for (const c of chatCandidates) {
    const key = `${c.symbol}|${c.chain}`;
    merged.set(key, {
      ...c,
      sourceFlags: { chat: true, surge: false },
    });
  }

  for (const c of surgeCandidates) {
    const key = `${c.symbol}|${c.chain}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, c);
      continue;
    }

    const combined = {
      ...current,
      ...c,
      score: Math.max(Number(current.score || 0), Number(c.score || 0)),
      sourceFlags: {
        chat: current.sourceFlags?.chat || c.sourceFlags?.chat || false,
        surge: current.sourceFlags?.surge || c.sourceFlags?.surge || false,
      },
    };
    merged.set(key, combined);
  }

  return Array.from(merged.values());
}

function pickTokenByFortune(candidates, fortune) {
  if (!candidates.length) return null;
  const ranked = [...candidates].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const len = ranked.length;

  let pool = [];
  if (fortune === "大吉") pool = ranked.slice(0, Math.max(1, Math.floor(len * 0.1)));
  else if (fortune === "中吉") pool = ranked.slice(0, Math.max(1, Math.floor(len * 0.25)));
  else if (fortune === "小吉") pool = ranked.slice(Math.floor(len * 0.1), Math.max(1, Math.floor(len * 0.4)));
  else if (fortune === "吉") pool = ranked.slice(Math.floor(len * 0.3), Math.max(1, Math.floor(len * 0.6)));
  else if (fortune === "末吉") pool = ranked.slice(Math.floor(len * 0.5), Math.max(1, Math.floor(len * 0.8)));
  else if (fortune === "凶") pool = ranked.slice(Math.floor(len * 0.7), len);
  else if (fortune === "大凶") pool = ranked.slice(Math.floor(len * 0.85), len);

  if (!pool.length) pool = ranked;

  // 良い運勢の場合は上位プール内から高いスコアのものが出やすくする
  if (["大吉", "中吉", "小吉"].includes(fortune)) {
    const weights = pool.map((_, i) => Math.pow(0.85, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let randomPoint = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      randomPoint -= weights[i];
      if (randomPoint <= 0) return pool[i];
    }
  }

  // それ以外（吉〜大凶等）は該当プールの中から完全にフラットなランダムで選ぶ
  return pool[Math.floor(Math.random() * pool.length)];
}

// ここを ready -> clientReady にして警告を消した
client.once("clientReady", () => {
  console.log(`起動OK: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if ((message.content || "").trim() !== "おみくじ") return;

    await message.reply("おみくじ中... 少し待ってね！");

    const { tickers, chainHintsByTicker } = await collectRecentTickers(message.channel, 5, 1000);
    const chatCandidates = tickers.length
      ? await filterWithNansen(tickers, chainHintsByTicker)
      : [];
    const surgeCandidates = await fetchSurgeCandidates();
    const candidates = mergeCandidates(chatCandidates, surgeCandidates);

    if (!candidates.length) {
      await message.channel.send("候補が見つからなかったよ。時間をあけてもう一度試してね。");
      return;
    }

    // まず運勢を決める
    const fortune = pickRandom(FORTUNES);

    // 運勢に合わせてトークンを選ぶ（大吉なら熱狂トップ、大凶なら面白みがない下位）
    const pick = pickTokenByFortune(candidates, fortune);

    if (!pick) {
      await message.channel.send("候補の選定に失敗したよ。もう一度試してね。");
      return;
    }

    const comment = pickRandom(COMMENTS);
    const item = pickRandom(LUCKY_ITEMS);
    const move = pickRandom(LUCKY_MOVES);
    const skip = shouldSkipByFortune(fortune);
    const skipChance = getSkipChanceByFortune(fortune);
    const expiryMinutes = getRandomExpiryMinutes();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expiryLabel = expiresAt.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (skip) {
      const skipEmbed = new EmbedBuilder()
        .setColor(getFortuneColor(fortune))
        .setTitle(`🔮 おみくじ結果: ${fortune}`)
        .setDescription(
          `🛟 **見送り信託 発動**\n` +
          `今日は無理に入らない日。資金を守るのが最強ムーブです。\n\n` +
          `🎁 ラッキーアイテム: ${item}\n` +
          `⚡ ラッキームーブ: ${move}\n` +
          `📝 ひとこと: ${comment}`
        )
        .addFields(
          {
            name: "🚫 見送り確率",
            value: `${Math.round(skipChance * 100)}%`,
            inline: true,
          },
          {
            name: "⏳ おみくじの寿命",
            value: `${expiryMinutes}分（有効期限 ${expiryLabel}）`,
            inline: true,
          }
        )
        .setFooter({ text: "期限切れ後は再度「おみくじ」で引き直してね。" });

      await message.channel.send({ embeds: [skipEmbed] });
      return;
    }

    const dexExtra = await getDexScreenerExtra(pick.tokenAddress);
    const dexFallback = buildDexScreenerTokenUrl(pick.chain, pick.tokenAddress);
    const dexUrl = dexFallback || "N/A";
    const imageUrl = dexExtra.imageUrl || "N/A";
    const ageLabel = dexExtra.ageLabel || "N/A";
    const smartMoneyHeat = buildSmartMoneyHeat(pick);
    const fomoHeat = await buildFomoHeat(message.channel, message.id);
    const fomoLabel = fomoHeat.includes("(NO CHAT)") ? "FOMO温度計" : "🌡️ FOMO温度計";
    const nansenLabel = predictNansenLabel(pick, fortune);

    const embed = new EmbedBuilder()
      .setColor(getFortuneColor(fortune))
      .setTitle(`🎯 おみくじ結果: ${fortune}`)
      .setDescription(
        `🍀 ラッキートークン: **$${pick.symbol}** (${pick.chain})\n` +
        `🎂 ペア年齢: **${ageLabel}**\n` +
        `🦅 **Powered by Nansen API** (Smart Money & Volume Tracking)\n` +
        `🏷️ Nansen AIラベル予想: **${nansenLabel}**\n` +
        `🔥 スマートマネー温度計: ${smartMoneyHeat}\n` +
        `${fomoLabel}: ${fomoHeat}\n` +
        `🧾 CA: \`${pick.tokenAddress || "N/A"}\`\n` +
        `🎁 ラッキーアイテム: ${item}\n` +
        `⚡ ラッキームーブ: ${move}\n` +
        `📝 ひとこと: ${comment}\n\n` +
        `※ 投資判断は自己責任でね！`
      )
      .addFields(
        { name: "💧 Liquidity", value: `$${formatNumber(pick.liquidity)}`, inline: true },
        { name: "💰 Market Cap", value: `$${formatNumber(pick.mcap)}`, inline: true },
        { name: "📈 Price Change", value: `${formatNumber(pick.change)}%`, inline: true },
        { name: "🔗 DexScreener", value: dexUrl, inline: false },
        {
          name: "⏳ おみくじの寿命",
          value: `${expiryMinutes}分（有効期限 ${expiryLabel}）`,
          inline: false,
        }
      );

    if (imageUrl && imageUrl !== "N/A") {
      embed.setThumbnail(imageUrl);
    }

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    await message.channel.send("エラーが起きたよ。APIキーや設定を確認してみてね。");
  }
});

client.login(process.env.DISCORD_TOKEN);