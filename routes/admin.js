const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const db_config = require('../db-config.json');
const connection = mysql.createPool({
  connectionLimit: 50,
  host: db_config.host,
  user: db_config.user,
  password: db_config.password,
  database: db_config.database,
});

router.get('/', async (req, res) => {
  const query = `
    SELECT du.*, djt.room_id AS room_id
    FROM diary_user du
    LEFT JOIN diary_join_table djt ON du.user_id = djt.user_id AND djt.room_type = 3
    WHERE du.user_id != "admin";
  `;
  try {
    const [results] = await connection.query(query);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '데이터베이스 에러' });
  }
});

router.delete('/delete_user/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const conn2 = await connection.getConnection();

    try {

      // user_id에 해당하며 room_type이 1 또는 3인 room_id 찾기
      const findRoomIdsQuery = 'SELECT room_id FROM diary_join_table WHERE user_id = ? AND (room_type = 1 OR room_type = 3)';
      const [ro] = await conn2.query(findRoomIdsQuery, [user_id]);

      if (ro.length > 0) {
        const roomIds = ro.map(row => row.room_id);
        console.log(`Found room_ids: ${roomIds} for user_id: ${user_id}`);

        // 해당 room_id에 해당하는 모든 행을 diary_chat_room에서 삭제
        const deleteRoomQuery = 'DELETE FROM diary_chat_room WHERE room_id IN (?)';
        await conn2.query(deleteRoomQuery, [roomIds]);
        console.log(`Deleted rooms from diary_chat_room with room_ids: ${roomIds}`);
      } else {
        console.log(`No rooms found for user_id: ${user_id} with room_type 1 or 3`);
      }

      const deleteQuery = 'DELETE FROM diary_user WHERE user_id = ?';
      await conn2.query(deleteQuery, [user_id]);


      // user_id에 해당하며 room_type이 3인 room_id 찾기
      const findRoomIdQuery = 'SELECT room_id FROM diary_join_table WHERE user_id = ? AND room_type = 3';
      const [rows] = await conn2.query(findRoomIdQuery, [user_id]);

      if (rows.length > 0) {
        const roomIds = rows.map(row => row.room_id);

        // 해당 room_id에 해당하는 모든 행을 삭제
        const deleteJoinAdminQuery = 'DELETE FROM diary_join_table WHERE room_id IN (?)';
        await conn2.query(deleteJoinAdminQuery, [roomIds]);
      }

      const deleteJoinQuery = 'DELETE FROM diary_join_table WHERE user_id = ?';
      await conn2.query(deleteJoinQuery, [user_id]);


      const deletemessageQuery = 'DELETE FROM diary_messages WHERE user_id = ?';
      await conn2.query(deletemessageQuery, [user_id]);


      const deleteCalQuery = 'DELETE FROM calendar WHERE user_id IN (?)';
      await conn2.query(deleteCalQuery, [user_id]);

      res.json({ message: '삭제 성공' });
    } finally {
      conn2.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '데이터베이스 에러' });
  }
});

router.post('/save_user', async (req, res) => {
  const { user_id, name, grouped } = req.body;

  try {
    const conn = await connection.getConnection();

    //0. diary_user에 사용자 추가
    const query =
      'INSERT INTO diary_user (user_id, name, grouped) VALUES (?, ?, ?)';
    await conn.query(query, [user_id, name, grouped]);

    //1. 첫번째 채팅방 개설
    const selfRoomQuery =
      'INSERT INTO diary_chat_room (room_type, grouped) VALUES (1, ?)';
    const [selfRoomResult] = await conn.query(selfRoomQuery, [grouped]);
    const selfRoomId = selfRoomResult.insertId;

    const selfJoinQuery =
      'INSERT INTO diary_join_table (room_id, user_id, room_type, lastseen, last_message, unread, last_message_time, grouped) VALUES (?, ?, ?, NOW(), ?, ?, NOW(), ?)';
    await conn.query(selfJoinQuery, [selfRoomId, user_id, 1, '', 0, 'self']);

    //2. 두번째 채팅방 개설
    const confirmation =
      'SELECT room_id FROM diary_chat_room WHERE grouped = ? AND room_type = 2';
    const [cresults] = await conn.query(confirmation, [grouped]);

    let roomId;
    if (cresults.length == 0) {
      const makeRoom =
        'INSERT INTO diary_chat_room (room_type, grouped) VALUES (2, ?)';
      const [mresults] = await conn.query(makeRoom, [grouped]);
      roomId = mresults.insertId;
    } else {
      roomId = cresults[0].room_id;
    }

    const insertJoin =
      'INSERT INTO diary_join_table (room_id, user_id, room_type, lastseen, last_message, unread, last_message_time, grouped) VALUES (?, ?, ?, NOW(), ?, ?, NOW(), ?)';
    await conn.query(insertJoin, [roomId, user_id, 2, '', 0, grouped]);

    //3. 세번째 채팅 개설
    const adminRoomQuery =
      'INSERT INTO diary_chat_room (room_type, grouped) VALUES (3, ?)';
    const [adminRoomResult] = await conn.query(adminRoomQuery, [grouped]);
    const adminRoomId = adminRoomResult.insertId;

    const adminJoinQuery =
      'INSERT INTO diary_join_table (room_id, user_id, room_type, lastseen, last_message, unread, last_message_time, grouped) VALUES (?, ?, ?, NOW(), ?, ?, NOW(), ?)';
    await conn.query(adminJoinQuery, [adminRoomId, user_id, 3, '', 0, grouped]);
    await conn.query(adminJoinQuery, [adminRoomId, 'admin', 3, '', 0, 'admin']);

    res.json({ message: '추가 성공' });

    conn.release();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '데이터베이스 에러' });
  }
});

router.get('/logout', (req, res) => {
  // 세션 파괴
  res.status(200).json({ message: '로그아웃 성공' });
});

module.exports = router;
