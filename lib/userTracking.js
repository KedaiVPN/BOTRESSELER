const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sellvpn.db');

// Fungsi untuk mencatat statistik akun
async function updateUserAccountCreation(userId, masaAktif, isTrial = false) {
  const currentDate = new Date().toISOString().split('T')[0];
  let updates = [];

  if (!isTrial) updates.push("total_accounts_created = total_accounts_created + 1");
  if (masaAktif === 30) updates.push("accounts_created_30days = accounts_created_30days + 1");
  updates.push("last_account_creation_date = ?");

  const sql = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
  await new Promise((resolve, reject) => {
    db.run(sql, [currentDate, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Fungsi untuk menyimpan akun ke tabel user_accounts
async function saveUserAccount(userId, username, jenis, serverId, expired, price, duration) {
  const createdAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO user_accounts (user_id, username, jenis, server_id, expired, created_at, price, duration_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, jenis, serverId, expired, createdAt, price, duration],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Fungsi untuk memperbarui masa aktif dan durasi saat renew
async function updateAccountRenewal(userId, username, jenis, tambahanHari) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT expired, duration_days FROM user_accounts WHERE user_id = ? AND username = ? AND jenis = ?`, [userId, username, jenis], (err, row) => {
      if (err || !row) return reject('Akun tidak ditemukan');

      const currentExpired = new Date(row.expired);
      const now = new Date();
      const sisaHari = Math.ceil((currentExpired - now) / (1000 * 60 * 60 * 24));
      const baseHari = sisaHari <= 0 ? 0 : sisaHari;
      const newDuration = baseHari + tambahanHari;
      currentExpired.setDate(currentExpired.getDate() + tambahanHari);
      const expiredStr = currentExpired.toISOString().split('T')[0];

      db.run(`UPDATE user_accounts SET expired = ?, duration_days = ? WHERE user_id = ? AND username = ? AND jenis = ?`,
        [expiredStr, newDuration, userId, username, jenis], (err) => {
          if (err) return reject(err);
          resolve(true);
        });
    });
  });
}

// Fungsi untuk menampilkan akun aktif user berdasarkan jenis dan serverId untuk proses renew
async function showRenewableAccountsByServer(ctx, jenis, serverId) {
  const userId = ctx.from.id;
  const now = new Date().toISOString().split('T')[0];

  db.all(`SELECT * FROM user_accounts WHERE user_id = ? AND jenis = ? AND server_id = ? AND expired > ?`, [userId, jenis, serverId, now], (err, rows) => {
    if (err || rows.length === 0) {
      return ctx.reply('⚠️ Tidak ada akun aktif yang bisa diperpanjang untuk server ini.');
    }

    const keyboard = [];
    for (let i = 0; i < rows.length; i += 2) {
      const row = [];
      row.push({
        text: rows[i].username,
        callback_data: `renew_username_selected_${rows[i].username}_${jenis}_${serverId}`
      });
      if (rows[i + 1]) {
        row.push({
          text: rows[i + 1].username,
          callback_data: `renew_username_selected_${rows[i + 1].username}_${jenis}_${serverId}`
        });
      }
      keyboard.push(row);
    }

    ctx.reply('🔁 Pilih akun yang ingin diperpanjang:', {
      reply_markup: { inline_keyboard: keyboard }
    });
  });
}

module.exports = {
  updateUserAccountCreation,
  saveUserAccount,
  updateAccountRenewal,
  showRenewableAccountsByServer
};