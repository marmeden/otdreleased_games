var moment = require('moment');
const fs = require('fs');
const path = require('path');

module.exports = class Release {
    constructor(relObj) {
        this.album = relObj && relObj.album || '---'
        this.band = relObj && relObj.band || '---'
        this.releaseDate = relObj && relObj.releaseDate || '---';
        this.year = parseInt(moment(this.releaseDate, "D MMMM YYYY").format('YYYY'));
        this.tags = relObj && relObj.tags || [];
        this.ranking = relObj && relObj.ranking || -1;
        this.cover = relObj && relObj.cover || '---';
    }
    // Getter
    get entry() {
        return this.buildEntry();
    }
    // Method
    buildEntry() {
        return this.name + ' hey';
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

        let warePath = '../warehouse/'+moment(this.releaseDate, "D MMMM YYYY").format('M')+'-'+moment(this.releaseDate, "D MMMM YYYY").format('MMM')+'/'+moment(this.releaseDate, "D MMMM YYYY").format('D')+'.json';
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
        if (myData.findIndex((oldRel) => oldRel.cover == this.cover) == -1) {
            myData.push(this);
        }

        myData = JSON.stringify(myData, null, 2);
        fs.writeFileSync(wareFullMounted, myData);
    }
}