const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sellvpn.db');
const { updateUserAccountCreation, saveUserAccount } = require('../lib/userTracking');

async function createssh(userId, username, password, exp, iplimit, serverId, hargaPerHari) {
  console.log(`Creating SSH account for ${username} with expiry ${exp} days`);

  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) {
    return '❌ Username tidak valid. Mohon gunakan hanya huruf dan angka tanpa spasi.';
  }

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], async (err, server) => {
      if (err || !server) return resolve('❌ Server tidak ditemukan. Silakan coba lagi.');

      const url = `http://${server.domain}:5888/createssh?user=${username}&password=${password}&exp=${exp}&iplimit=${iplimit}&auth=${server.auth}`;

      try {
        const response = await axios.get(url);
        if (response.data.status === "success") {
          const sshData = response.data.data;

          await updateUserAccountCreation(userId, Number(exp), false);
          await saveUserAccount(userId, sshData.username, 'ssh', serverId, sshData.expired, hargaPerHari, Number(exp));

            const msg = `
🌟 *AKUN SSH PREMIUM* 🌟

🔹 *Informasi Akun Anda*
┌─────────────────────
│ *Username* : \`${sshData.username}\`
│ *Password* : \`${sshData.password}\`
└─────────────────────
┌─────────────────────
│ *Domain*   : \`${sshData.domain}\`
│ *SSH WS*   : \`80\`
│ *SSH SSL WS*: \`443\`
└─────────────────────
🔗 *DETAIL ACCOUNT*
───────────────────────
Format Account WS: 
\`${sshData.domain}:80@${sshData.username}:${sshData.password}\`
───────────────────────
Format Account TLS: 
\`${sshData.domain}:443@${sshData.username}:${sshData.password}\`
───────────────────────
Format Account UDP: 
\`${sshData.domain}:1-65535@${sshData.username}:${sshData.password}\`
───────────────────────
┌─────────────────────
│ Expires: \`${sshData.expired}\`
│ IP Limit: \`${sshData.ip_limit}\`
└─────────────────────

♨ᵗᵉʳⁱᵐᵃᵏᵃˢⁱʰ ᵗᵉˡᵃʰ ᵐᵉⁿᵍᵍᵘⁿᵃᵏᵃⁿ ˡᵃʸᵃⁿᵃⁿ ᵏᵃᵐⁱ♨
`;
              console.log(`SSH ${sshData.username} account created successfully`);
          return resolve(msg);
		  console.log('✅ MSG dari createssh:', msg);
        } else {
          return resolve(`❌ Terjadi kesalahan: ${response.data.message}`);
        }
      } catch (error) {
        console.error('Error saat membuat SSH:', error);
        return resolve('❌ Terjadi kesalahan saat membuat SSH. Silakan coba lagi nanti.');
      }
    });
  });
}

async function createvmess(userId, username, exp, quota, limitip, serverId, hargaPerHari) {
  console.log(`Creating VMess account for ${username}`);

  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) return '❌ Username tidak valid.';

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], async (err, server) => {
      if (err || !server) return resolve('❌ Server tidak ditemukan. Silakan coba lagi.');

      const url = `http://${server.domain}:5888/createvmess?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${server.auth}`;

      try {
        const response = await axios.get(url);
        if (response.data.status === 'success') {
          const vmessData = response.data.data;

          await updateUserAccountCreation(userId, Number(exp), false);
          await saveUserAccount(userId, vmessData.username, 'vmess', serverId, vmessData.expired, hargaPerHari, Number(exp));
            const msg = `
🌟 *AKUN VMESS PREMIUM* 🌟

🔹 *Informasi Akun Anda*
┌─────────────────────
│ *Username* : \`${vmessData.username}\`
│ *Domain*   : \`${vmessData.domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Alter ID* : \`0\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/vmess\`
│ *Path GRPC*: \`vmess-grpc\`
└─────────────────────
🔐 *URL VMESS TLS*
\`${vmessData.vmess_tls_link}\`
──────────────────────
🔓 *URL VMESS HTTP*
\`${vmessData.vmess_nontls_link}\`
──────────────────────
🔒 *URL VMESS GRPC*
\`${vmessData.vmess_grpc_link}\`
──────────────────────
🔒 *UUID*
\`${vmessData.uuid}\`
┌─────────────────────
│ Expiry: \`${vmessData.expired}\`
│ Quota: \`${vmessData.quota === '0 GB' ? 'Unlimited' : vmessData.quota}\`
│ IP Limit: \`${vmessData.ip_limit === '0' ? 'Unlimited' : vmessData.ip_limit}\`
└─────────────────────
Save Account Link: [Save Account](https://${vmessData.domain}:81/vmess-${vmessData.username}.txt)
♨ᵗᵉʳⁱᵐᵃᵏᵃˢⁱʰ ᵗᵉˡᵃʰ ᵐᵉⁿᵍᵍᵘⁿᵃᵏᵃⁿ ˡᵃʸᵃⁿᵃⁿ ᵏᵃᵐⁱ♨
`;
              console.log('VMess account created successfully');
              return resolve(msg);
        } else {
          return resolve(`❌ Gagal membuat akun: ${response.data.message}`);
        }
      } catch {
        return resolve('❌ Error saat membuat akun.');
      }
    });
  });
}

async function createvless(userId, username, exp, quota, limitip, serverId, hargaPerHari) {
  console.log(`Creating VLESS account for ${username}`);

  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) return '❌ Username tidak valid.';

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], async (err, server) => {
      if (err || !server) return resolve('❌ Server tidak ditemukan. Silakan coba lagi.');

      const url = `http://${server.domain}:5888/createvless?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${server.auth}`;

      try {
        const response = await axios.get(url);
        if (response.data.status === 'success') {
          const vlessData = response.data.data;

          await updateUserAccountCreation(userId, Number(exp), false);
          await saveUserAccount(userId, vlessData.username, 'vless', serverId, vlessData.expired, hargaPerHari, Number(exp));
            const msg = `
🌟 *AKUN VLESS PREMIUM* 🌟

🔹 *Informasi Akun Anda*
┌─────────────────────
│ *Username* : \`${vlessData.username}\`
│ *Domain*   : \`${vlessData.domain}\`
│ *NS*       : \`${vlessData.ns_domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/vless\`
│ *Path GRPC*: \`vless-grpc\`
└─────────────────────
🔐 *URL VLESS TLS*
\`${vlessData.vless_tls_link}\`
──────────────────────
🔓 *URL VLESS HTTP*
\`${vlessData.vless_nontls_link}\`
──────────────────────
🔒 *URL VLESS GRPC*
\`${vlessData.vless_grpc_link}\`
──────────────────────
🔒 *UUID*
\`${vlessData.uuid}\`
┌─────────────────────
│ Expiry: \`${vlessData.expired}\`
│ Quota: \`${vlessData.quota === '0 GB' ? 'Unlimited' : vlessData.quota}\`
│ IP Limit: \`${vlessData.ip_limit === '0' ? 'Unlimited' : vlessData.ip_limit}\`
└─────────────────────
Save Account Link: [Save Account](https://${vlessData.domain}:81/vless-${vlessData.username}.txt)
♨ᵗᵉʳⁱᵐᵃᵏᵃˢⁱʰ ᵗᵉˡᵃʰ ᵐᵉⁿᵍᵍᵘⁿᵃᵏᵃⁿ ˡᵃʸᵃⁿᵃⁿ ᵏᵃᵐⁱ♨
`;
              console.log('VLESS account created successfully');
              return resolve(msg);
        } else {
          return resolve(`❌ Gagal membuat akun: ${response.data.message}`);
        }
      } catch {
        return resolve('❌ Error saat membuat akun.');
      }
    });
  });
}

async function createtrojan(userId, username, exp, quota, limitip, serverId, hargaPerHari) {
  console.log(`Creating Trojan account for ${username}`);

  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) return '❌ Username tidak valid.';

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], async (err, server) => {
      if (err || !server) return resolve('❌ Server tidak ditemukan. Silakan coba lagi.');

      const url = `http://${server.domain}:5888/createtrojan?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${server.auth}`;

      try {
        const response = await axios.get(url);
        if (response.data.status === 'success') {
          const trojanData = response.data.data;

          await updateUserAccountCreation(userId, Number(exp), false);
          await saveUserAccount(userId, trojanData.username, 'trojan', serverId, trojanData.expired, hargaPerHari, Number(exp));
            const msg = `
🌟 *AKUN TROJAN PREMIUM* 🌟

🔹 *Informasi Akun Anda*
┌─────────────────────
│ *Username* : \`${trojanData.username}\`
│ *Domain*   : \`${trojanData.domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/trojan-ws\`
│ *Path GRPC*: \`trojan-grpc\`
└─────────────────────
🔐 *URL TROJAN TLS*
\`${trojanData.trojan_tls_link}\`
──────────────────────
🔐 *URL TROJAN HTTP*
\`${trojanData.trojan_nontls_link1}\`
──────────────────────
🔒 *URL TROJAN GRPC*
\`${trojanData.trojan_grpc_link}\`
──────────────────────
🔒 *PASSWORD*
\`${trojanData.uuid}\`
┌─────────────────────
│ Expiry: \`${trojanData.expired}\`
│ Quota: \`${trojanData.quota === '0 GB' ? 'Unlimited' : trojanData.quota}\`
│ IP Limit: \`${trojanData.ip_limit === '0' ? 'Unlimited' : trojanData.ip_limit}\`
└─────────────────────
Save Account Link: [Save Account](https://${trojanData.domain}:81/trojan-${trojanData.username}.txt)
♨ᵗᵉʳⁱᵐᵃᵏᵃˢⁱʰ ᵗᵉˡᵃʰ ᵐᵉⁿᵍᵍᵘⁿᵃᵏᵃⁿ ˡᵃʸᵃⁿᵃⁿ ᵏᵃᵐⁱ♨
`;
              console.log('Trojan account created successfully');
              return resolve(msg);
        } else {
          return resolve(`❌ Gagal membuat akun: ${response.data.message}`);
        }
      } catch {
        return resolve('❌ Error saat membuat akun.');
      }
    });
  });
}

async function createshadowsocks(userId, username, exp, quota, limitip, serverId, hargaPerHari) {
  console.log(`Creating Shadowsocks account for ${username}`);

  if (/\s/.test(username) || /[^a-zA-Z0-9]/.test(username)) return '❌ Username tidak valid.';

  return new Promise((resolve) => {
    db.get('SELECT * FROM Server WHERE id = ?', [serverId], async (err, server) => {
      if (err || !server) return resolve('❌ Server tidak ditemukan. Silakan coba lagi.');

      const url = `http://${server.domain}:5888/createshadowsocks?user=${username}&exp=${exp}&quota=${quota}&iplimit=${limitip}&auth=${server.auth}`;

      try {
        const response = await axios.get(url);
        if (response.data.status === 'success') {
          const shadowsocksData = response.data.data;

          await updateUserAccountCreation(userId, Number(exp), false);
          await saveUserAccount(userId, shadowsocksData.username, 'shadowsocks', serverId, shadowsocksData.expired, hargaPerHari, Number(exp));
            const msg = `
🌟 *AKUN SHADOWSOCKS PREMIUM* 🌟

🔹 *Informasi Akun Anda*
┌─────────────────────
│ *Username* : \`${shadowsocksData.username}\`
│ *Domain*   : \`${shadowsocksData.domain}\`
│ *Port TLS* : \`443\`
│ *Port HTTP*: \`80\`
│ *Alter ID* : \`0\`
│ *Security* : \`Auto\`
│ *Network*  : \`Websocket (WS)\`
│ *Path*     : \`/shadowsocks\`
│ *Path GRPC*: \`shadowsocks-grpc\`
└─────────────────────
🔐 *URL SHADOWSOCKS TLS*
\`${shadowsocksData.ss_link_ws}\`
──────────────────────
🔒 *URL SHADOWSOCKS GRPC*
\`${shadowsocksData.ss_link_grpc}\`
──────────────────────
🔒 *UUID*
\`${shadowsocksData.uuid}\`
┌─────────────────────
│ Expiry: \`${shadowsocksData.expired}\`
│ Quota: \`${shadowsocksData.quota === '0 GB' ? 'Unlimited' : shadowsocksData.quota}\`
│ IP Limit: \`${shadowsocksData.ip_limit === '0' ? 'Unlimited' : shadowsocksData.ip_limit}\`
└─────────────────────
Save Account Link: [Save Account](https://${shadowsocksData.domain}:81/shadowsocks-${shadowsocksData.username}.txt)
♨ᵗᵉʳⁱᵐᵃᵏᵃˢⁱʰ ᵗᵉˡᵃʰ ᵐᵉⁿᵍᵍᵘⁿᵃᵏᵃⁿ ˡᵃʸᵃⁿᵃⁿ ᵏᵃᵐⁱ♨
`;
              console.log('Shadowsocks account created successfully');
              return resolve(msg);
        } else {
          return resolve(`❌ Gagal membuat akun: ${response.data.message}`);
        }
      } catch {
        return resolve('❌ Error saat membuat akun.');
      }
    });
  });
}

module.exports = {
  createssh,
  createvmess,
  createvless,
  createtrojan,
  createshadowsocks
};
