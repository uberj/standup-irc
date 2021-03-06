var _ = require('underscore');
var http = require('http');
var events = require('events');

var request = function(path, method, data, emitter) {
    if (data === undefined) {
        data = {};
    }
    var body = JSON.stringify(data);
    var options = {
        host: config.standup.host,
        port: config.standup.port,
        path: path,
        method: method,
        headers: {
            'content-type': 'application/json',
            'content-length': body.length
        }
    };

    if (emitter === undefined) {
        emitter = new events.EventEmitter();
    }
    // Make the request
    var req = http.request(options, function(res) {
        var resp_data = "";
        // Read data as it comes in
        res.on('data', function(chunk) {
            resp_data += chunk;
        });
        // When we have received the entire response
        res.once('end', function() {
            if (res.statusCode === 200) {
                var json = JSON.parse(resp_data);
                emitter.emit('ok', json);
            } else if (res.statusCode === 301) {
                request(res.headers.location, method, data, emitter);
            } else {
                emitter.emit('error', res.statusCode, resp_data);
            }
        });
    });
    req.end(body);
    req.once('error', function(e) {
        logger.error(options.host + ':' + options.port + options.path +
                     ': ' + JSON.stringify(data));
        emitter.emit('error', String(e));
    });

    return emitter;
}

exports.request = request;

exports.ifAuthorized = function(user, channel, callback) {
    var a = authman.checkUser(user);

    a.once('authorization', function(trust) {
        if (trust) {
            callback();
        } else {
            client.say(channel, "I don't trust you, " + user + ", " +
                                "are you identified with nickserv?");
        }
    });

    return a;
};

exports.escapeRegExp = function(str) {
    return str.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

/* Parse things like quotes strings from an argument list. */
exports.parseArgs = function(argList) {
    var args = [];
    var argBuilder = "";
    var quote = "";
    _.each(argList, function(arg) {
        if (argBuilder) {
            argBuilder += ' ' + arg;
            if (arg.slice(-1) === quote) {
                argBuilder = argBuilder.slice(0, -1);
                args.push(argBuilder);
                argBuilder = "";
                quote = "";
            }
        } else {
            if (arg[0] === "'") {
                quote = "'";
            } else if (arg[0] === '"') {
                quote = '"';
            }
            if (quote) {
                if (arg.slice(-1) === quote) {
                    args.push(arg.slice(1,-1));
                    quote = '';
                } else {
                    argBuilder = arg.slice(1);
                }
            } else {
                args.push(arg);
            }
        }
    });
    return args;
}
