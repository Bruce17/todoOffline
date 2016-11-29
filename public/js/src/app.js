/* global window, jQuery, Offline, Promise */

(function ($, window, undefined) {
  'use strict';

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
    requests: true,

    // Should we show a snake game while the connection is down to keep the user entertained?
    // It's not included in the normal build, you should bring in js/snake.js in addition to
    // offline.min.js.
    game: false
  };

  /**
   * @type {Boolean}
   */
  var isOnline = Offline.state;
  console.info('[INFO] Application is %s', (isOnline ? 'online' : 'offline'));

  Offline.on('up', function () {
    isOnline = true;
    console.info('[INFO] Device is online');

    // TODO: if user goes back online, sync latest offline state with the backend.
  });
  Offline.on('down', function () {
    isOnline = false;
    console.info('[INFO] Device is offline');
  });

  // Check current offline/online state.
  Offline.check();


  /**************************************************
   * Helper methods
   */

  function updateToDoList(list) {
    if (!list || list.length === 0) {
      $('#todoList').append('<div>Empty list</div>');
    }

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

  function getCurrentListFromLocalStorage() {
    return window.localStorage.getItem('todos') || [];
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
   * Trigger a online/offline check and return a promise object.
   *
   * @returns {Promise}
   */
  function triggerOfflineCheck() {
    return new Promise(function (response, reject) {
      var xhr = Offline.check();

      xhr.onload = function () {
        if (xhr.readyState >= 4) {
          response();
        }
      };

      xhr.onerror = function () {
        reject();
      };
    });
  }

  /**
   * Toggle a checkbox's disabled state. Change also the upper wrapper elmenent's class attribute.
   *
   * @param jQuery    $el
   * @param {Boolean} [state=false]
   */
  function toggleCheckboxDisabledState($el, state) {
    if (typeof state !== 'boolean') {
      state = $el.attr('disabled');
    }

    $el.attr('disabled', state);
    $el.parents('.checkbox')[state ? 'addClass' : 'removeClass']('disabled');
  }


  /**************************************************
   * Methods to execute CRUD events on the backend.
   */

  /**
   * Fetch and display current list elements.
   * If device is offline, list items will be read from local storage.
   */
  function getCurrentList() {
    toggleLoadingState(true);

    var doneHandler = function(res) {
      clearTodoList();
      updateToDoList(res);
      updateCurrentListToLocalStorage(res);
      toggleLoadingState(false);
    };

    if (isOnline) {
      $.get('/api/todos', doneHandler, 'json');
    }
    else {
      doneHandler(getCurrentListFromLocalStorage());
    }
  }

  /**
   * Add new todo-list item.
   *
   * @param {Event} e
   */
  function addNewItem(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isOnline) {
      toggleLoadingState(true);

      $.post('/api/todos/put', {
        title: $('#todoTitle').val(),
        description: $('#todoDesc').val()
      }, function(res) {
        getCurrentList();
      });

      // Clear input fields after commit.
      $('#todoTitle').val('');
      $('#todoDesc').val('');
    }
    else {
      //TODO: device is offline, store new item in local storage and sync later.
    }
  }

  /**
   * Toggle checkbox state. During state update, disable checkbox to dissallow multiple triggers.
   */
  function toggleCompleteState() {
    // eslint-disable-next-line no-invalid-this
    var $this = $(this);
    var id = $this.attr('data-todoId');
    var complete = false;

    if ($this.is(':checked')) {
      complete = true;
    }

    if (isOnline) {
      toggleLoadingState(true);
      toggleCheckboxDisabledState($this, true);

      $.post('/api/todos/complete', {
        id: id,
        complete: complete
      }, function(res) {
        toggleCheckboxDisabledState($this, false);

        getCurrentList();
      });
    }
    else {
      //TODO: device is offline, store altered item in local storage and sync later.
    }
  }

  /**
   *
   * @param {Event} e
   */
  function deleteItem(e) {
    e.preventDefault();
    e.stopPropagation();

    // eslint-disable-next-line no-invalid-this
    var id = $(this).prev().attr('data-todoId');

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Invalid element id!');
    }

    if (isOnline) {
      toggleLoadingState(true);

      $.post('/api/todos/delete', {
        id: id
      }, function(res) {
        getCurrentList();
      });
    }
    else {
      //TODO: device is offline, store deleted item in local storage and sync later.
    }
  }


  /**************************************************
   * Wait for the site to be ready loaded.
   */

  $(window.document).ready(function() {
    console.log('Document is ready');

    // Fetch fresh copy off all todo list items.
    getCurrentList();

    // Add a new todo list item.
    $('#todoButton').on('click', addNewItem);

    // Toggle "complete" state.
    $('body').on('click', '.todoCheck', toggleCompleteState);

    // Remove item completly.
    $('body').on('click', '.delete', deleteItem);
  });


  /**************************************************
   * Init service worker if available.
   */

  if ('serviceWorker' in window.navigator) {
    console.log('Registration In Progress');

    window.navigator.serviceWorker
      .register('./sw.js')
      .then(function(reg) {
        console.log('Registration succeeded. Scope is ' + reg.scope);

        if (reg.installing) {
          console.log('Service worker installing');
        }
        else if (reg.waiting) {
          console.log('Service worker installed');
        }
        else if (reg.active) {
          console.log('Service worker active');
        }
      }).catch(function(error) {
        // registration failed
        console.log('Registration failed with ' + error);
      });
  }
  else {
    console.log('Service Worker Not Supported');
  }
})(jQuery, window);
