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
const moment = require('moment-timezone');


router.post('/', (req, res) => {
    const { user_id, room_id } = req.body;

    const query = `SELECT dm.*, du.name AS user_name
        FROM diary_messages dm
        JOIN diary_user du ON dm.user_id = du.user_id
        WHERE dm.room_id = ?
        ORDER BY dm.message_id`;

    const updateUnread = 'UPDATE diary_join_table SET unread = 0 WHERE room_id = ? AND user_id = ?';
    // SQL 쿼리 실행
    connection.query(query, [room_id], (error, results) => {
        if (error) {
            console.error('DB 쿼리 실행 실패:', error);
            res.status(500).send('Database error');
            return;
        }
        connection.query(updateUnread, [room_id, user_id], (updateError) => {
            if(updateError) {
                console.error('unread 업데이트 실패:', error);
            }
            res.json(results);
        });
        
    });
});


module.exports = router;