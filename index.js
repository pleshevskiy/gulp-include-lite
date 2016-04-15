var Transform = require('stream').Transform;
var fs   = require('fs');
var path = require('path');
var EOL  = require('os').EOL;

var patterns = {
    js: /^([\s\t]*)(?:\/\/\s*)\+include ([^\s\n\t]+)/gm,
    css: /^([\s\t]*)(?:\/\*\s*)\+include ([^\s\n\t]+)\s*\*\//gm
};

module.exports = function() {
    // Monkey patch Transform or create your own subclass,
    // implementing `_transform()` and optionally `_flush()`
    var transformStream = new Transform({objectMode: true});
    /**
     * @param {Buffer|string} file
     * @param {string=} encoding - ignored if file contains a Buffer
     * @param {function(Error, object)} callback - Call this function (optionally with an
     *          error argument and data) when you are done processing the supplied chunk.
     */
    transformStream._transform = function(file, encoding, callback) {
        var fileConfig = {
            content: file.contents + '',
            dir: path.dirname(file.path),
            ext: path.extname(file.path)
        };

        var currentRegExp = getCurrentRegExp(fileConfig);

        checkComplete();

        function checkComplete(err) {
            if (err) {
                console.log(err);
            }

            var _match = currentRegExp.exec(fileConfig.content);

            if (_match != null) {
                includeFileContent(_match, fileConfig, checkComplete);
                return;
            }

            file.contents = new Buffer(fileConfig.content);
            callback(err, file);
        }
    };

    return transformStream;
};


function includeFileContent(_match, fileConfig, next) {
    var fileBasename = path.basename(_match[2]);

    if (fileBasename.indexOf('.') === -1) {
        fileBasename += fileConfig.ext;
    }

    var filepath = path.join(fileConfig.dir, path.dirname(_match[2]), '_' + fileBasename);
    var whiteSpace = _match[1];

    fs.readFile(filepath, 'utf8', function (err, data) {
        if (err) {
            console.log(err);
            next(err);
            return;
        }

        var lines = data.split(EOL);
        lines.forEach(function (value, i) {
            lines[i] = whiteSpace + value;
        });
        fileConfig.content = fileConfig.content.replace(_match[0], function () { return lines.join(EOL); });
        next();
    });
}


function getCurrentRegExp(fileConfig) {
    var p = patterns[fileConfig.ext.slice(1)];
    p.index = 0;
    return p;
}