'use strict';

var express = require('express'),
    app = express(),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser');


app.use(express.static('public'));
app.set('view engine','jade');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


/*************** DATABASE ************/
mongoose.connect('mongodb://api:Applemac1@ds019480.mlab.com:19480/todooffline');
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

  var Todo = mongoose.model('Todo',TodoSchema);


  /*************** API ************/

  app.get('/api/todos',function(req,res){
    Todo.find(function(err,todos){
      res.json(todos);
    });
  });

  app.post('/api/todos/put',function(req,res){

    // Create a new todo and save.
    var tmpTodo = new Todo({title:req.body.title,description:"",complete:false});
    tmpTodo.save();

    // Send back all todos for re rendering
    Todo.find(function(err,todos){
      res.json(todos);
    });
  });

  app.post('/api/todos/complete',function(req,res){
    Todo.findOneAndUpdate({_id: req.body.id},{complete:req.body.complete},function(err,doc){

    });
  });


  /*************** BASE URL ************/
  app.get('/',function(req,res){
    // Send the base file on request
    res.sendFile(__dirname+'/public/home.html');
  });


});

/*************** STATIC FILES FOR SERVICE WORKER ************/

app.get('/public/_js/app.js',function(req,res){
  res.sendFile(__dirname+'/public/_js/app.js');
});

app.get('sw.js',function(req,res){
  res.sendFile(__dirname+'sw.js');
});


app.listen(8080);
