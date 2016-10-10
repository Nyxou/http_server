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