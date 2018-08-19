const http = require('http');
const port = 3000;
const getDateToUTC = () => (new Date).toUTCString();

const [interval = 1000, timeout = 5000] = process.argv.slice(2);

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url !== '/favicon.ico') {
        const intervalID = setInterval(() => console.log(getDateToUTC()), interval);
        setTimeout(() => {
            clearInterval(intervalID);
            res.end(getDateToUTC());
        }, timeout)

    }
});

server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});