const redis = require('redis');
const axios = require('axios');
const client = redis.createClient(process.env.REDIS_URL);

module.exports.populateNames = () => {

  const buildAutoFill = (names) => {
    if(names.length === 0) return;

    names.forEach((name, index) => {
      name = name.toLowerCase();
      for (var i = 0; i < name.length; i++) {
        let prefix = name.slice(0,i);
        client.zadd('autocomplete', 0, prefix);
      }
      client.zadd('autocomplete', 0, name+"%");
      console.log(`Index ${index}: complete`);
    });
  };

  return axios.get(`https://rxnav.nlm.nih.gov/REST/displaynames`)
    .then( res => (res.data.displayTermsList.term))
    .then( names => {
      buildAutoFill(names);
    });
};
