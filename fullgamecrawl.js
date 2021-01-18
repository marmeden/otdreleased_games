const axios = require("axios").default;
var moment = require('moment');
var release = require('./models/Release.js');
const mainconfig = require('./config/config.js');
const auther = require('./auth.js')

const urlGame = mainconfig.url + "games";


const yearIni = parseInt(moment(new Date()).format('YYYY')) - 1;
const yearFinal = parseInt(moment(new Date()).format('YYYY'));
//const yearIni = 2020;
//const yearFinal = 2022;

const numFetch = 120;
const thresHoldRating = 80;
const saveIt = true;

let myHeaders;
let myOptions;


const fetchYearGames = async (ini, fin) => {
    myOptions = {
        method: 'POST',
        url: urlGame,
        headers: myHeaders,
        data: 'fields name, rating, rating_count, total_rating, total_rating_count, release_dates,first_release_date, release_dates, follows, platforms, cover, involved_companies, franchise;\n sort total_rating desc;\n where involved_companies != null & rating != null & total_rating > '+thresHoldRating+' & total_rating_count > 0 & first_release_date > '+ini+' & first_release_date < '+ fin +';\nlimit '+numFetch+';\n'
    };

    let games = await axios(myOptions).then( 
        (response) => { 
            return response.data 
        }, 
        (error) => { 
            console.log(error); 
        } 
    );

    return games

}

const fetchAllGames = async () => {
    function toUnix(year) {
        return moment(""+year+"-01-01", "YYYY-MM-DD", true).unix()
    }

    let head = await auther.authMe();
    console.log(head);
    myHeaders = head;

    const allGames = [];

    for(let i = yearIni; i < yearFinal + 1; i++) {
        console.log(i);
        let ini = toUnix(i);
        let fin = toUnix(i + 1);
        console.log(ini);
        console.log(fin);

        const yearGames = await fetchYearGames(ini, fin);
        allGames.push(yearGames);
    }

    return allGames;

}

const theFetch = async () => {
    const myGames = await fetchAllGames();
    console.log(myGames.length);

    if(saveIt) {
        myGames.flat().forEach((game) => {
            let myGameObj = {
                "id": game && game.id || '---',
                "game": game && game.name || '---',
                "company": game && game.involved_companies || [],
                "releaseDate": game && moment.unix(game.first_release_date).format("D MMMM YYYY") || '---',
                "cover": game && game.cover || '---',
                "platforms": game && game.platforms || [],
                "rating": game && game.total_rating || '---',
                "rating_count": game && game.total_rating_count || '---',
            }
            let myGame = new release(myGameObj);
            myGame.save();
            return myGame
        })
    }
}

theFetch();
