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
        if (typeof expire === 'number' && isFinite(expire) && expire > 0) {
            redisClient.set(key, value, 'EX', expire, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        } else {
            redisClient.set(key, value, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        }
    });
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
        const script = `
            local value = redis.call("get", KEYS[1])
            if value then redis.call("del", KEYS[1]) end
            return value
        `;
        redisClient.eval(script, 1, key, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
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
const spop = (key) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.spop(key, function (err, result) {
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
// rpush 将给定值推入列表的右端 返回值 当前列表长度
const sadd = (key, token) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.sadd(key, token, function (err, result) {
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
}// 查询list的值
const srange = (key, startIndex = 0, stopIndex = -1) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.smembers(key, function (err, result) {
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
// 清除list中n个值为value的项
const srem = (key, n = 1, value) => {
    key = redisPrefix + key;
    return new Promise((resolve, reject) => {
        redisClient.srem(key, n, value, function (err, result) {
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
// Redis v3 command methods return whether the command was queued. The lock
// decision must use the server reply delivered to the callback.
function setLock(key, value, ttl) {
    return new Promise((resolve, reject) => {
        redisClient.set(key, value, 'NX', 'PX', ttl, (err, result) => {
            if (err) return reject(err);
            resolve(result === 'OK');
        });
    });
}

function releaseLock(key, value) {
    const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    `;
    return new Promise((resolve, reject) => {
        redisClient.eval(script, 1, key, value, (err, result) => {
            if (err) return reject(err);
            resolve(result === 1);
        });
    });
}

function renewLock(key, value, ttl) {
    const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
    else
        return 0
    end
    `;
    return new Promise((resolve, reject) => {
        redisClient.eval(script, 1, key, value, ttl, (err, result) => {
            if (err) return reject(err);
            resolve(result === 1);
        });
    });
}
// 小sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


module.exports = {
    sleep,
    setLock,
    releaseLock,
    renewLock,
    getString,
    setString,
    removeString,
    lpop,
    rpush,
    lrange,
    lrem,
    sadd,
    spop,
    srem,
    pttl,
    srange,
    getKeys
}
