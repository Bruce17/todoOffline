/* global window:false */

// eslint-disable-next-line no-unused-vars
(function (window, console, undefined) {
  'use strict';

  var fncDebug = console[ ('debug' in console ? 'debug' : 'log') ];
  var fncInfo = console[ ('info' in console ? 'info' : 'log') ];
  var fncError = console[ ('error' in console ? 'error' : 'log') ];

  /**
   * Return color depending on state.
   *
   * @param {boolean} state
   *
   * @returns {string}
   *
   * @example
   * true  -> green color
   * false -> red color
   */
  var colorOnState = function (state) {
    return (state ? '#2d2' : '#d22');
  };

  /**
   * Debug a boolean value and print its value to the console.
   * Color the result too.
   *
   * @param {string}  message
   * @param {boolean} bool
   */
  var debugBoolean = function debugBoolean(message, bool) {
    fncDebug(
      '[DEBUG] %s: %c%s',
      message,
      'color: ' + colorOnState(bool),
      bool
    );
  };

  /**
   * Log a info message print out a value depending on its state.
   *
   * @param {string}  message
   * @param {string}  value
   * @param {boolean} state
   */
  var logInfo = function logInfo(message, value, state) {
    fncInfo(
      '[INFO] %s %c%s',
      message,
      'color: ' + colorOnState(state),
      value
    );
  };

  /**
   * Log a error message.
   *
   * @param {string}       message
   * @param {Error|string} err
   */
  var logError = function logError(message, err) {
    fncError(
      '[ERROR] %s: ',
      message,
      err
    );
  };

  /**
   * Simple message logging.
   *
   * @param {string} message
   */
  window.logMessage = console.log.bind(console, '[LOG] %s');

  window.debugBoolean = debugBoolean;
  window.logInfo = logInfo;
  window.logError = logError;
})(window, window.console);
