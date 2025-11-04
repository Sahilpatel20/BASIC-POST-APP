const express = require('express');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const userModel = require('./models/user');
const postModel = require('./models/post');
const multerconfig = require('./config/multerconfig');
const path = require('path');
const app = express();

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); // ✅ Serve static files like images

// ----------------------
// 🏠 Home Route
// ----------------------
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/profile/upload', (req, res) => {
    res.render('upload');
});
app.post("/upload", multerconfig.single("image"), (req, res) => {
    res.send("File uploaded successfully");
});
// ----------------------
// 👤 Profile Route (Protected)
// ----------------------
app.get('/profile', loggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email }).populate('posts');
        res.render('profile', { user });
    } catch (err) {
        console.error('Error loading profile:', err);
        res.status(500).send('Error loading profile');
    }
});

// ----------------------
// ❤️ Like / Unlike Post
// ----------------------
app.get('/like/:id', loggedin, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        const userId = req.user.userid;

        const index = post.likes.indexOf(userId);
        if (index === -1) post.likes.push(userId);
        else post.likes.splice(index, 1);

        await post.save();
        res.redirect('/profile');
    } catch (err) {
        console.error('Error toggling like/unlike:', err);
        res.status(500).send('Error toggling like/unlike');
    }
});

// ----------------------
// ✍️ Create Post
// ----------------------
app.post('/post', loggedin, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const post = await postModel.create({
            user: user._id,
            content: req.body.content,
        });

        user.posts.push(post._id);
        await user.save();

        res.redirect('/profile');
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).send('Error creating post');
    }
});

// ----------------------
// ✏️ Edit Post Routes
// ----------------------
app.get('/edit/:id', loggedin, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) return res.status(404).send('Post not found');

        res.render('edit', { post });
    } catch (err) {
        console.error('Error loading edit page:', err);
        res.status(500).send('Error loading edit page');
    }
});

app.post('/edit/:id', loggedin, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) return res.status(404).send('Post not found');

        if (post.user.toString() !== req.user.userid)
            return res.status(403).send('Unauthorized');

        post.content = req.body.content;
        await post.save();

        res.redirect('/profile');
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).send('Error updating post');
    }
});

// ----------------------
// 🧾 Register
// ----------------------
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    try {
        const { email, password, name, username, age } = req.body;
        if (!email || !password || !name || !username || !age)
            return res.status(400).send('All fields required');

        const existingUser = await userModel.findOne({ email });
        if (existingUser) return res.status(400).send('User already registered');

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        await userModel.create({ username, email, password: hash, age, name });
        res.status(201).send('Registration successful ✅');
    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).send('Server error: ' + error.message);
    }
});

// ----------------------
// 🔐 Login
// ----------------------
app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).send('Email and password required');

        const user = await userModel.findOne({ email });
        if (!user) return res.status(400).send('User not found');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send('Incorrect password ❌');

        const token = jwt.sign({ email: user.email, userid: user._id }, 'secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });

        res.redirect('/profile');
    } catch (err) {
        console.error('Error in login route:', err);
        res.status(500).send('Server error: ' + err.message);
    }
});

// ----------------------
// 🚪 Logout
// ----------------------
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// ----------------------
// 🔒 Middleware (JWT Verify)
// ----------------------
function loggedin(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');

    try {
        const data = jwt.verify(token, 'secret');
        req.user = data;
        next();
    } catch (error) {
        console.error('JWT verification failed:', error);
        res.status(403).send('Invalid or expired token');
    }
}

// ----------------------
// 🚀 Server
// ----------------------
app.listen(4000, () => console.log('✅ Server running at http://localhost:4000'));
