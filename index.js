const express = require('express');
const redis = require('redis');
const bluebird = require('bluebird');
const port = process.env.PORT || 3000;
const client = redis.createClient(process.env.REDIS_URL);

bluebird.promisifyAll(redis.RedisClient.prototype);

client.on('connect', () => {
  console.log('Connected to Redis...');
});

client.on("error", (err) => {
  console.log("Error " + err);
});

const app = express();

app.get('/api', (req, res) => {
  let query = req.query.name;   // query
  let maxReturn = 10;           // set number of results returned
  let sample = 30;              // sample set to find the matching prefixes
  let results = [];             // all matching prefixes

  let searchLoop = (start, loop = true) => {
    // Because Redis returns asyncronously a regular while loop will
    // not work.  searchLoop will continue to loop through the dataset
    // and incrementing <start> while <loop> retains true or until
    // <maxReturn> has been reached.

    if(results.length >= maxReturn || loop === false) return;

    client.zrangeAsync('autocomplete', start, start + sample - 1)
      .then(range => {
        start += sample;
        if(range === undefined || range.length === 0) {
          loop = false;
          return;
        } else {
          range.forEach((prefix) => {
            // Return if the min substring of prefix does not match the query.
            let minLength = Math.min(prefix.length, query.length);
            if(query.slice(0,minLength) !== prefix.slice(0,minLength)){
              loop = false;
              return;
            } else if (prefix[prefix.length-1] === "%" && results.length < maxReturn){
              // '%' marks the end of a drug name and if substrings match
              // add the drug to results.
              results.push(prefix.slice(0,prefix.length-1));
            }
          });
        }
      })
      .then(() => {
        if(loop === true && results.length < maxReturn) {
          // if we didn't reach max returns and loop is still true
          // run through searchLoop again.
          searchLoop(start);
        } else {
          return res.send(results);
        }
      });
  };

  client.zrankAsync('autocomplete', query)
    // check if query matches any prefixes, if it does start searchLoop.
    .then(start => {
      if(start === null) return res.send(results);
      searchLoop(start);
    });
});

app.listen(port, function(){
  console.log('Server started on port ' + port);
});
