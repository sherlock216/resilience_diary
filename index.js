const express = require('express');
const session = require('express-session');
const moment = require('moment-timezone');
const mysql = require('mysql');
const path = require('path');
const schedule = require('node-schedule');
const app = express();
const port = 8002;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = require('http').createServer(app);
const io = require('socket.io')(server);

// DB 연결
const db_config = require('./db-config.json');

const connection = mysql.createPool({
  connectionLimit: 50,
  host: db_config.host,
  user: db_config.user,
  password: db_config.password,
  database: db_config.database,
});

function handleDisconnect(conn) {
  conn.on('error', function (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection lost. Reconnecting...');
      connection.getConnection((err, newConnection) => {
        if (err) {
          console.error('Error reconnecting to the database:', err);
          setTimeout(() => handleDisconnect(newConnection), 2000);
        } else {
          console.log('Reconnected to the database.');
          handleDisconnect(newConnection);
        }
      });
    } else {
      throw err;
    }
  });
}


// 초기 연결 및 핸들러 설정
connection.getConnection((err, conn) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    setTimeout(() => handleDisconnect(conn), 2000);
  } else {
    console.log('DB Connection success');
    handleDisconnect(conn);
  }
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(
  session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true },
  })
);

app.post('/login', (req, res) => {
  const { username } = req.body;
  console.log('Login attempt for:', username);

  const query = 'SELECT * FROM diary_user WHERE user_id = ?';
  connection.query(query, [username], (error, results) => {
    if (error) {
      console.error('DB 오류:', error);
      res.status(500).send('Database error');
      return;
    }
    if (results.length > 0) {
      req.session.username = username; // 세션 설정
      req.session.name = results[0].name;
      console.log('세션 설정 완료:', req.session);
      res.json({
        success: true,
        user_id: results[0].user_id,
        name: results[0].name,
        grouped: results[0].grouped,
        diary_time: results[0].diary_time,
      });
    } else {
      res.status(401).json({ success: false, message: 'Login failed' });
    }
  });
});

app.post('/logout', (req, res) => {
  const { username } = req.body;
  const query = 'UPDATE diary_user SET token = NULL WHERE user_id = ?';
  connection.query(query, [username], (error) => {
    if (error) {
      console.error('DB 오류:', error);
      res.status(500).send('Database error');
    } else {
      console.log('Token 제거완료: ', username);
      res.status(200).send('Logout');
    }
  });
});

const saveMessageToDB = (user_id, room_id, message, last_message_time, grouped, machine, room_type, sender_id, callback) => {
  const query = 'INSERT INTO diary_messages (room_id, user_id, message, timestamp, grouped, machine) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(query, [room_id, user_id, message, last_message_time, grouped, machine], (err, conn) => {
    if (err) {
      console.error('Message saving failed:', err);
      return callback(err);
    }

    const updateQuery = 'UPDATE diary_join_table SET last_message = ?, last_message_time = ? WHERE room_id = ? AND room_type = ?';
    connection.query(updateQuery, [message, last_message_time, room_id, room_type], (updateError, updateResults) => {
      if (updateError) {
        console.error('DB update failed:', updateError);
        return callback(updateError);
      }

      let updateUnread;
      let updateUnreadParams;

      if (room_type !== 1) {
        // Only update lastseen if room_type is not 1
        const update_unread_for_senders = 'UPDATE diary_join_table SET lastseen = ? WHERE room_id = ? AND user_id = ? AND room_type = ?';
        connection.query(update_unread_for_senders, [last_message_time, room_id, user_id, room_type], (aError, aResults) => {
          if (aError) {
            console.error('DB update failed:', aError);
            return callback(aError);
          }
          // Proceed to update unread counts
          updateUnread = 'UPDATE diary_join_table SET unread = unread + 1 WHERE room_id = ? AND user_id != ? AND lastseen < ? AND room_type = ?';
          updateUnreadParams = [room_id, user_id, last_message_time, room_type];

          connection.query(updateUnread, updateUnreadParams, (upreadError, upreadResults) => {
            if (upreadError) {
              console.error('DB update failed:', upreadError);
              return callback(upreadError);
            }

            io.to(room_id).emit('new_message', { user_id, message, room_id, last_message_time });
            io.emit('last_message', { room_id, message, last_message_time, room_type, sender_id });

            callback(null);
          });
        });
      } else {
        // For room_type 1, only update unread for the sender
        updateUnread = 'UPDATE diary_join_table SET unread = unread + 1 WHERE room_id = ? AND user_id = ? AND lastseen < ? AND room_type = ?';
        updateUnreadParams = [room_id, user_id, last_message_time, room_type];

        connection.query(updateUnread, updateUnreadParams, (upreadError, upreadResults) => {
          if (upreadError) {
            console.error('DB update failed:', upreadError);
            return callback(upreadError);
          }

          io.to(room_id).emit('new_message', { user_id, message, room_id, last_message_time });
          io.emit('last_message', { room_id, message, last_message_time, room_type, sender_id });

          callback(null);
        });
      }
    });
  });
};


app.post('/save-message', (req, res) => {
  const { user_id, message, room_id, last_message_time, grouped, room_type, machine } =
    req.body;
  console.log(req.body);

  saveMessageToDB(user_id, room_id, message, last_message_time, grouped, machine, room_type, user_id, (err) => {
    if (err) {
      res.status(500).send('Database error');
    } else {
      res.status(200).send('Message saved');
    }
  });
});



app.use('/update-name', require('./routes/update-name'));
app.use('/calendar', require('./routes/calendar'));
app.use('/admin', require('./routes/admin'));
app.use('/room-id', require('./routes/room-id'));
app.use('/load-message', require('./routes/load-message'));
app.use(express.static(path.join(__dirname, 'public')));


app.post('/update-time', (req, res) => {
  const { id, diary_time } = req.body;
  console.log(req.body);
  const revised_time = diary_time + ':00';
  console.log(revised_time);
  const query = 'UPDATE diary_user SET diary_time = ? WHERE user_id = ?';
  connection.query(query, [revised_time, id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false });
    }
    setTimer();
    res.json({ success: true });
  });
});

// chat1 그냥 가져옴
const setTimer = () => {
  connection.query(`SELECT diary_user.*, diary_join_table.room_id FROM diary_user 
                JOIN diary_join_table ON diary_user.user_id = diary_join_table.user_id 
                WHERE diary_join_table.room_type = 1 AND diary_user.user_id != 'admin'`
    , (error, results, fields) => {
      if (error) {
        console.error('Error:', error);
        return;
      }

      const scheduledJobs = new Set(); // 스케쥴 작업 집합

      results.forEach((row) => {
        const userTime = moment.tz(row.diary_time, 'HH:mm:ss', 'Asia/Seoul');
        let rule = new schedule.RecurrenceRule();
        rule.tz = 'Asia/Seoul';
        rule.hour = userTime.hour();
        rule.minute = userTime.minute();

        const jobKey = `${row.user_id}`;
        if (scheduledJobs.has(jobKey)) {
          const existingJob = schedule.scheduledJobs[jobKey];
          if (existingJob) {
            existingJob.cancel();
            console.log('Cancelled existing job for user:', row.user_id);
          }
        }


        console.log('Scheduling job for user:', row.user_id, 'at', userTime.format('HH:mm')); // 스케줄링 작업 디버깅

        schedule.scheduleJob(rule, () => {
          console.log('Job triggered for user:', row.user_id);
          const message = {
            sender: 'bot',
            text: '안녕하세요! 오늘 하루 어떻게 보내셨나요?',
            time: new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString(),
            options: [
              '너무 힘든 하루를 보냈어요.',
              '기분이 썩 좋지 않아요.',
              '그럭저럭 평범한 하루를 보냈어요.',
              '오늘 하루 기분 좋게 지냈어요.',
            ],
            stage: 1,
          };
          saveMessageToDB(row.user_id, row.room_id, JSON.stringify(message), message.time, 'self', 1, 1, 'bot', (err) => {
            if (err) {
              console.error('Error saving scheduled message:', err);
            } else {
              console.log('Scheduled message saved for user:', row.user_id);
            }
          });

          io.emit('schedule-message', {
            user_id: row.user_id,
            room_id: row.room_id,
            message: message.text,
            time: message.time,
            options: message.options,
            stage: message.stage,
            sender: message.sender,
          });
        });
        scheduledJobs.add(jobKey);
      });
    });
}


io.on('connection', (socket) => {
  console.log('A user connected in chat1');

  socket.on('join_room', ({ room_id }) => {
    if (room_id) {
      socket.join(room_id);
      console.log(`User joined room: ${room_id}`);
    } else {
      console.log('Room ID is undefined');
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('registerToken', (data) => {
    const { user_id, token } = data;
    const query = `UPDATE diary_user SET token = ? WHERE user_id = ?`;
    connection.query(query, [token, user_id], (error) => {
      if (error) {
        console.error('Error updating token:', err);
      }
      else {
        console.log('Token updated for user:', user_id);
      }
    });
    console.log('Received token for user:', data.user_id, 'Token:', data.token);
  })


  // 사용자 연결 시 초기 메시지 전송
  socket.on('first-send-message', (message) => {
    console.log(message);
    let response;
    if (message.stage == 1) {
      if (message.text === '너무 힘든 하루를 보냈어요.') {
        response = '너무 힘들어하지 말아요. 함께 마음을 다스려봐요.';
      } else if (message.text === '기분이 썩 좋지 않아요.') {
        response = '기분이 썩 좋지 않아요?';
      } else if (message.text === '그럭저럭 평범한 하루를 보냈어요.') {
        response = '그럭저럭 평범한 하루를 보냈군요?';
      } else if (message.text === '오늘 하루 기분 좋게 지냈어요.') {
        response = '오늘 하루 기분 좋게 지냈어요?';
      }


      socket.emit('response-save', {
        sender: 'bot',
        text: response + '<br>몸이 힘들거나 마음이 무거우면 다음 내용 중 하나를 선택 해 주세요.',
        options: ['호흡법', '음악', '요가', '영상'],
        time: message.time,
        stage: 2,
      });
    }

    if (message.stage == 2) {
      socket.emit('response-save', {
        sender: 'bot',
        text: '소중하고 가치있는 당신에게 오늘 하루 알차게 보내느라 고생 많으셨습니다. 당신이 경험한 하루의 일들이 경험이자 무기가 될 지도 모릅니다.<br><br>오늘 있었던 일 중 좋았던 일 세 가지를 선택해주세요.',
        options: [
          '보호자분들이 기뻐하는 모습을 보았습니다.',
          '같이 일하시는 분들이 친절하게 행동 해 주었습니다.',
          '좋아하는 식사가 나왔습니다.',
          '날씨가 너무 좋아서 주변에 생기가 돌았습니다.',
          '길에서 우연치 않게 친절을 베푸는 사람을 보았습니다.',
          '오랜만에 친한 지인으로 부터 연락이 왔습니다.',
        ],
        time: message.time,
        stage: 3,
      });
    }

    if (message.stage == 3) {
      socket.emit('response-save', {
        sender: 'bot',
        text: `<a href="https://www.youtube.com/watch?v=2N4eTTipm9I" target="_blank">https://www.youtube.com/watch?v=2N4eTTipm9I
          <img src="https://img.youtube.com/vi/2N4eTTipm9I/0.jpg" alt="YouTube Video">
        </a>`,
        time: message.time,
      });
    }
  });

  socket.on('updatestamp', async (data) => {
    console.log('updatestamp received:', data);

    const { user_id, room_id, lastseen } = data;
    try {
      const query = `UPDATE diary_join_table SET lastseen = ? WHERE user_id = ? AND room_id = ?`;
      const values = [lastseen, user_id, room_id];
      console.log('Executing query:', query, values);
      connection.query(query, values, (err, result) => {
        if (err) {
          console.error('Database update failed:', err);
        } else {
          console.log('lastseen update result:', result);
        }
      });
    } catch (err) {
      console.error('데이터베이스 오류:', err);
    }
  });

  socket.on('updatestamp_back', async (data) => {
    console.log('updatestamp_back received:', data);

    const { user_id, room_id, lastseen } = data;
    try {
      const query = `UPDATE diary_join_table SET lastseen = ?, unread = 0 WHERE user_id = ? AND room_id = ?`;
      const values = [lastseen, user_id, room_id];
      console.log('Executing query:', query, values);
      connection.query(query, values, (err, result) => {
        if (err) {
          console.error('Database update failed:', err);
        } else {
          console.log('lastseen update result:', result);
        }
      });
    } catch (err) {
      console.error('데이터베이스 오류:', err);
    }
  });



  socket.on('request_unread', async (data) => {
    const { user_id, room_id, room_type, sender_id } = data;
    const query = `SELECT unread FROM diary_join_table WHERE user_id = ? AND room_id = ?`;

    connection.query(query, [user_id, room_id], (error, results, fields) => {
      if (error) {
        console.error('Error:', error);
        return;
      }
      if (results.length > 0) {
        const unread = results[0].unread;
        socket.emit('update_unread', { room_id, unread, room_type });

        if (user_id !== sender_id) {
          const tokenQuery = `SELECT token FROM diary_user WHERE user_id = ?`;
          connection.query(tokenQuery, [user_id], (err, tokenResults) => {
            if (err) {
              console.error('Error token:', err);
              return;
            }
            if (tokenResults.length > 0) {
              const token = tokenResults[0].token;
              sendPushNotification(token, '새 메시지 알림', `읽지 않은 메시지가 ${unread}개 있습니다.`);
            }
          });
        }
      } else {
        socket.emit('update_unread', { room_id, unread: 0, room_type });
      }
    })
  })
});


//get info
app.post('/get-chat-info', (req, res) => {
  const { user_id } = req.body;
  const query = 'SELECT * FROM diary_join_table WHERE user_id = ?';
  connection.query(query, [user_id], (err, results) => {
    if (err) {
      console.error('DB 조회 실패:', err);
      return res.status(500).json({ error: 'DB 조회 실패' });
    }
    res.status(200).json(results);
  });
});

app.post('/get-chat-info-admin', (req, res) => {
  const { user_id } = req.body;
  const query = `
    SELECT unread, room_id,  lastseen, last_message_time
    FROM diary_join_table 
    WHERE user_id = ?;
`;
  connection.query(query, [user_id], (err, results) => {
    if (err) {
      console.error('DB 조회 실패:', err);
      return res.status(500).json({ error: 'DB 조회 실패' });
    }
    res.status(200).json(results);
  });
});
















//csv
app.get('/download-messages', (req, res) => {
  const query = 'SELECT * FROM diary_messages';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('DB 쿼리 실행 실패:', error);
      return res.status(500).send('Database error');
    }

    // CSV 형식으로 데이터 변환
    let csvContent = 'message_id,room_id,user_id,message,timestamp,grouped,machine\r\n';

    // 데이터 각 행 처리
    function removeHtmlTags(str) {
      return str.replace(/<[^>]*>/g, '');
    }

    results.forEach(row => {
      const room_id = `"${row.room_id}"`;
      const cleanMessage = `"${removeHtmlTags(row.message).replace(/"/g, '""')}"`; // HTML 태그를 제거하고, 큰따옴표를 이스케이프 처리합니다.
      const grouped = row.grouped ? `"${row.grouped}"` : '';

      csvContent += `${row.message_id},${room_id},${row.user_id},${cleanMessage},${row.timestamp},${grouped},${row.machine}\r\n`;
    });

    // CSV 파일로 보내기
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=messages.csv');
    return res.send(csvContent);
  });
});
















// firebase-messaging-sw.js 및 manifest.json 파일 제공
app.get('/firebase-messaging-sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'firebase-messaging-sw.js'));
});

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.use('/images', express.static(path.join(__dirname, 'images')));

///
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 푸시 알림을 보내는 함수
function sendPushNotification(deviceToken, title, body) {
  // 토큰 유효성 검사
  if (!deviceToken) {
    console.error('No device token provided');
    return;
  }
  const message = {
    notification: {
      title: title,
      body: body
    },
    token: deviceToken
  };
  console.log('메시지 잘 들어있는지 테스트: ', message);

  admin.messaging().send(message)
    .then((response) => {
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.error('Error sending message:', error);
    });
}