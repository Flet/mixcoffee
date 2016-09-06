var express = require('express');
var cors = require('cors');
var app = express();
var Gsr = require('google-spreadsheet-reader');
var spreadSheet = new Gsr(process.env.GOOGLE_SPREADSHEET_ID);

app.use(cors());

app.get('/api/summary', function (req, res, next) {
  spreadSheet.load({ camelcase: true })
    .then(function (data) {
      return res.json(massage(data.coffeefund));
    })
    .catch(function (err) { console.error(err.message); });
});

app.use('/', express.static('static'));

app.listen(8000, function () {
  console.log('listening on port 8000');
});

function massage (data) {
  var massaged = {
    balance: data[data.length - 1].balance,
    topContributors: calcTopContributors(data),
    recentCoffees: calcRecentCoffees(data)
  };
  massaged.latestCoffee = massaged.recentCoffees[0];

  massaged.data = data;
  return massaged;
}

function calcRecentCoffees (data) {
  return data.filter(d => d.contributor === 'COFFEE')
  .slice(-3)
  .reverse()
  .map(d => {
    return {
      day: new Date(d.day).getTime(),
      coffee: d.comment,
      roasterUrl: d.roasterUrl,
      coffeeUrl: d.coffeeUrl,
      image: d.image
    };
  });
}

function calcTopContributors (data) {
  // top contributors last 30 days
  var today = new Date().getTime();
  var thirdayDaysAgo = new Date(today - (30 * 86400000));
  var top = data
    .filter(d => new Date(d.day).getTime() > thirdayDaysAgo)
    .filter(d => d.contributor !== 'COFFEE')
    .reduce((p, c) => {
      var val = Number(c.amount.replace('$', ''));
      if (!p[c.contributor]) p[c.contributor] = Number(0);
      p[c.contributor] = p[c.contributor] + val;
      return p;
    }, {});

  var contributors = Object.keys(top).map(k => {
    return {
      contributor: k,
      amount: '$' + top[k].toFixed(2),
      amt: top[k]
    };
  })
  .sort((a, b) => a.amt < b.amt);

  return contributors;
}
