const rp = require('request-promise');
const cheerio = require('cheerio');
const readline = require('readline-sync');

var email = readline.question("Enter a valid email address: ");
var domain = email.replace(/.*@/, "");   
var baseURL = 'https://www.' + domain;

console.log("\nTarget: " + baseURL + "\n");

var phoneRegex = /(\+\d{1,3}\s?(\s\(0\))?|0)(\d{3}\s?\d{3}\s?\d{4}|\d{4}\s?\d{6})(?![0-9])/g;
var emailRegex = /[A-Za-z][A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z]{3}|(\.[A-Za-z]{2}){2})/g;
var postcodeRegex = /[A-Z]{1,2}(([0-9]{1,2})|([0-9][A-Z]))\s[0-9][A-Z]{1,2}/g;
var urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/;


var phones = [];
var emails = [];
var postcodes = [];

// Method to find data matching a regular expression and store it in an array
function findMatch(regex, text, array) {
    var matchcases = text.match(regex);

    for (var matchcase in matchcases) {
        if(array.includes(matchcases[matchcase]) == false)
            array.push(matchcases[matchcase]);
    } 
     
};

function scrapeLinks(URL) {
    rp(URL)
    .then(function(html) {
        // if success
        var $ = cheerio.load(html);
        var pageText = $.text();

        findMatch(phoneRegex, pageText, phones);
        findMatch(emailRegex, pageText, emails);
        findMatch(postcodeRegex, pageText, postcodes);

        $('a').each(function() {
            var link = $(this).attr('href');
            insideURL = baseURL + link;
            if (insideURL.match(urlRegex)) {
                console.log("Target: " + insideURL);
                rp(insideURL)
                .then(function(html) {
                    var $ = cheerio.load(html);
                    var pageText = $.text();

                    findMatch(phoneRegex, pageText, phones);
                    findMatch(emailRegex, pageText, emails);
                    findMatch(postcodeRegex, pageText, postcodes);
                })
            }
        })

        console.log("Phones: " + phones + '\n' +
            "Emails: " + emails + '\n' +
            "Postcodes: " + postcodes);
    })
    .catch(function(err) {
        // handle error
        console.log(err);
    });
}

scrapeLinks(baseURL);
