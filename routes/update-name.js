const express = require('express');
const router = express.Router();
const mysql = require('mysql');

// DB 연결
const db_config = require('../db-config.json');
const connection = mysql.createPool({
  connectionLimit: 50,
  host: db_config.host,
  user: db_config.user,
  password: db_config.password,
  database: db_config.database,
});

connection.on('connection', function (c) {
  console.log('Diary_User DB Connection success');
  c.on('error', function (err) {
    console.error(new Date(), 'MySQL error', err.code);
  });
  c.on('close', function (err) {
    console.error(new Date(), 'MySQL close', err);
  });
});

router.post('/', (req, res) => {
  const { id, name } = req.body;
  const query = 'UPDATE diary_user SET name = ? WHERE user_id = ?';
  connection.query(query, [name, id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
});

module.exports = router;
