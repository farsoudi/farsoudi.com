const express = require('express');
const fs = require('fs');
const mysql = require('mysql2');
const path = require('path');
const axios = require('axios');
const chokidar = require('chokidar');
const matter = require('gray-matter');

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

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});


// Journal watcher
const watcher = chokidar.watch('/journal', {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

const syncFile = async (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(content);
        const filename = path.basename(filePath);

        // I need a date provided for each file as it will act as the mandatory created_at column
        // If there is no valid date passed, then this file doesn't get processed.
        if (!(data.date && Object.prototype.toString.call(data.date) === '[object Date]')) return;


        const title = data.title || filename;
        const date = data.date;
        const isbn = data.isbn || null;

        let isbn_image = null;
        let isbn_link = null;
        let isbn_name = null;

        try {
            if (isbn) {
                const googleRes = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
                const book = googleRes.data.items?.[0]?.volumeInfo;
                if (book) {
                    isbn_image = book.imageLinks?.thumbnail || null;
                    isbn_link = book.infoLink || null;
                    isbn_name = book.title || null;
                }
            }
        } catch (error) {
            console.log(error);
        }

        await dbPromise.execute(`
        INSERT INTO journal_entry (name, path, isbn, isbn_image, isbn_name, isbn_link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        isbn = VALUES(isbn),
        isbn_image = VALUES(isbn_image),
        isbn_link = VALUES(isbn_link),
        isbn_name = VALUES(isbn_name),
        created_at = VALUES(created_at)`, [title, filePath, isbn, isbn_image, isbn_name, isbn_link, date]);

        console.log(`[SYNCED] ${filename} (${title})`);
    } catch (error) {
        console.log(error);
    }
}

const deleteFile = async (filePath) => {
    try {
        const filename = path.basename(filePath);
        await dbPromise.execute(`DELETE FROM journal_entry WHERE path = ?`, [filePath]);
        console.log(`[DELETED] ${filename}`);
    } catch (error) {
        console.log(error);
    }
}


watcher
    .on('add', syncFile)
    .on('change', syncFile)
    .on('unlink', deleteFile)

