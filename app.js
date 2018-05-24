const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const path = require('path');

// App Init
const app = express();

// MLab Connection
const mongoURI = 'mongodb://yadnesh:hsenday123@ds125680.mlab.com:25680/grid-fs';
const conn = mongoose.createConnection(mongoURI);

// GridFS
let gfs;

conn.once('open',function(){
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
});

var storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
// View Engine Setup
app.set('view engine','ejs');

// Routes

// Landing Page / Homepage
app.get('/',(req,res) => {
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length === 0) {
            res.render('index',{files:false});
        } else {
          files.map(file => {
              if(file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                  file.isImage = true;
              } else {
                  file.isImage = false;
              }
          });
          res.render('index',{files:files});
        }
    });
});

// POST
app.post('/upload',upload.single('file'),(req,res) => {
    res.redirect('/');
});

// Display all files
app.get('/files',(req,res) => {
    gfs.files.find().toArray((err,files) => {
      if( !files || files.length === 0) {
          return res.status(404).json({err:'No file exist'});
      }

      return res.json(files);
    });
});

// For non-image files
app.get('/files/:filename',(req,res) => {
    gfs.files.findOne({filename : req.params.filename},(err,file)=>{
      if(!file || file.length === 0) {
          return res.status(404).json({err:'No file exists'});
      }

      return res.json(file);
    });
});

// For image files
app.get('/image/:filename',(req,res) => {
    gfs.files.findOne({filename : req.params.filename},(err,file)=>{
        if(!file || file.length === 0) {
            return res.status(404).json({err:'No file exist'});
        }

        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                const readstream = gfs.createReadStream(file.filename);
                readstream.pipe(res);
        } else {
            return res.status(404).json({err:'Not an image file'});
        }
    });
});

// Delete a file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/');
  });
});

app.listen(3000,() => console.log('server up at port 3000'));
