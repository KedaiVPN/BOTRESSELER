const { Markup } = require('telegraf');
const yaml = require('js-yaml');

// Cache untuk menyimpan data akun per user
const accountCache = new Map();

// Opsi bug: label, value, wildcard (true jika ingin gunakan add + host + sni)
const bugOptions = [
  { label: 'AXIS EDU [CHAT] WC', value: 'chat.sociomile.com', wildcard: false },
  { label: 'XL VIDIO', value: 'quiz.vidio.com', wildcard: false },
  { label: 'XL EDU', value: '104.17.3.81', wildcard: false },
  { label: 'XL VIU WC', value: 'zaintest.vuclip.com', wildcard: true },
  { label: 'XL KERE HORE [AVA] WC', value: 'ava.game.naver.com', wildcard: true },
  { label: 'XL IFLIX [LIVE] SALTO', value: 'live.iflix.com', wildcard: false },
  { label: 'XL IFLIX [VPLAY] SALTO', value: 'vplay.iflix.com', wildcard: false },
  { label: 'XL FB SALTO', value: 'edge-ig-mqtt-p4-shv-sin6.facebook.com', wildcard: false },
  { label: 'XL IG SALTO', value: 'graph.instagram.com', wildcard: false },
  { label: 'ISAT EDU [WEBEX] WC', value: 'blog.webex.com', wildcard: true },
  { label: 'ISAT FUN [NETFLIX] WC', value: 'cache.netflix.com', wildcard: true },
  { label: 'ISAT FUN [SPOTIFY] WC', value: 'investors.spotify.com', wildcard: true },
  { label: 'CONFRECE ZOOM WS', value: 'support.zoom.us', wildcard: true },
  { label: 'TSEL ILPED [CHAT] WC', value: 'chat.sociomile.com', wildcard: true },
  { label: 'TSEL ILPED [GANECA] WC', value: 'ganecadigital.com', wildcard: true },
  { label: 'TSEL ILPED [UNES] WC', value: 'unnes.ac.id', wildcard: true },
  { label: 'TSEL ILPED [UNTAR] WC', value: 'untar.ac.id', wildcard: true },
  { label: 'TSEL RG', value: '172.67.23.144', wildcard: false }
];

function parseVMess(uri) {
  const payload = uri.replace('vmess://', '');
  const decoded = Buffer.from(payload, 'base64').toString();
  return JSON.parse(decoded);
}

function parseVlessTrojan(uri) {
  const u = new URL(uri);
  return {
    ps: u.hash ? decodeURIComponent(u.hash.slice(1)) : '',
    add: u.hostname,
    port: u.port,
    id: u.username,
    net: u.searchParams.get('type') || 'tcp',
    path: u.searchParams.get('path') || '',
    host: u.searchParams.get('host') || '',
    tls: u.searchParams.get('security') || '',
    sni: u.searchParams.get('sni') || ''
  };
}
function generateYAML(type, cfg) {
  let proxy = {
    name: cfg.ps || 'Unnamed',
    server: cfg.add,
    port: parseInt(cfg.port, 10),
    type,
  };

  if (type === 'vmess') {
    Object.assign(proxy, {
      uuid: cfg.id,
      alterId: cfg.aid ? parseInt(cfg.aid) : 0,
      cipher: 'auto',
      tls: cfg.tls === 'tls',
      'skip-cert-verify': true,
      servername: cfg.sni || cfg.host || cfg.add,
      network: cfg.net || 'tcp',
    });

    if (cfg.net === 'ws') {
      proxy['ws-opts'] = {
        path: cfg.path || '/',
        headers: {
          Host: cfg.host || cfg.add
        }
      };
    }

    proxy.udp = true;
  }

  else if (type === 'vless') {
    Object.assign(proxy, {
      uuid: cfg.id,
      tls: cfg.tls === 'tls',
      'skip-cert-verify': true,
      servername: cfg.sni || cfg.host || cfg.add,
      network: cfg.net || 'tcp',
    });

    if (cfg.net === 'ws') {
      proxy['ws-opts'] = {
        path: cfg.path || '/',
        headers: {
          Host: cfg.host || cfg.add
        }
      };
    }

    proxy.udp = true;
  }

  else if (type === 'trojan') {
    Object.assign(proxy, {
      password: cfg.id,
      tls: cfg.tls === 'tls',
      'skip-cert-verify': true,
      servername: cfg.sni || cfg.host || cfg.add,
      network: cfg.net || 'tcp',
    });

    if (cfg.net === 'ws') {
      proxy['ws-opts'] = {
        path: cfg.path || '/',
        headers: {
          Host: cfg.host || cfg.add
        }
      };
    }

    proxy.udp = true;
  }

  return yaml.dump({ proxies: [proxy] }, { lineWidth: -1 });
}

function injectBugSmart(cfg, bug, wildcard = false) {
  const originalDomain = cfg.host || cfg.sni || cfg.add;

  if (wildcard) {
    const wildcardHost = `${bug}.${originalDomain}`;
    return {
      ...cfg,
      add: bug,
      host: wildcardHost,
      sni: cfg.port === '443' || cfg.port === 443 ? wildcardHost : cfg.sni
    };
  }

  return { ...cfg, add: bug };
}

async function handleGenerateURI(bot, ctx, text) {
  let type, cfg;
  if (text.startsWith('vmess://')) {
    type = 'vmess'; cfg = parseVMess(text);
  } else if (text.startsWith('vless://')) {
    type = 'vless'; cfg = parseVlessTrojan(text);
  } else if (text.startsWith('trojan://')) {
    type = 'trojan'; cfg = parseVlessTrojan(text);
  } else {
    return; // Skip jika bukan URI valid
  }

  accountCache.set(ctx.from.id, { type, config: cfg, raw: text });
	console.log('🧠 Cache disimpan untuk', ctx.from.id);

  ctx.reply('Pilih aksi untuk akun ini:', Markup.inlineKeyboard([
    [Markup.button.callback('🔁 Convert to YAML', `start_convert_${ctx.from.id}`)],
    [Markup.button.callback('🐞 Generate Bug', `start_bug_${ctx.from.id}`)]
  ]));
}

function initGenerateBug(bot) {
  // Fungsi bantu buat bikin 2 kolom per baris
  function chunkArray(arr, size) {
    const chunked = [];
    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }
    return chunked;
  }

  bot.action(/start_bug_(\d+)/, async (ctx) => {
    const userId = +ctx.match[1];
    if (!accountCache.has(userId)) return ctx.reply('⚠️ Data tidak ditemukan');
    await ctx.answerCbQuery(); await ctx.editMessageReplyMarkup();

    const buttons = bugOptions.map(b =>
      Markup.button.callback(b.label, `uri_bug_${userId}_${b.value}|${b.wildcard}`)
    );
    await ctx.reply('Pilih bug untuk URI:', Markup.inlineKeyboard(chunkArray(buttons, 2)));
  });

  bot.action(/start_convert_(\d+)/, async (ctx) => {
    const userId = +ctx.match[1];
    if (!accountCache.has(userId)) return ctx.reply('⚠️ Data tidak ditemukan');
    await ctx.answerCbQuery(); await ctx.editMessageReplyMarkup();

    const buttons = bugOptions.map(b =>
      Markup.button.callback(b.label, `yaml_bug_${userId}_${b.value}|${b.wildcard}`)
    );
    await ctx.reply('Pilih bug untuk YAML:', Markup.inlineKeyboard(chunkArray(buttons, 2)));
  });

  bot.action(/uri_bug_(\d+)_(.+)/, async (ctx) => {
    const userId = +ctx.match[1];
    const [bug, wildcardFlag] = ctx.match[2].split('|');
    const isWildcard = wildcardFlag === 'true';

    const data = accountCache.get(userId);
    if (!data) return ctx.reply('⚠️ Data tidak ditemukan');
    await ctx.answerCbQuery(); await ctx.editMessageReplyMarkup();

    const modified = injectBugSmart(data.config, bug, isWildcard);

    const uri = data.raw.startsWith('vmess://')
      ? 'vmess://' + Buffer.from(JSON.stringify(modified)).toString('base64')
      : `${data.type}://${modified.id}@${modified.add}:${modified.port}?type=${modified.net}&path=${modified.path}&host=${modified.host}&security=${modified.tls}&sni=${modified.sni}#${encodeURIComponent(modified.ps)}`;

    await ctx.replyWithHTML(`✅ <b>𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐞 𝐛𝐮𝐠 𝐡𝐚𝐬 𝐛𝐞𝐞𝐧 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥</b>

<b>🔧 Detail:</b>
• <b>Protocol:</b> ${data.type.toUpperCase()}
• <b>Server:</b> ${modified.add}
• <b>Port:</b> ${modified.port}
• <b>UUID:</b> ${modified.id}
• <b>Network:</b> ${modified.net}
• <b>Path:</b> ${modified.path}
• <b>Host:</b> ${modified.host}
• <b>SNI:</b> ${modified.sni}

<b>🔗 URI:</b>
<pre>${uri}</pre>`);
  });

  bot.action(/yaml_bug_(\d+)_(.+)/, async (ctx) => {
    const userId = +ctx.match[1];
    const [bug, wildcardFlag] = ctx.match[2].split('|');
    const isWildcard = wildcardFlag === 'true';

    const data = accountCache.get(userId);
    if (!data) return ctx.reply('⚠️ Data tidak ditemukan');
    await ctx.answerCbQuery(); await ctx.editMessageReplyMarkup();

    const modified = injectBugSmart(data.config, bug, isWildcard);
    const yamlData = generateYAML(data.type, modified);

    await ctx.replyWithHTML(`✅ <b>𝐂𝐨𝐧𝐯𝐞𝐫𝐭 𝐭𝐨 𝐲𝐚𝐦𝐥 𝐡𝐚𝐬 𝐛𝐞𝐞𝐧 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥</b> 

<b>🔧 Detail:</b>
• <b>Protocol:</b> ${data.type.toUpperCase()}
• <b>Server:</b> ${modified.add}
• <b>Port:</b> ${modified.port}
• <b>UUID:</b> ${modified.id}
• <b>Network:</b> ${modified.net}
• <b>Host:</b> ${modified.host}
• <b>SNI:</b> ${modified.sni}

<b>🔗 YAML:</b>
<pre>${yamlData}</pre>`);
  });
}

module.exports = { initGenerateBug, handleGenerateURI };
