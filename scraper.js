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

var crawled = [];
var inboundLinks = [];
var phones = [];
var emails = [];
var postcodes = [];

var knwlInstance = new knwl('english');

// Register Knwl plugins
knwlInstance.register('accuratePhones', require('knwl.js/experimental_plugins/accuratePhones'));
knwlInstance.register('postCodes', require('knwl.js/experimental_plugins/postCodes'));
knwlInstance.register('emails', require('knwl.js/default_plugins/emails'));

// Finds emails using Knwl.js
function getEmails() {
    var emailsFound = knwlInstance.get('emails');

    emailsFound.forEach(function (email) {
        if (emails.includes(email['address']) == false)
            emails.push(email['address']);
    })
}

// Finds phone numbers using Knwl.js
function getPhones(){
    var phonesFound = knwlInstance.get('accuratePhones');

    phonesFound.forEach(function (phone) {
        if (phones.includes(phone) == false)
            phones.push(phone);
    })
}

// Finds postcodes using Knwl.js
function getPostcodes() {
    var postcodesFound = knwlInstance.get('postCodes');

    postcodesFound.forEach(function (postcode) {
        if (postcodes.includes(postcode) == false)
            postcodes.push(postcode);
    })
}

/*
    Makes a request to a webpage, gets all the content
    Parses it using Knwl.js to retrieve wanted data:
        - Phones
        - Emails
        - Postcodes
    Uses Cheerio to get all the page titles and links,
    in order to show every visited page

    Returns arrays of Phones, Emails and Postcodes.
*/ 
function scrapeLink(pageURL, callback) {
    request(pageURL, function (error, response, body) {
        if (response.statusCode == 200) {
            console.log("Connection successful.\n");

            knwlInstance.init(body);

            var page = {};
            page.links = [];

            // Get all the phones
            getPhones();
            // Get all the emails
            getEmails();
            // Get all the postcodes
            getPostcodes();

            // Load cheerio HTML body
            var $ = cheerio.load(body, {
                        normalizeWhitespace: true,
                        xmlMode: true,
                    });

            page.title = $('title').text();
            page.url = pageURL;

            // Put all the page titles and all the URLs in arrays 
            $('a').each(function (i, elem) {
                href = elem.attribs.href;
                // Validate link
                if (href && href.startsWith('/') && href.length > 1) {
                    page.links.push({linkTitle: $(elem).text(), linkURL: href});
                }
            });

            callback(error, page);
        }
    });
}

/*
    Uses scrapeLink to scrape every link on the domain recursively
*/
function domainScrape(link) {
    scrapeLink(link, function (error, page) {
        console.log("Phones: \n" + phones +
                    "\n\nEmails: \n" + emails +
                    "\n\nPostcodes: \n" + postcodes + "\n");
        crawled.push(page.url);
        async.eachSeries(page.links, function (item, cback) {
            parsedURL = url.parse(item.linkURL);

            // If link is inside domain, put it in the array of inbound links
            if (parsedURL.hostname == baseURL) {
                inboundLinks.push(item.linkURL);
            }
            cback(error);
        },
        function () {
            // Create a duplicates-free array of links to be scraped
            var nextURLs = _.difference(_.uniq(inboundLinks), crawled);

            if (nextURLs.length > 0) {
                domainScrape(nextURLs[0]);
            }
        });
    });
}

domainScrape(baseURL);
