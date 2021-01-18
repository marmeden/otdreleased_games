const cheerio = require("cheerio");
const axios = require("axios").default;
var release = require('./models/Release.js');
const mainconfig = require('./config/config.js');


const rymurl = mainconfig.url;
const finalYear = 2019;
const initialYear = 1990;
const topX = 120;
const perPage = 40;
const yearsArray = Array.from({length: finalYear - initialYear + 1}, (_, i) => i + initialYear);

const fetchHtml = async url => {
    try {
      const { data } = await axios.get(url);
      return data;
    } catch {
      console.error(`ERROR: An error occurred while trying to fetch the URL: ${url}`);
    }
};


const extractAlbum = selector => {
    const album = selector
        .find(".topcharts_textbox_top")
        .find(".topcharts_item_title > a")
        .text()
        .trim();
  
    const releaseDate = selector
        .find(".topcharts_textbox_top")
        .find(".topcharts_item_releasedate")
        .text()
        .trim();

    const band = selector
        .find(".topcharts_item_artist")
        .find("a")
        .text()
        .trim();

    const ranking = parseInt(selector.attr("id").replace(/pos/g,''));

    const genreTags = selector
        .find(".topcharts_item_genres_container")
        .find("span")
        .text()
        .trim()
    
    const tags = genreTags.split(", ");

    const cover = selector
        .find(".topcharts_item_art")
        .attr("src")
  
    return {
      album,
      band,
      releaseDate,
      ranking,
      tags,
      cover
    };
};

const singleScraping = async (url) => {
    const html = await fetchHtml(url);
    const selector = cheerio.load(html);

    const releaseResults = selector("body").find(
        ".chart_item_release"
    );

    const albums = releaseResults.map((i, el) => {
        const elementSelector = selector(el);
        let myrelease = new release(extractAlbum(elementSelector))
        myrelease.save();
        return myrelease;
    })

    return albums
}

const scrapRYM = async () => {
    console.log("hey");
    //console.log(yearsArray);
    let temp = "";


    /* BULK SCRAP  */
    // FALTA 1997
    /*     const myPromises = [];

    yearsArray.forEach(async (year) => {
        for (let i = 0; i < (topX/perPage); i++) {
            let tail = "/" + (i + 1) + "/";
            let rymURLBuilt = rymurl + year + tail;
            temp = rymURLBuilt;
            console.log(rymURLBuilt);
            console.log("Fetching " + year + "page " + (i + 1));
            let urlRelease = await singleScraping(rymURLBuilt);
            myPromises.push(urlRelease);
        }
    }) */   

    // Fetch each year
    let tail = "/" + (3 + 1) + "/";
    let rymURLBuilt = rymurl + 2020 + tail;
    temp = rymURLBuilt;
    console.log(temp);
    const html = await fetchHtml(temp);
    const selector = cheerio.load(html);

    const releaseResults = selector("body").find(
        ".chart_item_release"
    );

    const albums = releaseResults
        .map((i, el) => {
            const elementSelector = selector(el);
            let myrelease = new release(extractAlbum(elementSelector))
            myrelease.save();
            return myrelease;
        })
        .get();
}

scrapRYM();