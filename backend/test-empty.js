const http = require('http');
const boundary = '--------------------------123456789012345678901234';
const fileData = Buffer.from('Campaign Name,Date,Region,Spend,Impressions,Platform,Campaign ID\n');
const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="empty.csv"\r\nContent-Type: text/csv\r\n\r\n'),
    fileData,
    Buffer.from('\r\n--' + boundary + '--\r\n')
]);
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
