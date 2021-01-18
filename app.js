const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const options = require('./config/config.js');
 
const app = express();
const id = options.igid;
const sec = options.igsec;
 
app.use(morgan('tiny'));
app.use(cors());
app.use(bodyParser.json());

const authIGDb = async () => {
    console.log("wea");
    const path = 'https://id.twitch.tv/oauth2/token?client_id='+id+'&client_secret='+sec+'&grant_type=client_credentials';
    let authInfo;
    axios.post(path).then( 
        (response) => { 
            var authInfo = response.data; 
            axios.defaults.headers.common = {'Authorization': `bearer ${authInfo.access_token}`}
            console.log(authInfo); 
        }, 
        (error) => { 
            console.log(error); 
        } 
    );
    
    return authInfo;
}

const requestToIGDb = async () => {
    
}

async function auth () {
    console.log("wea");
    const path = 'https://id.twitch.tv/oauth2/token?client_id='+id+'&client_secret='+sec+'&grant_type=client_credentials';
    
    let authInfo = await axios.post(path).then( 
        (response) => { 
            console.log(response.data);
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


/*     axios.defaults.headers.common['Authorization'] = 'Bearer ' + authInfo.access_token;
    axios.defaults.headers.common['Client-ID'] = id;
    axios.defaults.headers.common['Accept'] = 'application/json'; */

    const query = 'https://api.igdb.com/v4/age_ratings'

    const params = new URLSearchParams([['fields', 'rating_cover_url']]);

    axios({
        url: query,
        method: 'POST',
        headers: myHeaders,
        data: "fields category,checksum,content_descriptions,rating,rating_cover_url,synopsis;"
      })
        .then(response => {
            console.log(response.data);
        })
        .catch(err => {
            console.error(err);
    });
}

auth();
 
app.get('/', (req, res) => {
    console.log("hey");
    res.json({
        message: 'Behold The MEVN Stack!'
    });
});
 
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
    //await authIGDb();
    //auth();
});
