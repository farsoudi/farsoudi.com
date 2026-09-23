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

const IMAGE_EXTS = 'jpe?g|png|gif|webp|avif';
const IMAGE_EXT_RE = new RegExp(`\\.(${IMAGE_EXTS})$`, 'i');
const OLD_IMAGE_RE = new RegExp(`\\.old\\.(${IMAGE_EXTS})$`, 'i');

app.get('/', (req, res) => {
    const imgDir = path.join(__dirname, 'public', 'img');
    const images = fs.readdirSync(imgDir)
        .filter((f) => IMAGE_EXT_RE.test(f) && !OLD_IMAGE_RE.test(f))
        .sort(() => 0.5 - Math.random());
    res.render('index', { images });
});

app.get('/journal', (req, res) => {
    res.render('journal', {});
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});

