const express = require('express'); //express 모듈을 가져옴
const cors = require('cors'); //cors(Cross-Origin Resource Sharing) 모듈을 가져옴. 다른 도메인에서 서버의 리소스에 접근할 수 있도록 하는 방법
const { Pool } = require('pg'); //pg 모듈에서 Pool 클래스를 가져옴. PostgreSQL DB를 Node.js Application과 연결해주는 라이브러리
require('dotenv').config(); //dotenv 패키지가 .env 파일에 정의된 환경 변수를 로드하도록 함.

console.log(process.env.DATABASE_URL);

const app = express(); //express application 초기화. app 객체는 HTTP 요청 처리에 사용.
app.use(cors()); //cors 미들웨어 추가
app.use(express.json()); //JSON형식의 요청 본문을 자동으로 파싱하여 req.body에 넣어줌.

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, //DB와 연결
    ssl: false, //ssl 사용x
});

// 방명록 목록 가져오기 API
app.get('/api/guestbook', async (req, res) => {
    try {
        //guest book Id를 기준으로 likes, guestbook 테이블을 join한다. (g.*)
        const result = await pool.query(`
        SELECT g.id, g.name, g.message, g.password, g.created_at, COALESCE(l.likecount, 0) as likecount
        FROM public.guestbook g
        JOIN (
            SELECT guestbook_id, COUNT(*) as likecount
            FROM likes l
            GROUP BY guestbook_id
        ) l ON g.id = l.guestbook_id
        ORDER BY g.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('방명록 목록 가져오기 중 오류:', err.message);
        res.status(500).json({ error: err.message });
    }
});

//방명록 항목 추가
app.post('/api/guestbook', async (req, res) => {
    const { name, message, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO guestbook (name, message, password) VALUES ($1, $2, $3) RETURNING *',
            [name, message, password]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//방명록 항목 수정
app.put('/api/guestbook/:id', async (req, res) => {
    const { id } = req.params;
    const { message, password } = req.body;
    try {
        //Q. guestbook 테이블에서 id로 특정 항목의 비밀번호를 가져오세요.
        const result = await pool.query('SELECT password FROM guestbook WHERE id = $1', [id]);
        if (result.rows.length > 0 && result.rows[0].password === password) {
            //Q. guestbook 테이블에서 id로 특정 항목의 message를 업데이트하세요.
            const updateResult = await pool.query(
                'UPDATE guestbook SET message = $1 WHERE id = $2 RETURNING id, name, message, created_at',
                [message, id]
            );
            res.json(updateResult.rows[0]);
        } else {
            res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//방명록 항목 삭제
app.delete('/api/guestbook/:id', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    try {
        //Q. guestbook 테이블에서 id로 특정 항목의 비밀번호를 가져오세요.
        const result = await pool.query('SELECT password FROM guestbook WHERE id = $1', [id]);
        if (result.rows.length > 0 && result.rows[0].password === password) {
            //Q. guestbook 테이블에서 id로 특정 항목을 삭제하세요.
            await pool.query('DELETE FROM guestbook WHERE id = $1', [id]);
            res.json({ message: '삭제되었습니다.' });
        } else {
            res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 좋아요 추가 API
app.post('/api/guestbook/:id/like', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    // console.log(req.body);
    if (!userId) {
        return res.status(400).json({ error: 'userId가 필요합니다.' });
    }
    try {
        console.log(id);
        const existingLike = await pool.query('SELECT * FROM likes WHERE guestbook_id = $1 AND user_id = $2', [
            id,
            userId,
        ]);
        console.log(existingLike);
        if (existingLike.rows.length > 0) {
            return res.status(400).json({ error: '이미 좋아요를 눌렀습니다.' });
        }
        const result = await pool.query('INSERT INTO likes (guestbook_id, user_id) VALUES ($1, $2) RETURNING *', [
            id,
            userId,
        ]);
        console.log(result);
        // 좋아요 수를 계산해서 반환
        const likeCountResult = await pool.query('SELECT COUNT(*) AS like_count FROM likes WHERE guestbook_id = $1', [
            id,
        ]);

        res.json({
            message: '좋아요가 추가되었습니다.',
            like_count: likeCountResult.rows[0].like_count, // 업데이트된 좋아요 수 반환
        });
    } catch (err) {
        console.error('좋아요 추가 중 오류:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 좋아요 수 조회 API
app.get('/api/guestbook/:id/likes', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT COUNT(*) AS likecount FROM likes WHERE guestbook_id = $1', [id]);
        res.json({ likecount: result.rows[0].likecount });
    } catch (err) {
        console.error('좋아요 수 조회 중 오류:', err.message);
        res.status(500).json({ error: err.message });
    }
});

//검색 API
app.get('/api/guestbook/search', async (req, res) => {
    const { query } = req.query; // keyword
    try {
        const result = await pool.query('SELECT * FROM guestbook WHERE message ILIKE $1 ORDER BY id DESC', [
            `%${query}%`,
        ]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//서버 실행
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
