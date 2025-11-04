const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/mongopractice')
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err));

const userSchema = new mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    password: String,
    email: String,
    profilepic : {
        type: String,
        default: 'default.png' // Default profile picture
    },
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'post'
        }
    ]
});

module.exports = mongoose.model("user", userSchema);
