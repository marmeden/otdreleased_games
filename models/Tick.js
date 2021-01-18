'use strict';
process.env.NTBA_FIX_319 = 1;

var moment = require('moment');
const axios = require("axios").default;

const fs = require('fs');
const path = require('path');
var https = require('https')
var release = require('./Release.js');
var company = require('./Company.js');
var platform = require('./Platform.js');
const tconfig = require('../config/tconfig.js');
const mainconfig = require('../config/config.js');

const auther = require('../auth.js')

const twit = require('twit');
const T = new twit(tconfig);

const { TelegramClient } = require('messaging-api-telegram');
const client = new TelegramClient({
    accessToken: mainconfig.teltoken,
});
const CHAT_ID = mainconfig.id;

const maxReleasesPerDay = mainconfig.maxPerDay;
const maxTags = mainconfig.maxTags;
const maxLength = mainconfig.maxLength;
const minRating = mainconfig.minRating;


let myHeaders;
let myOptions;

const urlCover = 'https://api.igdb.com/v4/covers';
const urlCompanies = 'https://api.igdb.com/v4/companies';
const urlPlatforms = 'https://api.igdb.com/v4/platforms';

let updatable = false;
const forceUpdate = true;

module.exports = class Tick {
    constructor(date) {
        this.date = date;
        this.releases = []
    }

    // Method
    getReleases() {

        function ensureDirectoryExistence(filePath) {
            var dirname = path.dirname(filePath);
            if (fs.existsSync(dirname)) {
                return true;
            }
            ensureDirectoryExistence(dirname);
            fs.mkdirSync(dirname);
            
            return false;
        }

        let warePath = '../warehouse/'+moment(this.date).format('M')+'-'+moment(this.date).format('MMM')+'/'+moment(this.date).format('D')+'.json';
        let wareFullMounted = path.join(__dirname + '/', warePath);
        const dirExist = ensureDirectoryExistence(wareFullMounted);

        let myData = []

        if (dirExist) {
            if (fs.existsSync(wareFullMounted)) {
                const data =  fs.readFileSync(wareFullMounted);
                const old = JSON.parse(data);
                myData = old; 
            } 
        } 

        myData.forEach((entry) => {
            let r = new release(entry);
            // if to curate only exact dates
            if(moment(r.releaseDate, 'D MMMM YYYY', true).isValid()) {
                this.releases.push(r);
            }
        })

        this.releases.sort((a, b) => a.ranking - b.ranking);
    }

    updateReleases () {
        let warePath = '../warehouse/'+moment(this.date).format('M')+'-'+moment(this.date).format('MMM')+'/'+moment(this.date).format('D')+'.json';
        let wareFullMounted = path.join(__dirname + '/', warePath);

        let myData = [];
        myData = JSON.stringify(myData, null, 2);
        fs.writeFileSync(wareFullMounted, myData);

        myData = this.releases;
        myData = JSON.stringify(myData, null, 2);
        fs.writeFileSync(wareFullMounted, myData); 
    }

    async fetchCover(id) {
        myOptions = {
            method: 'POST',
            url: urlCover,
            headers: myHeaders,
            data: 'fields url;\n where game = '+id+';\n'
        };

        const cover = await axios(myOptions).then( 
            (response) => { 
                return response.data 
            }, 
            (error) => { 
                console.log(error); 
            } 
        );

        return cover
    }

    async fetchCompany(id) {

        let query = "";
        id.forEach((plat, i) => {
            query = query + "id = " + plat;
            if(i != id.length - 1) {
                query = query + " | "
            }
        });

        myOptions = {
            method: 'POST',
            url: urlCompanies,
            headers: myHeaders,
            data: 'fields *;\n where '+query+';\n'
        };

        const mycompany = await axios(myOptions).then( 
            (response) => { 
                return response.data 
            }, 
            (error) => { 
                console.log(error); 
            } 
        );


        const companies = mycompany.map((co) => {
            let mycom = new company(co);
            return mycom
        })

        return companies
    }

    async fetchPlatform(id) {

        let query = "";
        id.forEach((plat, i) => {
            query = query + "id = " + plat;
            if(i != id.length - 1) {
                query = query + " | "
            }
        });

        myOptions = {
            method: 'POST',
            url: urlPlatforms,
            headers: myHeaders,
            data: 'fields *;\n where '+query+';\n'
        };

        const myplatform = await axios(myOptions).then( 
            (response) => { 
                return response.data 
            }, 
            (error) => { 
                console.log(error); 
            } 
        );


        const platforms = myplatform.map((pl) => {
            let mypl = new platform(pl);
            return mypl
        })

        return platforms
    }

    async fetchExtraInfo() {
        let head = await auther.authMe();
        myHeaders = head;
        //console.log(myHeaders);

        // COVER 
        let cover = await Promise.all(
            this.releases.map(async rel => {
                if (!rel.cover_full) {
                    let cover = await this.fetchCover(rel.id);
                    rel.cover_full = cover[0].url.replace("t_thumb", "t_cover_big");
                    updatable = true;
                }
                return rel
            })
          )


        // COMPANY
        let company = await Promise.all(
            this.releases.map(async rel => {
                if (!rel.company_full) {
                    let company = await this.fetchCompany(rel.company);
                    rel.companies_full = company;
                    updatable = true;
                }
                return rel
            })
          )

        // PLATFORM
        let platform = await Promise.all(
            this.releases.map(async rel => {
                if (!rel.platforms_full) {
                    let platform = await this.fetchPlatform(rel.platforms);
                    rel.platforms_full = platform;
                    updatable = true;
                }
                return rel
            })
          )


    }

    filterExcluded () {
        if (this.releases.length > 0) {
            console.log("wawa");
            let tempRel = this.releases.filter((rel) => rel.rating > minRating);
            console.log(tempRel);
            if (tempRel.length == 0) {
                this.releases = this.releases.sort((a, b) => b.rating - a.rating).slice(0, 1);
            } else {
                this.releases = tempRel;
            }
            //this.releases = this.releases.filter((rel) => (!rel.tags.some((tag) => excludedTags.includes(tag) && rel.ranking > excludedAbsolutionRank)))
        }
    }

    trimExceededMaximum () {
        if (this.releases.length > 0 && this.releases.length > maxReleasesPerDay) {
            this.releases = this.releases.slice(0, maxReleasesPerDay).map((rel) => rel);
        }
    }

    async tweetMe (tweet, pic, i) {
        console.log("tweet");
        console.log(pic);
/*         T.post('statuses/update', { status: tweet }).then(result => {
            console.log('You successfully tweeted this : "' + result + '"');
        }).catch(console.error);  */

        const imgLocalURL = './image-'+i+'.jpg'

        var file = fs.createWriteStream(imgLocalURL);

        https.get(pic, function(response) {
            response.pipe(file);
            response.on('end', function () {
                // all done
                const imageData = fs.readFileSync(imgLocalURL, { encoding: 'base64' } ) //replace with the path to your image
                console.log("img data");
                console.log(imageData);
        
                T.post("media/upload", {media: imageData}, function(error, media, response) {
                    if (error) {
                        console.log(error)
                    } else {
                        const status = {
                            status: tweet,
                            media_ids: media.media_id_string
                        }
        
                        T.post("statuses/update", status, function(error, tweet, response) {
                        if (error) {
                            console.log(error)
                        } else {
                            console.log("Successfully tweeted an image!")
                        }
                        })
                    }
                })
            })
        });

    }

    async telegramMe(telmsg, pic) {
        console.log("tel");
/*         await client.sendMessage(CHAT_ID, telmsg, {
            disableWebPagePreview: true
        }); */
        await client.sendPhoto(CHAT_ID, pic, {
            parse_mode: 'Markdown',
            caption: telmsg
        });
    }

    async publishReleases() {

        function formatStringTag(tag) {
            return "#" + tag.replace(/\W/g, '').toLowerCase();
        }

        function polishTags(tags) {
            const temp = tags.slice(0, maxTags).map((tag) => {
                return formatStringTag(tag);
            })
            return temp;
        }

        function buildText(rel, app) {
            let textTemplateOptions;
            let yearsAgo = parseInt(moment(new Date()).format('YYYY')) - rel.year;
            let company = '';
            let platforms = [];
            if(rel.companies_full.length > 0) company = rel.companies_full[0].name;
            if(rel.platforms_full.length > 0) {
                platforms = rel.platforms_full.map((pl) => {
                    let pltext = '';
                    if (pl.abb) {
                        pltext = pl.abb;
                    } else {
                        pltext = pl.name
                    }
                    return pltext
                })
            }
            let game = rel.game;
            let year = rel.year;
            let dayMonth = moment(new Date()).format('Do MMMM');

            let companyTrim = '';
            let gameTrim = '';

            if (app == 'te') {
                companyTrim = '*';
                gameTrim = '_'
            }

            let singlePlatform = '';
            if (platforms.length == 1) singlePlatform = 'on ' + platforms[0];

            const textTemplates = [
                //`On this day in ${name}&age=${age}`
                {
                    tag: 'std',
                    text: `Today marks ${yearsAgo} years since ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} was released ${singlePlatform}. It was published in ${year}.`
                },
                {
                    tag: 'std',
                    text: `On this day in ${year} the ${companyTrim}${company}${companyTrim}'s game ${gameTrim}${game}${gameTrim} was released ${singlePlatform}. It's been ${yearsAgo} years already`
                },
                {
                    tag: 'std',
                    text: `Remember the ${dayMonth} in ${year}? It was the day ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} came to life ${singlePlatform}`
                },
                {
                    tag: 'top',
                    text: `Wake up and wish a Happy Birthday to ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim}. It turns ${yearsAgo} today.`
                },
                {
                    tag: 'old',
                    text: `${year} seems far away now. On this day in ${year} ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} was released`
                },
                {
                    tag: 'old',
                    text: `${year}. It's been a while, I didn't even exist but a day like today ${yearsAgo} years ago ${companyTrim}${company}${companyTrim} released ${gameTrim}${game}${gameTrim}. Celebrate!`
                },
                {
                    tag: 'top',
                    text: `For many people ${gameTrim}${game}${gameTrim} was one of the best games published in ${year}. Today the ${companyTrim}${company}${companyTrim}'s game turns ${yearsAgo} years old`
                },
                {
                    tag: 'top',
                    text: `A personal favorite, ${gameTrim}${game}${gameTrim}, was published today in ${year}. ${companyTrim}${company}${companyTrim} put out a great one.`
                },
                {
                    tag: 'top',
                    text: `What would you think is the best ${year} game? You might be thinking about ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim}. It was released on this day ${yearsAgo} years ago. Still fresh!`
                },
                {
                    tag: 'std',
                    text: `For ${companyTrim}${company}${companyTrim} is celebration day today. ${yearsAgo} years ago ${gameTrim}${game}${gameTrim} was released`
                },
                {
                    tag: 'std',
                    text: `In case you don't know which game to play today, remember that ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} turns ${yearsAgo} today`
                },
                {
                    tag: 'std',
                    text: `${companyTrim}${company}${companyTrim}'s gem, ${gameTrim}${game}${gameTrim}, is turning ${yearsAgo} today`
                },
                {
                    tag: 'last',
                    text: `This day last year ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} was released. Already a year!`
                },
                {
                    tag: 'adult',
                    text: `In some places today marks ${gameTrim}${game}${gameTrim} becoming an adult. Great memories after ${yearsAgo} years`
                },
                {
                    tag: 'drink',
                    text: `From now on, ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} is allowed to drink. ${yearsAgo} years passed by since it was released!`
                },
                {
                    tag: 'drink',
                    text: `${gameTrim}${game}${gameTrim} is not a teen anymore. ${yearsAgo} years ago ${companyTrim}${company}${companyTrim} published it.`
                },
                {
                    tag: 'std',
                    text: `Another birthday today! ${companyTrim}${company}${companyTrim}'s youngling ${gameTrim}${game}${gameTrim} turns ${yearsAgo} years today`
                },
                {
                    tag: 'std',
                    text: `${dayMonth} on ${year} was the release of ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim}`
                },
                {
                    tag: 'top',
                    text: `In the ${year}'s Top 3 game releases it's very likely you find ${gameTrim}${game}${gameTrim}. The ${companyTrim}${company}${companyTrim}'s pearl turns ${yearsAgo} today`
                },
                {
                    tag: 'top',
                    text: `One of the all time tops is getting older. ${yearsAgo} years ago ${companyTrim}${company}${companyTrim} published the great ${gameTrim}${game}${gameTrim}`
                },
                {
                    tag: 'top',
                    text: `Already a classic, ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} was published a day like today ${yearsAgo} years ago`
                },
                {
                    tag: 'std',
                    text: `It feels like yesterday, but ${gameTrim}${game}${gameTrim} by ${companyTrim}${company}${companyTrim} was released this day in ${year}`
                },
                {
                    tag: 'std',
                    text: `Fancy a sip of ${gameTrim}${game}${gameTrim}? Today marks ${yearsAgo} years since ${companyTrim}${company}${companyTrim} released it. Cheers to ${year}!`
                },
                {
                    tag: 'sqfav',
                    text: `Today marks ${yearsAgo} years since ${companyTrim}${company}${companyTrim} released ${gameTrim}${game}${gameTrim}. An all time favorite.`
                },
                {
                    tag: 'sqfav',
                    text: `${yearsAgo}!${yearsAgo}!${yearsAgo}! A very special birthday today. ${companyTrim}${company}${companyTrim}'s masterpiece ${gameTrim}${game}${gameTrim} was released a day like today in ${year}`
                },
                {
                    tag: 'anon',
                    text: `Fancy a sip of ${gameTrim}${game}${gameTrim}? Today marks ${yearsAgo} years since it was released. Cheers to ${year}!`
                },
                {
                    tag: 'anon',
                    text: `It feels like yesterday, but ${gameTrim}${game}${gameTrim} was released this day in ${year}. Still playing it.`
                },
                {
                    tag: 'anon',
                    text: `${dayMonth} on ${year} was the release of ${gameTrim}${game}${gameTrim}. Play it today!`
                },
                {
                    tag: 'anon',
                    text: `${dayMonth} on ${year} was the release of ${gameTrim}${game}${gameTrim}. Happy birthday!`
                },
                {
                    tag: 'anon',
                    text: `Another birthday today! Youngling ${gameTrim}${game}${gameTrim} turns ${yearsAgo} years today`
                },
                {
                    tag: 'anon',
                    text: `In case you don't know which game to play today, remember that ${gameTrim}${game}${gameTrim} turns ${yearsAgo} today`
                },
                {
                    tag: 'anon',
                    text: `Today marks ${yearsAgo} years since ${gameTrim}${game}${gameTrim} was released ${singlePlatform}. It was published in ${year}.`
                },
            ] 

            let redondos = [10, 20, 30, 40, 50];
            if (company == '') {
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'anon')
            }
            else if (redondos.includes(yearsAgo) && rel.ranking > 89) {
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'sqfav')
            } else if (yearsAgo == 1) {
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'last')
            } else if (yearsAgo == 18) {
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'adult')
            } else if (yearsAgo == 21) {
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'drink')
            } else if (rel.ranking > 90) {
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'top')
            } else if (yearsAgo > 25) { 
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'old')
            } else {
                textTemplateOptions = textTemplates.filter((template) => template.tag == 'std')
            }

            let textTemplate = textTemplateOptions[Math.floor(Math.random() * textTemplateOptions.length)].text;

            return textTemplate;
        }

        if (this.releases.length > 0) {
            console.log("entra");
            let publishPromises = await Promise.all(
                this.releases.slice(0, maxReleasesPerDay).map(async (rel, i) => {
                    let company = '';
                    let platforms = [];
                    if(rel.companies_full.length > 0) company = rel.companies_full[0].name;
                    if(rel.platforms_full.length > 0) {
                        platforms = rel.platforms_full.map((pl) => {
                            let pltext = '';
                            if (pl.abb) {
                                pltext = pl.abb;
                            } else {
                                pltext = pl.name
                            }
                            return pltext
                        })
                    }
    
                    let companyTag = '';
                    if(company != '') {
                        companyTag = formatStringTag(company);
                    }
                 
                    const gameTag = formatStringTag(rel.game);
                    let platformTag = '';
                    platforms.slice(0, 3).forEach((pl) => {
                        platformTag = platformTag + ' ' + formatStringTag(pl);
                    })
                    const stdTag = '#onthisdayreleased'
                    const url = 'https:' + rel.cover_full
    
                    console.log(url);
    
                    let tweet = buildText(rel, 'tw');
                    let telegramMessage = buildText(rel, 'te');
    
                    if (tweet.length + stdTag.length < maxLength) {
                        tweet = tweet + ' ' + stdTag
                    }
    
                    if (tweet.length + companyTag.length < maxLength) {
                        tweet = tweet + ' ' + companyTag
                    }
    
                    if (tweet.length + gameTag.length < maxLength) {
                        tweet = tweet + ' ' + gameTag
                    }
    
                    if (tweet.length + platformTag.length < maxLength) {
                        tweet = tweet + ' ' + platformTag
                    }
    
                    telegramMessage = telegramMessage + '\n' + ' ' + stdTag + ' ' + companyTag + ' ' + platformTag
    
                    console.log(tweet);
                    await this.tweetMe(tweet, url, i);
                    this.telegramMe(telegramMessage, url);
                    return true;
                })
            )
        }
    }


    async publish () {
        this.getReleases();
        console.log("today");
        console.log(this.releases);

        await this.fetchExtraInfo();

        if(updatable == true || forceUpdate == true) this.updateReleases() 

        this.filterExcluded();

        this.trimExceededMaximum();

        this.publishReleases();
    }
}



