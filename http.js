net = require('net');
fs = require('fs');

var AUTHORIZED_METHODS = ['GET'];
var AUTHORIZED_VERSIONS = ['HTTP/1.0', 'HTTP/1.1'];

function parseRequest(str) {
	var lines = str.trim().split('\r\n');
	var requestLine  = lines.shift().split(' ');

	var request = {
		method: requestLine[0],
		uri: requestLine[1],
		version: requestLine[2]
	};

	var headers = {};
	lines.forEach(function(line) {
		var tmp = line.split(':').map(function(elem) {
			return elem.trim();
		});
		headers[tmp[0]] = tmp[1];
	});

	request['headers'] = headers;

	return request;
}

function checkMethodRequest(method) {
	return AUTHORIZED_METHODS.indexOf(method) !== -1;
}

function checkVersionProcotolRequest(version) {
	return AUTHORIZED_VERSIONS.indexOf(version) !== -1;
}

function serializeResponse(version, code, reason, headers) {
	var response = [];

	var statusLine = version + ' ' + code + ' ' + reason; 

	response.push(statusLine);

	var keys = Object.keys(headers);
	for (var x = 0; x < keys.length; x++) {
		response.push(keys[x] + ': ' + headers[keys[x]]);
	}

	response.push('');
	response.push('');

	return response.join('\r\n');
}

function checkHeadersRequest(headers, request) {
	var extension = request.uri.split('.').pop();
	if (headers['Accept'] !== null && headers['Accept'] === 'text/html' && extension === 'html') {
		return true;
	}
	return false;
}

net.createServer(function (socket) {
	console.log('Connected !');

	var request = '';

	socket.on('data', function (buf) {
		request += buf.toString();

		if (request.indexOf('\r\n\r\n') === -1) {
			return;
		}

		var requestHeadLength = request.indexOf('\r\n\r\n') + 4;
		var requestHead = request.substring(0, requestHeadLength);

		var parsedRequest = parseRequest(requestHead);
		var method = parsedRequest['method'];
		var version = parsedRequest['version'];
		var headers = parsedRequest['headers'];

		console.log(parsedRequest);


		if (!checkMethodRequest(method)) {
			var code = 405;
			var reason = 'Method Not Allowed';
			var body = 'toto';
			var headers = {
				'Content-Type': 'text/html',
				'Content-Length': body.length
			};		

			var response = serializeResponse(version, code, reason, headers);
			socket.write(response);
			request = '';
			return;
		}

		if (!checkVersionProcotolRequest(version)) {
			var code = 505;
			var reason = 'HTTP Version Not Supported';
			var body = 'toto';
			var headers = {
				'Content-Type': 'text/html',
				'Content-Length': body.length
			};		

			var response = serializeResponse(version, code, reason, headers);
			socket.write(response);
			request = '';
			return;	
		}

		if (!checkHeadersRequest(headers, parsedRequest)) {
			var code = 406;
			var reason = 'Not Acceptable';
			var body = 'toto';
			var headers = {
				'Content-Type': 'text/html',
				'Content-Length': body.length
			};		

			var response = serializeResponse(version, code, reason, headers);
			socket.write(response);
			request = '';
			return;
		}

		var code = 200;
		var reason = 'OK';
		var body = '';
		
		var filename = '.' + parsedRequest.uri;
		try {
			var stat = fs.statSync(filename);
		} catch (e) {
			filename = '404.html';
			code = 404;
			reason = 'NOT FOUND';
			var stat = fs.statSync(filename);
		}

		var size = stat.size;
		var headers = {
			'Date': new Date(),
			'Content-Type': 'text/html',
			'Content-Length': size,
			'Connection': 'close'
		};
		
		
		var response = serializeResponse(version, code, reason, headers);
		socket.write(response, function() {
			var stream = fs.createReadStream(filename);
			stream.pipe(socket, {end: false});
			request = '';
		});			
		
	});

	socket.on('end', function() {
		console.log('User disconnected !');
	});
}).listen(8089);


/*if (request.substring(request.length - 4, request.length) === '\r\n\r\n') {
			lines = request.toString().split('\r\n');

			line_protocol = lines[0].split(' ');
			line_accept = lines[1].split(' : ');
			line_modified = lines[2].split(' : ');
			line_user_agent = lines[3].split(' : ');

			if (line_protocol[0] === 'GET') {
				if (line_protocol[2] === 'HTTP/1.1' || line_protocol[2] === 'HTTP/1.0') {
					file = line_protocol[1].replace(/(\n|\r)+$/, '');
					if (line_accept[1] === 'text/html' && file.split('.')[2] === 'html') {
						console.log('Commange GET recue!');
						error_code = '200 OK';
						fs.readFile(file, 'utf8', function (err,contentFile) {
							if (err) {
							//	error_code = '500 Internal Server Error';
								error_code = '404 Page Not Found';
								socket.write('\r\n');
								socket.write(line_protocol[2].replace(/(\n|\r)+$/, '') + ' ' + error_code + ' \r\n');
								stats = fs.statSync('404.html');
								socket.write('Content-Length : ' + stats['size'] + '\r\n');
								socket.write('Content-Type : text/html\r\n');
								socket.write('Date : ' + new Date() + '\r\n');
							} else { 
								socket.write('\r\n');
								socket.write(line_protocol[2].replace(/(\n|\r)+$/, '') + ' ' + error_code + ' \r\n');
								socket.write('Date :' + new Date() + '\r\n');
								socket.write('Content-Type : text/html\r\n');
								stats = fs.statSync(file);
								socket.write('Content-Length : ' + stats['size'] + '\r\n');
								socket.write('Last Modified : ' + new Date() + '\r\n');
								socket.write(contentFile);
							}
						});
					} else {
						error_code = '505 HTTP Version Not Supported';
						socket.write(line_protocol[2].replace(/(\n|\r)+$/, '') + ' ' + error_code + ' \r\n');					
					}
				} else {
					error_code = '505 HTTP Version Not Supported';
					socket.write(line_protocol[2].replace(/(\n|\r)+$/, '') + ' ' + error_code + ' \r\n');
				}
			}
		}*/