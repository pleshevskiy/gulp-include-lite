var Transform = require('stream').Transform;
var fs   = require('fs');
var path = require('path');
var data = require('gulp-data');

patterns = {
    js: [
        /^([\s\t]*)(?:\/\/\s*)\+include ([\w_/\\\-]+)/,
        /^([\s\t]*)(?:\/\/\s*)\+include .+$/gm
    ],
    css: [
        /^([\s\t]*)(?:\/\*\s*)\+include ([\w_/\\\-]+)\s*\*\//,
        /^([\s\t]*)(?:\/\*\s*)\+include .+\s*\*\/$/gm
    ]
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

        var matchList = (fileConfig.content).match(getCurrentRegExp(fileConfig, true));
        if (matchList == null) {
            callback(undefined, file);
            return;
        }

        var count = 0;
        for (var i = 0, max = matchList.length; i < max; ++i) {
            includeFileContent(matchList[i], fileConfig, function (err) {
                if (err) {
                    console.log(err);
                    callback(err, file);
                    return;
                }

                if (++count === matchList.length) {
                    file.contents = new Buffer(fileConfig.content);
                    callback(err, file);
                }
            });
        }
    };

    return transformStream;
};


function includeFileContent(matchLine, fileConfig, callback) {
    var _match = matchLine.match(getCurrentRegExp(fileConfig, false));
    if (_match == null) {
        console.error('match error!');
        callback(undefined);
        return;
    }
    var fileBasename = path.basename(_match[2]);
    if (fileBasename.indexOf('.') === -1) {
        fileBasename += fileConfig.ext;
    }
    var filepath = path.join(fileConfig.dir, path.dirname(_match[2]), '_' + fileBasename);
    console.log(fileConfig.dir, path.dirname(_match[2]), '_' + fileBasename);
    var whiteSpace = _match[1];
    fs.readFile(filepath, 'utf8', function (err, data) {
        if (err) {
            console.log(err);
            callback(err);
        }
        var lines = data.split('\n');
        lines.forEach(function (value, i) {
            lines[i] = whiteSpace + value;
        });
        fileConfig.content = fileConfig.content.replace(_match[0], function () { return lines.join(''); });
        callback(undefined);
    });
}


function getCurrentRegExp(fileConfig, withGlobalFlag) {
    return patterns[fileConfig.ext.slice(1)][+withGlobalFlag];
}