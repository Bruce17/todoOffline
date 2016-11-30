/* eslint-env es6, node */
/* eslint strict: ["error", "global"] */

'use strict';

/*** Express dependencies ***/
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const basicAuth = require('basic-auth-connect');

/*** DB dependencies ***/
const mongoose = require('mongoose');

/*** Other dependencies ***/
const path = require('path');

/*** Read environment variables ***/
const isCloud9 = (!!process.env.IP);

const host = process.env.HOST || process.env.IP || 'localhost';
const port = process.env.PORT || 8080;

const hasBasicAuth = (process.env.BASIC_AUTH === 'true');
const basicAuthUsername = process.env.BASIC_AUTH_USER;
const basicAuthPassword = process.env.BASIC_AUTH_PASS;

const mongodbUrl = process.env.MONGODB_URI || `mongodb://${host}:27017/todooffline`;


// Enable basic auth protection.
if (hasBasicAuth) {
  app.use(basicAuth(basicAuthUsername, basicAuthPassword));
}

app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());


/*************** DATABASE ************/
//TODO: read from config
mongoose.connect(mongodbUrl);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  /*************** SCHEMA ************/

  // eslint-disable-next-line new-cap
  var TodoSchema = mongoose.Schema({
    title: String,
    description: String,
    complete: Boolean
  });

  /*************** MODELS ************/

  var Todo = mongoose.model('Todo', TodoSchema);


  /*************** API ************/

  app.get('/api/todos', function(req, res) {
    Todo.find(function(err, todos) {
      res.json(todos);
    });
  });

  app.post('/api/todos/put', function(req, res) {
    // Create a new todo and save.
    var tmpTodo = new Todo({
      title: req.body.title,
      description: req.body.description || '',
      complete: false
    });

    tmpTodo.save(function (err) {
      res.json(err);
    });
  });

  app.post('/api/todos/complete', function(req, res) {
    Todo.findOneAndUpdate({_id: req.body.id}, {complete: req.body.complete}, function(err, doc) {
      //res.json(req.body);
      res.json(err);
    });
  });

  app.post('/api/todos/delete', function(req, res) {
    Todo.remove({_id: req.body.id}, function (err) {
      res.json(err);
    });
  });


  /*************** BASE URL ************/
  app.get('/', function(req, res) {
    // Send the base file on request
    res.sendFile(path.resolve('public/home.html'));
  });
});


// Start webservice
if (isCloud9) {
  app.listen(port, host, function() {
    console.log(`Server is listening on "${host}:${port}"`);
  });
}
else {
  app.listen(port, function() {
    console.log(`Server is listening on port "${port}"`);
  });
}
