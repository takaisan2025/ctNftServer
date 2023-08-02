const Redis = require('redis')

const redisUrl = process.env.REDIS_URL || 'redis://0.0.0.0:6379'
const redisUseTLS = redisUrl.includes('rediss')

const redis = Redis.createClient({
    url: redisUrl,
    socket: {
        tls: redisUseTLS,
        rejectUnauthorized: false,
    },
}).on('error', (err) => console.log('Redis Client Error', err))

const subscriber = Redis.createClient({
    url: redisUrl,
    socket: {
        tls: redisUseTLS,
        rejectUnauthorized: false,
    },
}).on('error', (err) => console.log('Redis Subscriber Error', err))

const publisher = Redis.createClient({
    url: redisUrl,
    socket: {
        tls: redisUseTLS,
        rejectUnauthorized: false,
    },
}).on('error', (err) => console.log('Redis Publisher Error', err))

module.exports = {
    redis, subscriber, publisher
};

