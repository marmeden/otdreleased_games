const axios = require("axios").default;
var company = require('./models/Company.js');
const mainconfig = require('./config/config.js');
const auther = require('./auth.js')

const urlCompany = mainconfig.url + "companies";
const urlCountry = mainconfig.url + "companies";


const fetchAllCompanies = async () => {
    const myHeaders = await auther.authMe()
    const options = {
        method: 'POST',
        url: urlCompany,
        headers: myHeaders,
        data: 'fields *;\n sort created_at asc;\n limit 100;'
    };

    let companies = await axios(options).then( 
        (response) => { 
            return response.data 
        }, 
        (error) => { 
            console.log(error); 
        } 
    );

    const myCompanies = companies.map((el, i) => {
        let myCompany = new company(el);
        myCompany.save();
        return myCompany
    })

}

fetchAllCompanies();