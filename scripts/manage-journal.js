#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const yaml = require('js-yaml');
const dotenv = require('dotenv');
const matter = require('gray-matter');
const mysql = require('mysql2/promise');
const inquirer = require('inquirer');

const CONFIG_PATH = path.join(__dirname, 'config.yaml');
const ENV_PATH = path.join(__dirname, '.env');

const die = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const expandHome = (p) =>
  p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;

const todayLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const toDay = (v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    const s = v.trim();
    if (isDateStr(s)) return s;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
};

const parseTags = (v) => {
  if (!v) return [];
  const list = Array.isArray(v) ? v : String(v).split(',');
  return [...new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
};

const loadEnv = () => {
  if (!fs.existsSync(ENV_PATH)) return {};
  return dotenv.parse(fs.readFileSync(ENV_PATH));
};

const ENV_REF = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g;

const expandString = (str, env) =>
  str.replace(ENV_REF, (match, name, fallback) => {
    const value = process.env[name] ?? env[name];
    if (value !== undefined && value !== '') return value;
    if (fallback !== undefined) return fallback;
    die(`unresolved env var "${name}" referenced in ${CONFIG_PATH}`);
  });

const expandEnv = (value, env) => {
  if (typeof value === 'string') return expandString(value, env);
  if (Array.isArray(value)) return value.map((v) => expandEnv(v, env));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = expandEnv(v, env);
    return out;
  }
  return value;
};

const loadConfig = () => {
  if (!fs.existsSync(CONFIG_PATH)) {
    die(`config not found at ${CONFIG_PATH} (copy config.example.yaml -> config.yaml)`);
  }
  let config;
  try {
    config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    die(`could not parse ${CONFIG_PATH}: ${e.message}`);
  }
  if (!config || typeof config !== 'object' || !config.connections ||
      !Object.keys(config.connections).length) {
    die(`no connections defined in ${CONFIG_PATH}`);
  }
  return expandEnv(config, loadEnv());
};

const findFreePort = (start, host) =>
  new Promise((resolve, reject) => {
    let port = Number(start) || 3036;
    const max = port + 100;
    const attempt = () => {
      if (port > max) return reject(new Error(`no free port in ${start}-${max}`));
      const server = net.createServer();
      server.unref();
      server.once('error', () => {
        port += 1;
        attempt();
      });
      server.listen(port, host, () => server.close(() => resolve(port)));
    };
    attempt();
  });

const startTunnel = (ssh, tunnel, port) => {
  const args = [
    '-N',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
  ];
  if (ssh.port) args.push('-p', String(ssh.port));
  if (ssh.key) args.push('-i', expandHome(ssh.key));
  args.push('-L', `${tunnel.bind_host}:${port}:${tunnel.target_host}:${tunnel.target_port}`);
  args.push(`${ssh.user}@${ssh.host}`);
  return spawn('ssh', args, { stdio: ['ignore', 'inherit', 'inherit'] });
};

const waitForPort = (host, port, timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const socket = net.connect({ host, port });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error('tunnel did not come up in time'));
        else setTimeout(attempt, 200);
      });
    };
    attempt();
  });

const pickWithFzf = (candidates, { prompt = 'select', preview = null, multi = false } = {}) => {
  if (!candidates.length) return [];
  const args = ['--prompt', `${prompt}> `, '--reverse', '--height', '70%'];
  if (multi) args.push('--multi');
  if (preview) args.push('--preview', preview);
  const res = spawnSync('fzf', args, {
    input: candidates.join('\n'),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  if (res.error && res.error.code === 'ENOENT') die('fzf not found in PATH');
  if (res.status !== 0) return [];
  return res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
};

const listFiles = () => {
  const res = spawnSync('find', ['.', '-type', 'f', '-not', '-path', '*/.*'], { encoding: 'utf8' });
  if (res.error) die(`could not list files: ${res.error.message}`);
  return res.stdout.split('\n').map((l) => l.replace(/^\.\//, '').trim()).filter(Boolean);
};

const pickFile = (preset) => {
  if (preset) return preset;
  const files = listFiles();
  if (!files.length) die('no files found under the current directory');
  const picked = pickWithFzf(files, { prompt: 'file', preview: 'cat {}' });
  return picked.length ? picked[0] : null;
};

const connect = async (conn, creds, tunnelPort) => {
  const remote = conn.kind === 'remote';
  return mysql.createConnection({
    host: remote ? conn.tunnel.bind_host : conn.host,
    port: remote ? tunnelPort : conn.port,
    user: creds.user,
    password: creds.pass,
    database: conn.database,
    dateStrings: true,
  });
};

const addEntry = async (db, presetPath, dryRun) => {
  const file = pickFile(presetPath);
  if (!file) {
    console.log('cancelled');
    return;
  }

  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  const body = content.trim();

  const title = data.title ? String(data.title) : null;
  const day = toDay(data.date);
  const tags = parseTags(data.tags);

  const questions = [];
  if (!title) {
    questions.push({
      type: 'input',
      name: 'title',
      message: 'title:',
      default: path.basename(file, path.extname(file)),
      validate: (v) => (v.trim() && v.trim().length <= 255) || 'required (max 255 chars)',
    });
  }
  if (!day) {
    questions.push({
      type: 'input',
      name: 'date',
      message: 'date (YYYY-MM-DD):',
      default: todayLocal(),
      validate: (v) => isDateStr(v.trim()) || 'expected YYYY-MM-DD',
    });
  }
  const answers = questions.length ? await inquirer.prompt(questions) : {};

  const finalTitle = (title || answers.title).trim();
  const finalDay = day || answers.date.trim();
  const badTag = tags.find((t) => t.length > 64);
  if (badTag) die(`tag too long (max 64 chars): "${badTag}"`);

  console.log(`\n  title: ${finalTitle}\n  date:  ${finalDay}\n  tags:  ${tags.length ? tags.join(', ') : '(none)'}\n  body:  ${body.length} chars\n`);

  if (dryRun) {
    console.log('dry-run: no changes written');
    return;
  }

  const { confirmed } = await inquirer.prompt([
    { type: 'confirm', name: 'confirmed', message: 'upsert this entry?', default: true },
  ]);
  if (!confirmed) {
    console.log('cancelled');
    return;
  }

  const conn = db;
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute(
      `INSERT INTO journal_entry (title, body, created_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), body = VALUES(body), updated_at = NOW()`,
      [finalTitle, body, `${finalDay} 00:00:00`]
    );
    const entryId = res.insertId;
    const verb = res.affectedRows === 1 ? 'created' : 'updated';

    const tagIds = [];
    for (const name of tags) {
      const [tres] = await conn.execute(
        `INSERT INTO tag (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [name]
      );
      tagIds.push(tres.insertId);
    }

    if (tagIds.length) {
      const placeholders = tagIds.map(() => '(?, ?)').join(', ');
      const params = [];
      for (const id of tagIds) params.push(entryId, id);
      await conn.execute(
        `INSERT IGNORE INTO journal_entry_tag (entry_id, tag_id) VALUES ${placeholders}`,
        params
      );
      await conn.execute(
        `DELETE FROM journal_entry_tag WHERE entry_id = ? AND tag_id NOT IN (${tagIds.map(() => '?').join(', ')})`,
        [entryId, ...tagIds]
      );
    } else {
      await conn.execute(`DELETE FROM journal_entry_tag WHERE entry_id = ?`, [entryId]);
    }

    await conn.commit();
    console.log(`ok: ${verb} entry #${entryId} "${finalTitle}"`);
  } catch (e) {
    await conn.rollback();
    throw e;
  }
};

const deleteEntry = async (db) => {
  const [rows] = await db.query(
    `SELECT id, title, DATE_FORMAT(created_at, '%Y-%m-%d') AS day
       FROM journal_entry ORDER BY created_at DESC, title ASC`
  );
  if (!rows.length) {
    console.log('no entries to delete');
    return;
  }

  const candidates = rows.map((r) => `${r.id}\t${r.day}  ${r.title}`);
  const picked = pickWithFzf(candidates, { prompt: 'delete', multi: true });
  if (!picked.length) {
    console.log('cancelled');
    return;
  }

  const ids = picked.map((line) => Number(line.split('\t')[0])).filter(Boolean);
  console.log(`\nabout to delete:\n${picked.map((l) => '  ' + l.split('\t')[1]).join('\n')}\n`);
  const { confirmed } = await inquirer.prompt([
    { type: 'confirm', name: 'confirmed', message: `delete ${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}?`, default: false },
  ]);
  if (!confirmed) {
    console.log('cancelled');
    return;
  }

  const [res] = await db.query(
    `DELETE FROM journal_entry WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ids
  );
  console.log(`ok: deleted ${res.affectedRows} entr${res.affectedRows === 1 ? 'y' : 'ies'}`);
};

const listEntries = async (db) => {
  const [rows] = await db.query(
    `SELECT id, title, DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
            (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ')
               FROM journal_entry_tag jt JOIN tag t ON t.id = jt.tag_id
              WHERE jt.entry_id = e.id) AS tags
       FROM journal_entry e ORDER BY created_at DESC, title ASC`
  );
  if (!rows.length) {
    console.log('no entries');
    return;
  }
  for (const r of rows) {
    console.log(`${r.day}  ${r.title}  (#${r.id})${r.tags ? `  [${r.tags}]` : ''}`);
  }
  console.log(`\n${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`);
};

const chooseConnection = async (config) => {
  const names = Object.keys(config.connections);
  if (names.length === 1) return names[0];
  const fallback = names.includes(config.default) ? config.default : names[0];
  const { name } = await inquirer.prompt([
    {
      type: 'list',
      name: 'name',
      message: 'connection:',
      choices: names,
      default: fallback,
    },
  ]);
  return name;
};

const chooseAction = async (preset) => {
  if (preset) return preset;
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'action:',
      choices: ['add', 'delete', 'list'],
    },
  ]);
  return action;
};

const main = async () => {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const positional = argv.filter((a) => !a.startsWith('--'));

  const config = loadConfig();

  const action = await chooseAction(positional[0]);
  if (!['add', 'delete', 'list'].includes(action)) {
    die(`unknown action "${action}" (use add|delete|list)`);
  }
  const connName = await chooseConnection(config);
  const conn = config.connections[connName];
  if (!conn.user || conn.password === undefined) {
    die(`connection "${connName}" is missing user/password in ${CONFIG_PATH}`);
  }
  const creds = { user: conn.user, pass: conn.password };

  let tunnel = null;
  let tunnelPort = null;
  const cleanup = () => {
    if (tunnel && !tunnel.killed) tunnel.kill();
  };

  if (conn.kind === 'remote') {
    if (!conn.ssh || !conn.tunnel) die(`connection "${connName}" needs ssh + tunnel settings`);
    tunnelPort = await findFreePort(conn.tunnel.port_start, conn.tunnel.bind_host);
    tunnel = startTunnel(conn.ssh, conn.tunnel, tunnelPort);
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(130);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(143);
    });
    try {
      await waitForPort(conn.tunnel.bind_host, tunnelPort);
    } catch (e) {
      cleanup();
      die(`ssh tunnel to ${conn.ssh.host} failed: ${e.message}`);
    }
    console.log(`tunnel: ${conn.tunnel.bind_host}:${tunnelPort} -> ${conn.ssh.host}:${conn.tunnel.target_port}`);
  }

  let db;
  try {
    db = await connect(conn, creds, tunnelPort);
  } catch (e) {
    cleanup();
    die(`db connection failed: ${e.message}`);
  }

  try {
    if (action === 'add') await addEntry(db, positional[1], dryRun);
    else if (action === 'delete') await deleteEntry(db);
    else await listEntries(db);
  } finally {
    await db.end();
    cleanup();
  }
};

main().catch((e) => {
  console.error(`error: ${e.message}`);
  process.exit(1);
});
