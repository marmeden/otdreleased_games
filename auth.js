const axios = require("axios").default;
const mainconfig = require('./config/config.js');

const id = mainconfig.igid;
const sec = mainconfig.igsec;

const path = 'https://id.twitch.tv/oauth2/token?client_id='+id+'&client_secret='+sec+'&grant_type=client_credentials';

exports.authMe = async () => {
    let authInfo = await axios.post(path).then( 
        (response) => { 
            return response.data 
        }, 
        (error) => { 
            console.log(error); 
        } 
    );

    const myHeaders = {
        'Accept': 'application/json',
        'Client-ID': id,
        'Authorization': 'Bearer ' + authInfo.access_token,
    }

    return myHeaders;
}

