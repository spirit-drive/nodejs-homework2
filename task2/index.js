const http = require('http');
const port = 3001;
const getDateToUTC = () => (new Date).toUTCString();

const {INTERVAL = 1000, TIMEOUT = 5000} = process.env;

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url !== '/favicon.ico') {
        const intervalID = setInterval(() => console.log(getDateToUTC()), INTERVAL);
        setTimeout(() => {
            clearInterval(intervalID);
            res.end(getDateToUTC());
        }, TIMEOUT)

    }
});

server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});