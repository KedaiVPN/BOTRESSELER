const { Markup } = require('telegraf');
const yaml = require('js-yaml');

// Cache untuk menyimpan data akun per user
const accountCache = new Map();

// Opsi bug: label, value, wildcard (true jika ingin gunakan add + host + sni)
const bugOptions = [
  { label: 'XL VIDIO', value: 'quiz.vidio.com', wildcard: false },
  { label: 'XL EDU', value: '104.17.3.81', wildcard: false },
  { label: 'TSEL ILPED WC', value: 'bakrie.ac.id', wildcard: true },
  { label: 'XL XCV WC', value: 'ava.game.naver.com', wildcard: true }
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
  switch (type) {
    case 'vmess':
      return yaml.dump({
        name: cfg.ps,
        type: 'vmess',
        server: cfg.add,
        port: parseInt(cfg.port, 10),
        uuid: cfg.id,
        alterId: cfg.aid || 0,
        cipher: 'auto',
        tls: cfg.tls === 'tls',
        network: cfg.net,
        wsOpts: cfg.net === 'ws' ? {
          path: cfg.path,
          headers: { Host: cfg.host }
        } : undefined
      });
    case 'vless':
      return yaml.dump({
        name: cfg.ps,
        type: 'vless',
        server: cfg.add,
        port: parseInt(cfg.port, 10),
        uuid: cfg.id,
        cipher: 'none',
        tls: cfg.tls === 'tls',
        network: cfg.net,
        wsOpts: cfg.net === 'ws' ? {
          path: cfg.path,
          headers: { Host: cfg.host }
        } : undefined,
        sni: cfg.sni
      });
	case 'trojan':
	  return yaml.dump({
		name: cfg.ps,
		type: 'trojan',
		server: cfg.add,
		port: parseInt(cfg.port, 10),
		password: cfg.id,
		network: cfg.net,
		sni: cfg.sni,
		wsOpts: cfg.net === 'ws' ? {
		  path: cfg.path,
		  headers: { Host: cfg.host }
		} : undefined
	  });
    default:
      return 'Unsupported protocol';
  }
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
  bot.action(/start_bug_(\d+)/, async (ctx) => {
    const userId = +ctx.match[1];
    if (!accountCache.has(userId)) return ctx.reply('⚠️ Data tidak ditemukan');
    await ctx.answerCbQuery(); await ctx.editMessageReplyMarkup();
    await ctx.reply('Pilih bug untuk URI:', Markup.inlineKeyboard(
      bugOptions.map(b => [Markup.button.callback(b.label, `uri_bug_${userId}_${b.value}|${b.wildcard}`)])
    ));
  });

  bot.action(/start_convert_(\d+)/, async (ctx) => {
    const userId = +ctx.match[1];
    if (!accountCache.has(userId)) return ctx.reply('⚠️ Data tidak ditemukan');
    await ctx.answerCbQuery(); await ctx.editMessageReplyMarkup();
    await ctx.reply('Pilih bug untuk YAML:', Markup.inlineKeyboard(
      bugOptions.map(b => [Markup.button.callback(b.label, `yaml_bug_${userId}_${b.value}|${b.wildcard}`)])
    ));
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

  await ctx.replyWithHTML(`✅ <b>GENERATE ACCOUNT SUCCESS by KEDAIVPN</b>

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

  await ctx.replyWithHTML(`✅ <b>CONVERT TO YAML SUCCESS by KEDAIVPN:</b> <code>${bug}</code>

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
