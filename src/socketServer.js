// SPDX-License-Identifier: BUSL-1.1
const mws = require('ws')
const {randomUUID} = require('crypto')

const createSocketServer = () => {
    const wss = new mws.Server({noServer: true})

    async function onWsConnection(ws, req) {
        Object.assign(ws, {
            uuid: randomUUID(),
            isAlive: true,
            marketSubscriptions: [],
            chainId: null,
            userId: null,
            origin: req?.headers?.origin,
        })

        console.log('New connection', req.socket.remoteAddress)

        ws.on('pong', () => {
            ws.isAlive = true
        })

        ws.on('message', (json) => {
                let msg
                try {
                    msg = JSON.parse(json)
                    if (typeof msg.op === 'string' && Array.isArray(msg.args)) {
                        if (
                            ![
                                'indicateliq2',
                                'submitorder2',
                                'submitorder3',
                                'submitorder4',
                                'subscribemarket',
                                'ping',
                            ].includes(msg.op)
                        ) {
                            console.log(`WS[${ws.origin}]: %s`, json)
                        } else if (['submitorder2', 'submitorder3', 'submitorder4'].includes(msg.op)) {
                            console.log(`WS[${ws.origin}]: {"op":${msg.op},"args":[${msg.args[0]},${msg.args[1]}, "PerpMessage"]}`)
                        }

                        const debugLog = setTimeout(() => console.log(`Failed to process ${msg.op}, arg: ${msg.args} in under 5 seconds.`), 5000)
                        if (wss.api) {
                            const res = wss.api.serviceHandler(msg, ws)
                            clearTimeout(debugLog)
                            return res
                        }
                    }
                } catch (err) {
                    console.log(err)
                }

                return null
            }
        )

        ws.on('error', console.error)
    }

    wss.on('connection', onWsConnection)
    wss.on('error', console.error)

    return wss
}
module.exports = {
    createSocketServer
};
