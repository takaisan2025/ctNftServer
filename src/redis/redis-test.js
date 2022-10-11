const {
    getString,
    setString,
    removeString,
    rpush,
    lrange,
    lrem,
} = require('./redis-client');
// console.log(setString("aa",10).then(r=>console.log(r)))
// console.log(setString("aa",10,10).then(r=>console.log(r)))
// console.log(getString("aa").then(r=>console.log(r)))