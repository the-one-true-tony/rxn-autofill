const express = require('express');
const redis = require('redis');
const bluebird = require('bluebird');
const port = process.env.PORT || 3000;
const client = redis.createClient(process.env.REDIS_URL);

bluebird.promisifyAll(redis.RedisClient.prototype);
const pp = require('./pull_names');
pp.populateNames();

client.on('connect', () => {
  console.log('Connected to Redis...');
});

client.on("error", (err) => {
  console.log("Error " + err);
});

const app = express();

app.get('/api', (req, res) => {
  let query = req.query.name;
  let maxReturn = 10;
  let sample = 30;
  let results = [];


  let promiseLoop = (start, loop = true) => {
    if(results.length >= maxReturn || loop === false) return;
    console.log("start:", start);

    client.zrangeAsync('autocomplete', start, start + sample - 1)
      .then(range => {
        start += sample;
        if(range === undefined || range.length === 0) {
          loop = false;
          return;
        } else {
          range.forEach((prefix) => {
            let minLength = Math.min(prefix.length, query.length);
            if(query.slice(0,minLength) !== prefix.slice(0,minLength)){
              loop = false;
              return;
            } else if (prefix[prefix.length-1] === "%" && results.length < maxReturn){
              results.push(prefix.slice(0,prefix.length-1));
            }
          });
        }
      })
      .then(() => {
        if(loop === true && results.length < maxReturn) {
          promiseLoop(start);
        } else {
          return res.json(results);
        }
      });
  };

  client.zrankAsync('autocomplete', query)
    .then(start => {
      console.log("starting index is:", start);
      if(start === null) return res.json(results);
      promiseLoop(start);
    });
});


app.listen(port, function(){
  console.log('Server started on port ' + port);
});

// while(results.length < maxReturn){
//
//   let range = client.zrangeAsync('autcomplete', start, start + sample - 1);
//   start += sample;
//   if(range === undefined || range.length === 0) return;
//   range.forEach((prefix) => {
//     let minLength = Math.min(prefix.length, query.length);
//     if(query.slice(0,minLength) !== prefix.slice(0,minLength)){
//       maxReturn = results.length;
//       return;
//     } else if (prefix[prefix.length-1] === "%" && results.length !== maxReturn){
//       results.append(prefix.slice(0,prefix.length-2));
//     }
//   });
//
// }
