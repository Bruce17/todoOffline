/* global window, jQuery, Offline, Promise, logMessage:false, debugBoolean:false, logInfo:false, logError:false */

(function ($, window, undefined) {
  'use strict';

  /**
   * Prepare a task object for storing backend task (add, delete, complete item)
   * at the backend. Tasks will be stored in a simple queue in the frontend and
   * syncronisied if the user is online.
   *
   * @param {string}        [method='GET'] Method type send to the backend.
   * @param {string}        url            Trigger this remote ressource.
   * @param {object|null}   data           Pass this data to the remore ressource.
   * @param {object}        states         An object containing states to execute
   *                                       after processing this task.
   */
  var Task = function (method, url, data, states) {
    this.method = method || 'GET';
    this.url = url;
    this.data = data || {};
    this.states = states || {};

    this._id = (new Date()).getTime();
  };

  /**
   * Prepare an jQuery ajax object and return it.
   *
   * @returns {Promise}
   */
  Task.prototype.prepareAjaxRequest = function () {
    var taskContext = this;

    // Return a real javascript promise object.
    // We don't want this fake jQuery promises here.
    return new Promise(function (resolve, reject) {
      $.ajax({
        method: taskContext.method,
        url: taskContext.url,
        data: taskContext.data,
        dataType: 'json',
        // Explicitly do not cache this requests.
        cache: false
      })
        // Resolve or reject a real promise object at this point.
        .then(resolve, reject);
    });
  };

  /**
   * Factory method to create a task object from a given set of data.
   *
   * @returns {Task}
   */
  Task.fromObject = function (obj) {
    var task = new Task(obj.method, obj.url, obj.data, obj.states);

    if (obj._id) {
      task._id = obj._id;
    }

    return task;
  };

  /**
   * Prepare a todo list item object.
   *
   * @param {string}  title            Title of the list item (required).
   * @param {string}  description      Optional item description.
   * @param {boolean} [complete=false] Mark this item as completed.
   * @param {number}  [id=timestamp]   Item id generated in the backend. If none
   *                                   exists or item is not syncronized yet,
   *                                   the frontend will assign a random id to
   *                                   this item.
   */
  var Item = function (title, description, complete, id) {
    if (!title || title.length <= 0) {
      throw new Error('Item: Please define a proper item name!');
    }

    this.title = title;
    this.description = description || '';
    this.complete = (typeof complete === 'boolean' ? complete : false);
    this._id = (typeof id === 'number' ? id : (new Date()).getTime());
  };


  // Do some feature detection first.
  var hasServiceWorkerSupport = ('serviceWorker' in window.navigator);
  debugBoolean('ServiceWorker support', hasServiceWorkerSupport);


  /**************************************************
   * Configurate library "Offline.js" to react if application goes offline/online.
   */
  Offline.options = {
    // Should we check the connection status immediatly on page load.
    checkOnLoad: true,

    // Should we monitor AJAX requests to help decide if we have a connection.
    interceptRequests: true,

    // Should we automatically retest periodically when the connection is down (set to false to disable).
    reconnect: {
      // How many seconds should we wait before rechecking.
      initialDelay: 3,

      // How long should we wait between retries.
      delay: 30, // (1.5 * last delay, capped at 1 hour)
    },

    // Should we store and attempt to remake requests which fail while the connection is down.
    // => We do this on our own.
    requests: false,

    // Should we show a snake game while the connection is down to keep the user entertained?
    // It's not included in the normal build, you should bring in js/snake.js in addition to
    // offline.min.js.
    game: false
  };

  /**
   * @type {Boolean}
   */
  var isOnline = Offline.state;
  logInfo('Application is', (isOnline ? 'online' : 'offline'), isOnline);


  /**************************************************
   * Helper methods
   */

  /**
   * Clear todo list completly.
   */
  function clearTodoList() {
    $('#todoList').html('');
  }

  /**
   * Update current todo list and add new items to it.
   *
   * @param {Array} list
   */
  function updateToDoList(list) {
    clearTodoList();

    if (!list || list.length === 0) {
      $('#todoList').append('<div>Empty list</div>');
    }

    // Put newest elements on top.
    list.reverse();

    var todoListHtml = '';

    list.forEach(function(value) {
      var isCompleted = (value.complete === true);

      todoListHtml += '' +
        '<tr>' +
          '<td>' +
            '<div class="checkbox todo">' +
              '<label class="todoTitle">' +
                '<input type="checkbox" class="todoCheck glyphicon glyphicon-unchecked" data-todoId="' + value._id + '" value="" ' + (isCompleted ? 'checked=checked' : '') + '>' +
                (isCompleted ? '<del>' : '') +
                value.title +
                (isCompleted ? '</del>' : '') +
              '</label>' +
              '<p class="todoDesc">' +
                (isCompleted ? '<del>' : '') +
                value.description +
                (isCompleted ? '</del>' : '') +
              '</p>' +
            '</div>' +
          '</td>' +
          '<td>' +
            '<span class="glyphicon glyphicon-trash glyphicon-sm delete" data-todoId="' + value._id + '"></span>' +
          '</td>' +
        '</tr>';
    });

    $('#todoList').prepend(todoListHtml);
  }

  /**
   * Update a new list to the local storage.
   *
   * @param {Array}  list
   * @param {string} [listName='todos']
   */
  function updateListToLocalStorage(list, listName) {
    listName = listName || 'todos';

    window.localStorage.setItem(listName, JSON.stringify(list));
  }

  /**
   * Get the current todo list from the local storage or an empty array if
   * none exists yet.
   *
   * @param {string} [listName='todos']
   *
   * @returns {Array}
   */
  function getListFromLocalStorage(listName) {
    listName = listName || 'todos';

    return JSON.parse(window.localStorage.getItem(listName)) || [];
  }

  /**
   * Toggle loading spinner or set target state directly.
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
   * Reset a form field's content.
   *
   * @param {string|jQuery} el
   */
  function resetFormField(el) {
    $(el).val('').blur();
  }

  /**
   * Remove a processed task from the queue.
   *
   * @param {Task} task
   */
  function removeTaskFromQueue(task) {
    var tasks = getListFromLocalStorage('tasks');

    tasks = tasks.filter(function(item) {
      // Some ids might be numbers only. Therefore check against numbers and numbers as strings.
      // eslint-disable-next-line eqeqeq
      return (!item || item._id != task._id);
    });

    updateListToLocalStorage(tasks, 'tasks');
  }

  /**
   * Process and execute every tasks in the queue.
   */
  function processTaskList() {
    var tasks = getListFromLocalStorage('tasks');
    var promise = Promise.resolve();

    toggleLoadingState(true);

    /*
     * Iterate over all tasks and create a promise chain. All ajax requests will
     * be executed after another. Every finished tasks will be deleted immediately.
     */
    tasks.forEach(function (task) {
      // This line creates the promise chain.
      promise = promise.then((function (innerTask) {
        return function () {
          // Prepare and trigger ajax request.
          return innerTask.prepareAjaxRequest()
            // Ajax request was successful.
            .then(function (data) {
              // Remove process task from queue.
              removeTaskFromQueue(innerTask);

              // Process some task states after successful exection.
              if (innerTask.states) {
                // Update todo list in the local storage and display new list content.
                if (innerTask.states.updateList) {
                  updateListToLocalStorage(data);
                  updateToDoList(data);
                }
              }
            })
            // There was an error during executing the ajax request.
            .catch(function () {
              //TODO: handle error if user is gone offline.
              logError(arguments);
            });
        };
      })(Task.fromObject(task)));
    });

    // Disable loading spinner after all commands are execeuted.
    promise.then(function () {
      toggleLoadingState(false);
    });
  }

  /**
   * Add a new task to the local queue.
   *
   * @param {Task} task
   */
  function addTaskToQueue(task) {
    var taskList = getListFromLocalStorage('tasks');
    taskList.push(task);
    updateListToLocalStorage(taskList, 'tasks');

    // Start executing local task queue processing.
    if (isOnline) {
      processTaskList();
    }

    // Else: task list processing will automatically start if user goes back online.
  }


  /**************************************************
   * Tmethods to manipulate list items.
   */

  /**
   * First load current list from local storage.
   * Then try to load new content from the backend.
   *
   * @returns {Array}
   */
  function getCurrentList() {
    // Fetch current list from local storage and update list.
    var todos = getListFromLocalStorage();
    updateToDoList(todos);

    // Get a fresh copy of the todo list from the backend.
    addTaskToQueue(new Task(
      'GET',
      '/api/todos',
      null,
      {updateList: true}
    ));
  }

  /**
   * Add new todo-list item.
   *
   * @param {Event} e
   */
  function addNewItem(e) {
    e.preventDefault();
    e.stopPropagation();

    // Add new item to local list immediately.
    var todos = getListFromLocalStorage();
    var newItem = new Item($('#todoTitle').val(), $('#todoDesc').val());
    todos.push(newItem);
    updateListToLocalStorage(todos);

    // Update displayable list.
    updateToDoList(todos);

    // Add a new task to sync new data with the backend.
    addTaskToQueue(new Task(
      'PUT',
      '/api/todos/put',
      newItem
    ));

    // Clear input fields after commit.
    resetFormField('#todoTitle');
    resetFormField('#todoDesc');

    $('html, body').animate({
      scrollTop: $('#todo-wrapper').offset().top
    }, 250);
  }

  /**
   * Delete a todo-list item.
   *
   * @param {Event} e
   */
  function deleteItem(e) {
    e.preventDefault();
    e.stopPropagation();

    // eslint-disable-next-line no-invalid-this
    var id = $(this).attr('data-todoId');

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Invalid element id!');
    }

    // Find element to delete.
    var todos = getListFromLocalStorage();

    todos = todos.filter(function (item) {
      // Some ids might be numbers only. Therefore check against numbers and numbers as strings.
      // eslint-disable-next-line eqeqeq
      return (!item || item._id != id);
    });

    updateListToLocalStorage(todos);

    // Update displayable list.
    updateToDoList(todos);

    // Add a new task to sync new data with the backend.
    addTaskToQueue(new Task(
      'DELETE',
      '/api/todos/delete',
      {
        id: id
      }
    ));
  }

  /**
   * Toggle checkbox state. During state update,
   * disable checkbox to dissallow multiple triggers.
   */
  function toggleCompleteState() {
    // eslint-disable-next-line no-invalid-this
    var $this = $(this);
    var id = $this.attr('data-todoId');
    var complete = false;

    if ($this.is(':checked')) {
      complete = true;
    }

    // Alter toggle state for current item.
    var todos = getListFromLocalStorage();

    todos.forEach(function (item) {
      // Some ids might be numbers only. Therefore check against numbers and numbers as strings.
      // eslint-disable-next-line eqeqeq
      if (item && item._id == id) {
        item.complete = complete;
      }
    });

    updateListToLocalStorage(todos);

    // Update displayable list.
    updateToDoList(todos);

    // Add a new task to sync new data with the backend.
    addTaskToQueue(new Task(
      'POST',
      '/api/todos/complete',
      {
        id: id,
        complete: complete
      }
    ));
  }


  /**************************************************
   * Wait for the site to be ready loaded.
   */
  $(function() {
    logMessage('Document is ready');

    // Fetch fresh copy off all todo list items.
    getCurrentList();

    // Add a new todo list item.
    $('#todoButton').on('click', addNewItem);

    // Toggle "complete" state.
    $('body').on('click', '.todoCheck', toggleCompleteState);

    // Remove item completly.
    $('body').on('click', '.delete', deleteItem);

    // Update list manually.
    $('#todoUpdate').on('click', getCurrentList);

    // Refresh list automatically every minute.
    setTimeout(getCurrentList, 60 * 1000);
  });


  Offline.on('up', function () {
    isOnline = true;
    logInfo('Device is', 'online', isOnline);

    // If user goes back online, sync latest offline state with the backend.
    processTaskList();
  });
  Offline.on('down', function () {
    isOnline = false;
    logInfo('Device is', 'offline', isOnline);
  });

  // Check current offline/online state.
  Offline.check();


  /**************************************************
   * Init service worker if available.
   */

  if (hasServiceWorkerSupport) {
    logMessage('Registration In Progress');

    window.navigator.serviceWorker
      .register('./sw.js')
      .then(function(reg) {
        logMessage('Registration succeeded. Scope is ' + reg.scope);

        if (reg.installing) {
          logMessage('Service worker installing');
        }
        else if (reg.waiting) {
          logMessage('Service worker installed');
        }
        else if (reg.active) {
          logMessage('Service worker active');
        }
      })
      .catch(function(error) {
        // registration failed
        logMessage('Registration failed with ' + error);
      });
  }
  else {
    logMessage('Service Worker Not Supported');
  }
})(jQuery, window);
