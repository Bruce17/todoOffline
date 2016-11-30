/* global Promise */

/**
 * Credit to: https://ponyfoo.com/articles/simple-offline-site-serviceworker
 * for a guid on how to setup a serviceWorker for offline web applications.
 */

(function (undefined) {
  'use strict';

  var version = 'v1::';

  /**
   * An array of all the files we wish to sync offline.
   *
   * @type {Array}
   */
  var cacheFiles = [
    '../../css/main.css',
    '../../css/lib/offline-theme-chrome.css',
    '../../css/lib/offline-language-german.css',
    '../lib/jquery-3.1.0.min.js',
    '../lib/offline.min.js',
    'app.js',
    'debug.js'
  ];

  self.addEventListener('install', function(event) {
    console.log('Worker: Install In Progress');

    event.waitUntil(
      caches.open(version + 'core')
        .then(function(cache) {
          return cache.addAll(cacheFiles);
        })
        .then(function() {
          console.log('Worker: Install Complete');
          self.skipWaiting();
        })
    );
  });

  self.addEventListener('fetch', function(event) {
    console.log('Worker: Fetch in progress');

    if (event.request.method !== 'GET') {
      // We only want to deal with GET requests, other methods should die gracefully in our main code.
      console.log('Worker: Method Rejected');
      return;
    }

    function fetchedFromNetwork(response) {
      // We attempt to store the file into the cache for later use.
      var cachedCopy = response.clone();
      console.log('Worker: fetched from network: ' + event.request.url);

      caches.open(version + 'pages')
        .then(function add(cache) {
          cache.put(event.request,cachedCopy);
        })
        .then(function() {
          console.log('Worker: fetch response stored in cache.', event.request.url);
        });

      return response;
    }

    function unableToResolve() {
      //console.log('WORKER: fetch request failed in both cache and network.');

      return new Response('<h1>Service Unavailable</h1>', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/html'
        })
      });
    }

    event.respondWith(
      // find a match for the requested URL (pages etc..)
      caches.match(event.request).then(function(cached) {
        /*
          Attempt to get the file from the network if it fails then we will return
          the cached versrion.
        */
        var networked = fetch(event.request)
                        .then(fetchedFromNetwork, unableToResolve)
                        .catch(unableToResolve);

        console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);
        return cached || networked;
      })
    );
  });

  self.addEventListener('activate', function(event) {
    /*
     * Just like with the install event, event.waitUntil blocks activate on a
     * promise. Activation will fail unless the promise is fulfilled.
     */
    console.log('Worker: activate event in progress.');

    event.waitUntil(
      caches
        /*
         * This method returns a promise which will resolve to an array of
         * available cache keys.
         */
        .keys()
        .then(function (keys) {
          // We return a promise that settles when all outdated caches are deleted.
          return Promise.all(
            keys
              .filter(function (key) {
                // Filter by keys that don't start with the latest version prefix.
                return !key.startsWith(version);
              })
              .map(function (key) {
                // Return a promise that's fulfilled when each outdated cache is deleted.
                return caches.delete(key);
              })
          );
        })
        .then(function() {
          console.log('Worker: activate completed.');
        })
    );
  });

  self.addEventListener('sync', function(event) {
    console.log('Start syncing ...');

    if (event.tag === 'syncTest') {
      //event.waitUntil(fncFooBar());
      console.log('... execute "syncTest"');
    }
  });
})();
