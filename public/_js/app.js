/* window, jQuery */

(function ($, window, undefined) {
  'use strict';

  function updateToDoList(list) {
    $.each(list, function(index, value) {
      var isCompleted = (value.complete === true);
      
      $('#todoList').prepend(
        '<div class="checkbox todo">' +
          '<label class="todoTitle">' +
            '<input type="checkbox" class="todoCheck glyphicon glyphicon-unchecked" data-todoId="' + value._id + '" value="" ' + (isCompleted ? 'checked=checked' : '') + '>' +
            '<span class="glyphicon glyphicon-trash glyphicon-sm delete"></span>' +
            (isCompleted ? '<del>' : '') +
            value.title +
            (isCompleted ? '</del>' : '') +
          '</label>' +
          '<p class="todoDesc">' +
            (isCompleted ? '<del>' : '') +
            value.description + 
            (isCompleted ? '</del>' : '') +
          '</p>' +
        '</div>'
        );
    });
  }
  
  function updateCurrentListToLocalStorage(list) {
    window.localStorage.setItem('todos', JSON.stringify(list));
  }
  
  /**
   * Clear todo list completly.
   */
  function clearTodoList() {
    $('#todoList').html('');
  }
  
  /**
   * Toggle loading spinner or set target state directl.y
   * 
   * @param {Boolean} [state=false]
   */
  function toggleLoadingState(state) {
    if (typeof state !== 'boolean') {
      state = ($('#todoLoading:visible').length === 0);
    }
    
    $('#todoLoading')[state ? 'show' : 'hide']();
  }
  
  /**
   * Add new todo-list item.
   * 
   * @param {Event} e
   */
  function addNewItem(e) {
    e.preventDefault();
    e.stopPropagation();

    toggleLoadingState(true);

    $.post('/api/todos/put', {
      title: $('#todoTitle').val(),
      description: $('#todoDesc').val()
    }, function(res) {
      clearTodoList();
      updateToDoList(res);
      updateCurrentListToLocalStorage(res);
      toggleLoadingState(false);
    });
  }
  
  function toggleCompleteState() {
    var $this = $(this);
    var id = $this.attr('data-todoId');
    var complete = false;

    if ($this.is(':checked')) {
      complete = true;
    }
    
    toggleLoadingState(true);

    $.post('/api/todos/complete', {
      id: id,
      complete: complete
    }, function(res) {
      clearTodoList();
      updateToDoList(res);
      updateCurrentListToLocalStorage(res);
      toggleLoadingState(false);
    });
  }
  
  /**
   * 
   * @param {Event} e
   */
  function deleteItem(e) {
    e.preventDefault();
    e.stopPropagation();
    
    var id = $(this).prev().attr('data-todoId');
    
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Invalid element id!');
    }
    
    toggleLoadingState(true);

    $.post('/api/todos/delete', {
      id: id
    }, function(res) {
      clearTodoList();
      updateToDoList(res);
      updateCurrentListToLocalStorage(res);
      toggleLoadingState(false);
    });
  }

  //TODO: move this check into every CRUD operation! The device might go offline during app usage!
  if (window.navigator.onLine == true) {
    console.log('Device is online!');
    
    // We can fetch new data from the API and add these to the view
    // these will the update / overwrite the data in the local storage for offline use.

    $(window.document).ready(function() {
      console.log('Document is ready');
      
      toggleLoadingState();
      
      // Fetch fresh copy off all todo list items.
      $.get('/api/todos', function(res) {
        updateToDoList(res);
        updateCurrentListToLocalStorage(res);
        toggleLoadingState(false);
      }, 'json');

      // Add a new todo list item.
      $('#todoButton').on('click', addNewItem);

      // Toggle "complete" state.
      $('body').on('click', '.todoCheck', toggleCompleteState);
      
      // Remove item completly.
      $('body').on('click', '.delete', deleteItem);
    });
  }
  else {
    console.log('Device is offline');
    
    // We are offline so will need to pull data from the local storage bin.
    updateToDoList(JSON.parse(window.localStorage.todos));
  }

  if ('serviceWorker' in window.navigator) {
    console.log('Registration In Progress');

    window.navigator.serviceWorker
      .register('../sw.js')
      .then(function() {
        console.log('Registration Complete');
      }, function() {
        console.log('Registration Failed');
      });
  }
  else {
    console.log('Service Worker Not Supported');
  }
})(jQuery, window);
