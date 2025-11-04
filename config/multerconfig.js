const multer = require('multer');
const path = require('path');   
const crypto = require('crypto');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images') // make sure folder exists
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, (err, bytes) => {
        bytes = bytes.toString('hex')+path.extname(file.originalname);
      cb(null, bytes)  
    }
    );
  }
})

const upload = multer({ storage: storage })
module.exports = upload;