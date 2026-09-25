const express = require('express');
const fs = require('fs');
const mysql = require('mysql2');
const path = require('path');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection
const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

const dbPromise = db.promise();


db.connect(err => {
    if (err) {
        console.error('MySQL error:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL');

});

const projects = require('./data/projects');

const IMAGE_EXTS = 'jpe?g|png|gif|webp|avif';
const IMAGE_EXT_RE = new RegExp(`\\.(${IMAGE_EXTS})$`, 'i');
const OLD_IMAGE_RE = new RegExp(`\\.old\\.(${IMAGE_EXTS})$`, 'i');

const PAGE_SIZE = 10;
const EXCERPT_WORDS = 40;

const excerpt = (body, words = EXCERPT_WORDS) => {
    const flat = String(body).replace(/\s+/g, ' ').trim();
    const parts = flat.split(' ');
    if (parts.length <= words) return flat;
    return `${parts.slice(0, words).join(' ')}…`;
};

const safePage = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
};

const safeQ = (v) => (typeof v === 'string' ? v.trim().slice(0, 100) : '');

const parseTags = (v) => {
    if (!v) return [];
    const raw = Array.isArray(v) ? v : [v];
    const names = raw
        .flatMap((s) => String(s).split(','))
        .map((s) => s.trim())
        .filter(Boolean);
    return [...new Set(names)].slice(0, 20);
};

const escapeLike = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

app.get('/', (req, res) => {
    const imgDir = path.join(__dirname, 'public', 'img');
    const images = fs.readdirSync(imgDir)
        .filter((f) => IMAGE_EXT_RE.test(f) && !OLD_IMAGE_RE.test(f))
        .sort(() => 0.5 - Math.random());
    res.render('index', { images });
});

app.get('/portfolio', (req, res) => {
    res.render('portfolio', { projects });
});

app.get('/portfolio/:slug', (req, res) => {
    const project = projects.find((p) => p.slug === req.params.slug);
    if (!project) {
        return res.status(404).render('error', { status: 404, message: 'Project not found.' });
    }
    res.render('portfolio-view', { project });
});

app.get('/journal', async (req, res) => {
    const page = safePage(req.query.page);
    const activeTags = parseTags(req.query.tags);
    const q = safeQ(req.query.q);

    const conditions = [];
    const params = [];

    if (q) {
        const like = `%${escapeLike(q)}%`;
        conditions.push('(e.title LIKE ? OR e.body LIKE ?)');
        params.push(like, like);
    }
    if (activeTags.length) {
        const placeholders = activeTags.map(() => '?').join(', ');
        conditions.push(`e.id IN (
            SELECT et.entry_id
              FROM journal_entry_tag et
              JOIN tag t ON t.id = et.tag_id
             WHERE t.name IN (${placeholders})
             GROUP BY et.entry_id
            HAVING COUNT(DISTINCT t.name) = ?
        )`);
        params.push(...activeTags, activeTags.length);
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const [[{ total }]] = await dbPromise.query(
            `SELECT COUNT(*) AS total FROM journal_entry e ${whereSql}`,
            params
        );

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const currentPage = Math.min(page, totalPages);
        const offset = (currentPage - 1) * PAGE_SIZE;

        const [entries] = await dbPromise.query(
            `SELECT e.id, e.title, e.body,
                    DATE_FORMAT(e.created_at, '%Y/%m/%d') AS day,
                    (SELECT GROUP_CONCAT(t2.name ORDER BY t2.name SEPARATOR ',')
                       FROM journal_entry_tag et2
                       JOIN tag t2 ON t2.id = et2.tag_id
                      WHERE et2.entry_id = e.id) AS tag_names
               FROM journal_entry e
               ${whereSql}
              ORDER BY e.created_at DESC, e.id DESC
              LIMIT ? OFFSET ?`,
            [...params, PAGE_SIZE, offset]
        );

        const [tagRows] = await dbPromise.query(
            `SELECT DISTINCT t.name
               FROM tag t
               JOIN journal_entry_tag et ON et.tag_id = t.id
              ORDER BY t.name`
        );

        entries.forEach((entry) => {
            entry.tagList = entry.tag_names ? entry.tag_names.split(',') : [];
            entry.excerpt = excerpt(entry.body);
        });

        res.render('journal', {
            entries,
            tags: tagRows.map((r) => r.name),
            page: currentPage,
            totalPages,
            q,
            activeTags,
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { status: 500, message: 'Failed to load journal.' });
    }
});

app.get('/journal/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
        return res.status(404).render('error', { status: 404, message: 'Entry not found.' });
    }

    try {
        const [rows] = await dbPromise.query(
            `SELECT e.id, e.title, e.body,
                    DATE_FORMAT(e.created_at, '%Y/%m/%d') AS day,
                    (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',')
                       FROM journal_entry_tag et
                       JOIN tag t ON t.id = et.tag_id
                      WHERE et.entry_id = e.id) AS tag_names
               FROM journal_entry e
              WHERE e.id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).render('error', { status: 404, message: 'Entry not found.' });
        }

        const entry = rows[0];
        entry.tagList = entry.tag_names ? entry.tag_names.split(',') : [];
        res.render('journal-view', { entry });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { status: 500, message: 'Failed to load entry.' });
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
