// redis-client.js
// 引用redisClient对象
const redisClient = require('./redis')
const redisPrefix = require('./redis-prefix.json').REDIS_GLOBAL_PREFIX
/**
 * redis setString function
 * @param key
 * @param value
 * @param expire
 */
const setString = (key, value, expire) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.set(key, value, function (err, result) {
            if (err) {
                reject(err)
            }

            if (!isNaN(expire) && expire > 0) {
                redisClient.expire(key, parseInt(expire))
            }
            resolve(result)
        })
    })
}

/**
 * redis getString function
 * @param key
 */
const getString = (key) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.get(key, function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}
const getKeys = (key) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.keys(key, function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}

/**
 * redis removeString function
 * @param key
 */
const removeString = (key) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.get(key, function (err, result) {
            if (err) {
                reject(err)
            }
            redisClient.expire(key, parseInt(-1))
            resolve(result)
        })
    })
}

// rpush 将给定值推入列表的右端 返回值 当前列表长度
const lpop = (key) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.lpop(key, function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}
// rpush 将给定值推入列表的右端 返回值 当前列表长度
const rpush = (key, token) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.rpush(key, [token], function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}
// 查询list的值
const lrange = (key, startIndex = 0, stopIndex = -1) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.lrange(key, startIndex, stopIndex, function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}
// 清除list中n个值为value的项
const lrem = (key, n = 1, value) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.lrem(key, n, value, function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}
const pttl = (key) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.pttl(key, function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}


module.exports = {
    getString,
    setString,
    removeString,
    lpop,
    rpush,
    lrange,
    lrem,
    pttl,
    getKeys
}

