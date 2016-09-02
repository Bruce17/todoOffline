'use strict';

/*** Express dependencies ***/
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

/*** DB dependencies ***/
const mongoose = require('mongoose');

/*** Other dependencies ***/
const path = require('path');


app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());


const host = process.env.HOST || process.env.IP || 'localhost';
const port = process.env.PORT || 8080;


/*************** DATABASE ************/
//TODO: read from config
mongoose.connect(`mongodb://${host}:27017/todooffline`);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

  /*************** SCHEMA ************/

  var TodoSchema = mongoose.Schema({
    title: String,
    description: String,
    complete: Boolean
  });

  /*************** MODELS ************/

  var Todo = mongoose.model('Todo', TodoSchema);


  /*************** API ************/

  /**
   * 
   * @param {object} res
   */
  function returnAllListItems(res) {
    Todo.find(function(err, todos) {
      res.json(todos);
    });
  }

  app.get('/api/todos', function(req, res) {
    returnAllListItems(res);
  });

  app.post('/api/todos/put', function(req, res) {
    // Create a new todo and save.
    var tmpTodo = new Todo({
      title: req.body.title,
      description: req.body.description || '',
      complete: false
    });

    tmpTodo.save(function (err) {
      // Send back all todos for re rendering
      returnAllListItems(res);
    });
  });

  app.post('/api/todos/complete', function(req, res) {
    Todo.findOneAndUpdate({_id: req.body.id}, {complete: req.body.complete}, function(err, doc) {
      //res.json(req.body);
      
      // Send back all todos for re rendering
      returnAllListItems(res);
    });
  });
  
  app.post('/api/todos/delete', function(req, res) {
    Todo.remove({_id: req.body.id}, function (err) {
      // Send back all todos for re rendering
      returnAllListItems(res);
    });
  });


  /*************** BASE URL ************/
  app.get('/', function(req, res) {
    // Send the base file on request
    res.sendFile(path.resolve('public/home.html'));
  });
});


// Start webservice
app.listen(port, host, function() {
  console.log(`Server is listening on ${host}:${port}`);
});
