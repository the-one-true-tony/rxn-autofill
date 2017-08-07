const express = require('express');

const port = 3000;

const app = express();


app.get('/api/rxnames', (req, res) => {
  let query = req.query.name;
  const test = ['alavert', 'acetaminophen', 'quetiapine'];
  
  res.json(test);
});
app.listen(port, function(){
  console.log('Server started on port ' + port);
});
