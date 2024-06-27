const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const db_config = require('../db-config.json');

const moment = require('moment-timezone');

const pool = mysql.createPool({
  connectionLimit: 50,
  host: db_config.host,
  user: db_config.user,
  password: db_config.password,
  database: db_config.database,
});

router.post('/all-room', async (req, res) => {
  const { user_id } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const query =
        'SELECT room_id FROM diary_join_table WHERE user_id = ?';
      const [results] = await conn.query(query, [user_id]);

      if (results.length > 0) {
        const room_ids = results.map(result => result.room_id);
        res.json({ room_ids });
      } else {
        res.status(404).json({ error: 'Room not found' });
      }
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/chat1', async (req, res) => {
  const { user_id } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const query =
        'SELECT room_id FROM diary_join_table WHERE user_id = ? AND room_type = 1';
      const [results] = await conn.query(query, [user_id]);

      if (results.length > 0) {
        res.json({ room_id: results[0].room_id });
      } else {
        res.status(404).json({ error: 'Room not found' });
      }
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/chat2', async (req, res) => {
  const { grouped } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const query =
        'SELECT room_id FROM diary_chat_room WHERE grouped = ? AND room_type = 2';
      const [results] = await conn.query(query, [grouped]);

      if (results.length > 0) {
        res.json({ room_id: results[0].room_id });
      } else {
        res.status(404).json({ error: 'Room not found' });
      }
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/chat3', async (req, res) => {
  const { user_id } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const query =
        'SELECT * FROM diary_join_table WHERE user_id = ? AND room_type = 3';
      const [results] = await conn.query(query, [user_id]);

      if (results.length > 0) {
        res.json({ room_id: results[0].room_id, grouped: results[0].grouped });
      } else {
        res.status(404).json({ error: 'Room not found' });
      }
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/all-room-admin', async (req, res) => {
  const { user_id } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      const query =
        'SELECT * FROM diary_join_table WHERE user_id = ?';
      const [results] = await conn.query(query, [user_id]);

      if (results.length > 0) {
        res.json({ rooms: results });
      } else {
        res.status(404).json({ error: 'Room not found' });
      }
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
