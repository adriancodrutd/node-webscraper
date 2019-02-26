var url = require('url');
var _ = require('lodash');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var readline = require('readline-sync');
var knwl = require('knwl.js');

var email = readline.question("Enter a valid email address: ");
var domain = email.replace(/.*@/, "");
var baseURL = 'https://www.' + domain;

var phoneRegex = /(\+\d{1,3}\s?(\s\(0\))?|0)(\d{3}\s?\d{3}\s?\d{4}|\d{4}\s?\d{6})(?![0-9])/g;
var emailRegex = /[A-Za-z][A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z]{3}|(\.[A-Za-z]{2}){2})/g;
var postcodeRegex = /[A-Z]{1,2}(([0-9]{1,2})|([0-9][A-Z]))\s[0-9][A-Z]{1,2}/g;
var urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/;


var crawled = [];
var inboundLinks = [];
var phones = [];
var emails = [];
var postcodes = [];

var knwlInstance = new knwl('english');

knwlInstance.register('internationalPhones', require('knwl.js/experimental_plugins/internationalPhones'));
knwlInstance.register('emails', require('knwl.js/default_plugins/emails'));
knwlInstance.register('places', require('knwl.js/default_plugins/places'));
knwlInstance.register('phones', require('knwl.js/default_plugins/phones'));

// Method to find data matching a regular expression and store it in an array
function findMatch(regex, text, array) {
    var matchcases = text.match(regex);

    for (var matchcase in matchcases) {
        if(array.includes(matchcases[matchcase]) == false)
            array.push(matchcases[matchcase]);
    }
};

function scrapeLinks(pageURL, callback) {
    request(pageURL, function(error, response, body) {
        if (response.statusCode == 200) {
            console.log("Connection successful.\n");

            knwlInstance.init(body);
            words = knwlInstance.words.get('linkWordsCasesensitive');
            var page = {};
            page.links = [];

            links = [];

            var $ = cheerio.load(body, {
                    normalizeWhitespace: true,
                    xmlMode: true
                });
            page.title = $('title').text();
            page.url = pageURL;

            $('a').each(function(i, elem) {
                href = elem.attribs.href;
                // TODO: URL error checking
                if (href && href.startsWith('/') && href.length > 1) {
                    page.links.push({linkTitle: $(elem).text(), linkURL: href});
                }
            });

            intPhones = knwlInstance.get('internationalPhones');

            // TODO: get Knwl.internationalPhones
            console.log(intPhones);

            // Use regexs to find data
            findMatch(phoneRegex, $.text(), phones);
            findMatch(emailRegex, $.text(), emails);
            findMatch(postcodeRegex, $.text(), postcodes);

            callback(error, page);
        }
    });
}

function domainScrape(link) {
    scrapeLinks(link, function(error, page) {
        console.log(page.links);

        console.log("Phones: \n" + phones +
                        "\nEmails: \n" + emails +
                        "\nPostcodes: \n" + postcodes + "\n");
        crawled.push(page.url);
        async.eachSeries(page.links, function(item, cback) {
            parsedURL = url.parse(item.linkURL);

            if (parsedURL.hostname == baseURL) {
                // TODO: further URL error checking
                inboundLinks.push(item.linkURL);
            }
            cback();

        },
        function () {
            // Create a duplicates-free array,
            // excluding previously scraped links
            var nextURLs = _.difference(_.uniq(inboundLinks), crawled);

            if (nextURLs.length > 0) {
                domainScrape(nextURLs[0]);
            }
        });
    });
}

domainScrape(baseURL);
