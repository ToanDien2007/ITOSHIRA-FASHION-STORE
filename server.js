const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve trang chủ từ /public/html/home.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'home.html'));
});

// 1. Cấu hình kết nối MySQL (Đã thêm Port 3307)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Toandien07', 
    database: 'itoshira_shop',
    port: 3307 // <--- Thêm dòng này vào đây
});

// Kiểm tra kết nối
db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL (Kiểm tra lại Port 3307 và Pass): ', err.message);
        return;
    }
    console.log('--- Đã kết nối MySQL thành công trên Port 3307 ---');
});

// 2. API Lấy danh sách sản phẩm (Bộ Lọc)
app.get('/api/products', (req, res) => {
    const { gender, cat, min, max } = req.query;
    let sql = "SELECT * FROM products WHERE 1=1";
    let params = [];

    if (gender) { sql += " AND gender = ?"; params.push(gender); }
    if (cat) { sql += " AND category_id = ?"; params.push(cat); }
    if (min && max) { sql += " AND price BETWEEN ? AND ?"; params.push(min, max); }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2.0 API Lấy chi tiết 1 sản phẩm
app.get('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid product id' });

    db.query("SELECT * FROM products WHERE id = ? LIMIT 1", [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (!results || results.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(results[0]);
    });
});

// 3. API Đăng ký tài khoản
app.post('/api/register', (req, res) => {
    const { username, password, email, full_name, auth_provider, provider_id } = req.body;
    const sql = `INSERT INTO users (username, password, email, full_name, auth_provider, provider_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [username, password, email, full_name, auth_provider || 'local', provider_id || null], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi: Username hoặc Email đã tồn tại!" });
        res.json({ message: "Đăng ký thành công!", userId: result.insertId });
    });
});

// 4. API Đăng nhập
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) {
            res.json({ message: "Đăng nhập thành công", user: results[0] });
        } else {
            res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server Node.js đang chạy tại: http://localhost:${PORT}`);
});