var version = 'v1::';

self.addEventListener("install",function(event){
  console.log("Worker: Install In Progress");

  event.waitUntil(
    caches.open(version + 'core')
          .then(function(cache){
            return cache.addAll([
              // An array of all the files we wish to sync offline.
              'public/_js/app.js'
            ]);
          })
          .then(function(){
            console.log("Worker: Install Complete");
          })
  );
});


self.addEventListener("fetch",function(event){
  console.log("Worker: Fetch in progress");

  if(event.request.method !== 'GET'){
    /*
      We only want to deal with GET requests, other methods should die
      gracefully in our main code.
    */
    console.log("Worker: Method Rejected");
    return;
  }



  event.respondWith(
    // find a match for the requested URL (pages etc..)
    caches.match(event.request).then(function(cached){
      /*
        Attempt to get the file from the network if it fails then we will return
        the cached versrion.
      */
      var networked = fetch(event.request)
                      .then(fetchedFromNetwork,unableToResolve)
                      .catch(unableToResolve);

      console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);
      return cached || networked;

      function fetchedFromNetwork(response){
      /*
        We attempt to store the file into the cache for later use.
      */
        var cachedCopy = response.clone();

        console.log("Worker: fetched from network: "+event.request.url);

        caches.open(version + 'pages')
              .then(function add(cache){
                cache.put(event.request,cachedCopy)
              })
              .then(function(){
                console.log('Worker: fetch response stored in cache.', event.request.url);
              });

          return response;
      }

      function unableToResolve(){

        console.log('WORKER: fetch request failed in both cache and network.');

        return new Response('<h1>Service Unavailable</h1>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
      }

    })
  )
});
