/* global window:false */

(function (window, console, undefined) {
  'use strict';

  var fncDebug = console[ ('debug' in console ? 'debug' : 'log') ];
  var fncInfo = console[ ('info' in console ? 'info' : 'log') ];

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
   * Simple message logging.
   *
   * @param {string} message
   */
  window.logMessage = console.log.bind(console, '[LOG] %s');

  window.debugBoolean = debugBoolean;
  window.logInfo = logInfo;
})(window, window.console);
