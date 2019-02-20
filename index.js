const rp = require('request-promise');
const otcsv = require('objects-to-csv');
const cheerio = require('cheerio');

var Knwl = require('./node_modules/knwl.js');
var knwlInstance = new Knwl('english');

var email = 'test@canddi.com';
var domain = email.replace(/.*@/, "");
var baseURL = 'https://www.' + domain;

rp(baseURL)
    .then(function(html) {
        // if success
        console.log(cheerio(html).text());
    })
    .catch(function(err) {
        // handle error
        console.log(err);
    });
