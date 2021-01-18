var moment = require('moment');
const fs = require('fs');
const path = require('path');

module.exports = class Platform {
    constructor(platObj) {
        this.id = platObj && platObj.id || '---'
        this.name = platObj && platObj.name || '---'
        this.abb = platObj && platObj.abbreviation || '---'
        this.slug = platObj && platObj.slug || '---'
        this.generation = platObj && platObj.generation || '---'
        this.logo = platObj && platObj.platform_logo || '---'
        this.release = platObj && platObj.created_at || '---'
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

        let warePath = '../dictionaries/platforms.json';
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