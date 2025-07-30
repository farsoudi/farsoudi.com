const express = require('express');
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
const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

connection.connect(err => {
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
