#! /usr/bin/env node
const ramda = require('ramda');
const https = require('https');
const http = require('http');
const url = require('url');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({});
let mockData;
let mockFn = (url, params, mock) => mock;
let responseMode;
let server = null;

const httpModes = {
    error: {
        statusCode: 202,
        status: 'Error'
    },
    success: {
        statusCode: 200,
        status: 'Ok'
    }
};

exports.startServer = function (options) {
    const { port = 5050, mode = 'success', api } = options;
    responseMode = mode;
    if (!api) {
        throw new Error('no api url provided');
    }

    function start() {
        server = http.createServer((req, res) => {
            mock(req, res, () => {
                proxy.web(req, res, {
                    agent: https.globalAgent,
                    headers: { host: url.parse(api).host },
                    target: api
                })
            });
        });

        console.log(`listening on port ${port}.\n API (${api}).`);
        server.listen(port);
    }

    if (server) {
        server.close(start);
    } else {
        start();
    }

};

exports.setMockData = function (data) {
    mockData = data;
};


function methodPath(url) {
    return url.split('?')[0].split('/').filter(x => x);
}

function getReqParams(request) {
    return new Promise(resolve => {
        if (request.method === 'POST') {
            let body = '';

            request.on('data', data => body += data);

            request.on('end', () => {
                try {
                    return resolve(JSON.parse(body));
                } catch (e) {
                    console.error(body);
                    resolve('');
                }
            });

        } else {
            resolve('');
        }
    });
}

function mock(request, response, next) {
    const result = ramda.path(methodPath(request.url), mockData);

    if (!result) {
        next();
        return;
    }

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    response.setHeader('Access-Control-Allow-Headers', '*');
    response.setHeader('Content-Type', 'application/json');

    if (request.method === 'OPTIONS') {
        response.writeHead(httpModes[responseMode].statusCode);
        response.end();
    } else {
        getReqParams(request).then(params => {
            response.writeHead(httpModes[responseMode].statusCode);
            response.end(JSON.stringify({
                payload: mockFn(request.url, params, result),
                status: httpModes[responseMode].status
            }))
        })
            .catch((e) => {
                console.error('getReqParams error', e)
            });
    }

    console.log(`info: ${request.url} has been proxied`);
}
