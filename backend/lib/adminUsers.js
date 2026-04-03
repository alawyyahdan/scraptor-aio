const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'admin-users.json');
const BCRYPT_ROUNDS = 10;

const USER_RE = /^[a-z0-9._-]{3,32}$/;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStore() {
  ensureDir();
  if (!fs.existsSync(USERS_FILE)) return { users: [] };
  try {
    const p = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return { users: Array.isArray(p.users) ? p.users : [] };
  } catch {
    return { users: [] };
  }
}

function writeStore(store) {
  ensureDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function normUsername(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .slice(0, 32);
}

/** Migrasi sekali dari ADMIN_USER / ADMIN_PASS .env jika belum ada user file. */
function ensureSeeded() {
  const store = readStore();
  if (store.users.length > 0) return store;

  const username = normUsername(process.env.ADMIN_USER || 'admin');
  let password = process.env.ADMIN_PASS;
  if (password == null || String(password).trim() === '') {
    password = 'admin';
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        `[admin-users] Belum ada admin di data/. ADMIN_PASS kosong → seed awal username="${username}" password="admin". Segera ganti di Dashboard → Admins.`
      );
    }
  }

  const passwordHash = bcrypt.hashSync(String(password).trim(), BCRYPT_ROUNDS);
  store.users.push({
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  writeStore(store);
  return readStore();
}

function findByUsername(username) {
  const u = normUsername(username);
  const store = readStore();
  return store.users.find((x) => x.username === u) || null;
}

function verifyLogin(username, plainPassword) {
  ensureSeeded();
  const store = readStore();
  if (store.users.length === 0) return null;
  const u = findByUsername(username);
  if (!u || !plainPassword) return null;
  if (!bcrypt.compareSync(String(plainPassword), u.passwordHash)) return null;
  return { username: u.username };
}

function listPublic() {
  ensureSeeded();
  return readStore().users.map((x) => ({
    username: x.username,
    createdAt: x.createdAt || null,
  }));
}

function validateNewPassword(p) {
  const s = String(p || '');
  if (s.length < 8) return 'Password minimal 8 karakter.';
  if (s.length > 128) return 'Password terlalu panjang.';
  return null;
}

function addUser(usernameRaw, passwordRaw) {
  ensureSeeded();
  const username = normUsername(usernameRaw);
  if (!USER_RE.test(username)) {
    throw new Error('Username: 3–32 karakter, huruf/angka ._- saja.');
  }
  const pwErr = validateNewPassword(passwordRaw);
  if (pwErr) throw new Error(pwErr);

  const store = readStore();
  if (store.users.some((x) => x.username === username)) {
    throw new Error('Username sudah dipakai.');
  }
  store.users.push({
    username,
    passwordHash: bcrypt.hashSync(String(passwordRaw), BCRYPT_ROUNDS),
    createdAt: new Date().toISOString(),
  });
  writeStore(store);
}

/**
 * @returns {{ username: string, newToken?: string }}
 */
function updateSelf(currentUsername, { oldPassword, newUsername, newPassword }, jwtSign) {
  if (!oldPassword || !String(oldPassword).trim()) {
    throw new Error('Password saat ini wajib diisi.');
  }
  const hasNewU =
    newUsername !== undefined &&
    newUsername !== null &&
    String(newUsername).trim() !== '';
  const hasNewP =
    newPassword !== undefined &&
    newPassword !== null &&
    String(newPassword).trim() !== '';
  if (!hasNewU && !hasNewP) {
    throw new Error('Isi username baru dan/atau password baru.');
  }

  const store = readStore();
  const un = normUsername(currentUsername);
  const idx = store.users.findIndex((x) => x.username === un);
  if (idx === -1) throw new Error('Akun tidak ditemukan.');

  if (!bcrypt.compareSync(String(oldPassword), store.users[idx].passwordHash)) {
    throw new Error('Password saat ini salah.');
  }

  let nextUsername = un;
  let needNewJwt = false;
  let changed = false;

  if (newUsername !== undefined && newUsername !== null && String(newUsername).trim()) {
    const nu = normUsername(newUsername);
    if (nu !== un) {
      if (!USER_RE.test(nu)) {
        throw new Error('Username baru: 3–32 karakter, huruf/angka ._- saja.');
      }
      if (store.users.some((x) => x.username === nu)) {
        throw new Error('Username baru sudah dipakai.');
      }
      store.users[idx].username = nu;
      nextUsername = nu;
      needNewJwt = true;
      changed = true;
    }
  }

  if (newPassword !== undefined && newPassword !== null && String(newPassword).trim()) {
    const pwErr = validateNewPassword(newPassword);
    if (pwErr) throw new Error(pwErr);
    store.users[idx].passwordHash = bcrypt.hashSync(String(newPassword), BCRYPT_ROUNDS);
    changed = true;
  }

  if (!changed) {
    throw new Error('Tidak ada perubahan (username baru sama dengan sekarang?).');
  }

  writeStore(store);

  const out = { username: nextUsername };
  if (needNewJwt && typeof jwtSign === 'function') {
    out.newToken = jwtSign(nextUsername);
  }
  return out;
}

function removeUser(requesterUsername, targetUsername) {
  const reqU = normUsername(requesterUsername);
  const tgt = normUsername(targetUsername);
  if (reqU === tgt) {
    throw new Error('Tidak bisa menghapus akun yang sedang dipakai.');
  }
  const store = readStore();
  if (store.users.length <= 1) {
    throw new Error('Harus ada minimal satu admin.');
  }
  const next = store.users.filter((x) => x.username !== tgt);
  if (next.length === store.users.length) {
    throw new Error('User tidak ditemukan.');
  }
  store.users = next;
  writeStore(store);
}

module.exports = {
  ensureSeeded,
  verifyLogin,
  listPublic,
  addUser,
  updateSelf,
  removeUser,
  normUsername,
};
