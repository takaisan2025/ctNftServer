const fs = require("fs");

function readFile(fileName) {

    var data = fs.readFileSync(fileName, 'utf-8');
    console.log(data);
    return data;
}

function writeFile(fileName, content) {

    var data = fs.writeFileSync(fileName, JSON.stringify(content));
    console.log(data);
    return data;
}

// readFile("DreamScoreHistory.json");
// writeFile("DreamScoreHistory.json", JSON.stringify({
//     "blockNumber": 0
// }));

module.exports = {
    readFile,
    writeFile,
};
