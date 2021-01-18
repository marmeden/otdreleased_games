const axios = require("axios").default;
var platform = require('./models/Platform.js');
const mainconfig = require('./config/config.js');
const auther = require('./auth.js')

const urlPlatform = mainconfig.url + "platforms";


const fetchAllPlatforms = async () => {
    const myHeaders = await auther.authMe()
    const options = {
        method: 'POST',
        url: urlPlatform,
        headers: myHeaders,
        data: 'fields *;\n sort created_at asc;\n limit 100;'
    };

    let platforms = await axios(options).then( 
        (response) => { 
            return response.data 
        }, 
        (error) => { 
            console.log(error); 
        } 
    );

    console.log(platforms);

    const myPlatforms = platforms.map((el, i) => {
        let myPlatform = new platform(el);
        myPlatform.save();
        return myPlatform
    })

}

fetchAllPlatforms();