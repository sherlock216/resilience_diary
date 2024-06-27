const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db_config = require('../db-config.json');
const connection = mysql.createPool({
  connectionLimit: 50,
  host: db_config.host,
  user: db_config.user,
  password: db_config.password,
  database: db_config.database,
});

connection.on('connection', function (c) {
  console.log('Calendar DB Connection success');

  c.on('error', function (err) {
    console.error(new Date(), 'MySQL error', err.code);
  });
  c.on('close', function (err) {
    console.error(new Date(), 'MySQL close', err);
  });
});

// 특정 사용자의 달력 항목 가져오기
router.get('/:user_id', (req, res) => {
  const user_id = req.params.user_id;
  const query = 'SELECT * FROM calendar WHERE user_id = ?';
  connection.query(query, [user_id], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// 새로운 달력 항목 추가
router.post('/', (req, res) => {
  const { user_id, date, emotion } = req.body;
  const query = 'INSERT INTO calendar (user_id, date, emotion) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE emotion = VALUES(emotion)';
  connection.query(query, [user_id, date, emotion], (err, results) => {
    if (err) throw err;
    res.status(201).json({ id: results.insertId });
  });
});


router.post('/getEmotion', (req, res) => {
  const { user_id, date } = req.body;

  formattedDate = new Date(date).toISOString().split('T')[0];

  const query = 'SELECT emotion FROM calendar WHERE user_id = ? AND date = ?';
  connection.query(query, [user_id, formattedDate], (error, results) => {
    if (error) {
      res.status(500).send('Database query error');
    } else {
      if (results.length > 0) {
        res.json({ emotion: results[0].emotion });
      } else {
        res.status(404).send('Emotion not found');
      }
    }
  });
})




module.exports = router;