const http = require('http');
const boundary = '123';
const body = '--123\r\nContent-Disposition: form-data; name="file"; filename="bad.csv"\r\nContent-Type: text/csv\r\n\r\ncorrupted data\r\n--123--';
const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/upload',
    method: 'POST',
    headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
    }
}, res => {
    console.log('STATUS:', res.statusCode);
    res.on('data', d => process.stdout.write(d));
    console.log();
});
req.on('error', e => console.error(e.message));
req.write(body);
req.end();
