// redis.js
const redis = require('redis')
const path = require('node:path')
require('dotenv').config({path: path.resolve(__dirname, '../../.env')})
const redisPassword = process.env.REDIS_PASSWORD
if (!redisPassword) throw new Error('REDIS_PASSWORD is required')
const client = redis.createClient(6379, '127.0.0.1', {auth_pass: redisPassword})

// 配置redis的监听事件
// 准备连接redis-server事件
client.on('ready', function () {
    console.log('Redis client: ready')
})

// 连接到redis-server回调事件
client.on('connect', function () {
    console.log('redis is now connected!')
})

client.on('reconnecting', function () {
    console.log('redis reconnecting')
})

client.on('end', function () {
    console.log('Redis Closed!')
})

client.on('warning', function () {
    console.log('Redis client: warning')
})

client.on('error', function (err) {
    console.error('Redis Error ' + err)
})

// 导出redis-client对象
module.exports = client
