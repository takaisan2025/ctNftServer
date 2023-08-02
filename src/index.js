const throng = require('throng')

const {createHttpServer} = require('./httpServer')
const {createSocketServer} = require('./socketServer')
const API = require('./api')
const {db} = require('./db')

const {publisher, redis, subscriber} = require('./redisClient')

const socketServer = createSocketServer()
const httpServer = createHttpServer(socketServer)

function start() {
    const port = Number(process.env.PORT) || 3004

    const api = new API(
        socketServer,
        db,
        httpServer,
        redis,
        subscriber,
        publisher
    )

    api.start(port).then(() => {
        console.log('Successfully started server.')
    })
}

const WORKERS = process.env.WEB_CONCURRENCY
    ? Number(process.env.WEB_CONCURRENCY)
    : 1
throng({
    worker: start,
    count: WORKERS,
    lifetime: Infinity,
})
