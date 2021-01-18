var moment = require('moment');
const fs = require('fs');
const path = require('path');

module.exports = class Company {
    constructor(companyObj) {
        this.id = companyObj && companyObj.id || '---'
        this.name = companyObj && companyObj.name || '---'
        this.slug = companyObj && companyObj.slug || '---'
        this.country = companyObj && companyObj.country || '---'
        this.logo = companyObj && companyObj.logo || '---'
    }

    save() {
        function ensureDirectoryExistence(filePath) {
            var dirname = path.dirname(filePath);
            if (fs.existsSync(dirname)) {
                return true;
            }
            ensureDirectoryExistence(dirname);
            fs.mkdirSync(dirname);
            
            return false;
        }

        let warePath = '../dictionaries/companies.json';
        let wareFullMounted = path.join(__dirname + '/', warePath);
        const dirExist = ensureDirectoryExistence(wareFullMounted);

        let myData = [];

        if (dirExist) {
            if (fs.existsSync(wareFullMounted)) {
                const data =  fs.readFileSync(wareFullMounted);
                const old = JSON.parse(data);
                myData = old; 
            } 
        }
        
        // ENSURE THE ITEM IS NOT ALREADY THERE
        if (myData.findIndex((oldRel) => oldRel.id == this.id) == -1) {
            myData.push(this);
        }

        myData = JSON.stringify(myData, null, 2);
        fs.writeFileSync(wareFullMounted, myData);
    }
}