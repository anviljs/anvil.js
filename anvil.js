(function() {
  var combine, findImports, finish, fs, jsp, loadConfig, parseSource, path, pro, process, replace, ugger, uglifyOutput, yell;
  fs = require("fs");
  path = require("path");
  ugger = require("uglify-js");
  jsp = ugger.parser;
  pro = ugger.uglify;
  console.log("Checking for config...");
  path.exists("./build.json", function(exists) {
    if (exists) {
      return loadConfig();
    } else {
      return yell();
    }
  });
  loadConfig = function() {
    console.log("Loading config...");
    return fs.readFile("./build.json", "utf8", function(err, result) {
      if (err) {
        return yell();
      } else {
        return process(JSON.parse(result));
      }
    });
  };
  process = function(config) {
    var append, dependencyList, files, modulePath, onFile, outputPath, prepend, sourcePath, uglifyOptions;
    sourcePath = config.source, modulePath = config.modules, outputPath = config.output, dependencyList = config.packages, uglifyOptions = config.uglify, prepend = config.prefix, append = config.suffix;
    files = 0;
    onFile = function(file) {
      console.log("Combining " + file.file + "'s includes");
      return combine(outputPath, file, function() {
        files = files - 1;
        if (files === 0) {
          return uglifyOutput(outputPath, uglifyOptions, function() {
            return finish(prepend(append));
          });
        }
      });
    };
    return findImports(sourcePath, onFile, function(total) {
      return files = total;
    });
  };
  findImports = function(sourcePath, onFile, onCount) {
    return fs.readdir(sourcePath, function(err, files) {
      var file, _i, _len, _results;
      if (err) {
        return yell();
      } else {
        console.log("Found " + files.length);
        onCount(files.length);
        _results = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          _results.push(parseSource(sourcePath, file, onFile));
        }
        return _results;
      }
    });
  };
  parseSource = function(sourcePath, file, ready) {
    var filePath;
    filePath = path.join(sourcePath, file);
    return fs.readFile(filePath, "utf8", function(err, result) {
      var files, imports, target, x, _i, _len;
      if (err) {
        return yell();
      } else {
        console.log("Parsing " + filePath);
        imports = result.match(new RegExp("import_source[(][\"].*[\"][);]", "g"));
        if (imports) {
          console.log("YIPPEE FUCKING SKIPPY!");
          files = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = imports.length; _i < _len; _i++) {
              target = imports[_i];
              _results.push((target.match(/[\"].*[\"]/))[0]);
            }
            return _results;
          })();
          for (_i = 0, _len = files.length; _i < _len; _i++) {
            x = files[_i];
            console.log(x);
          }
          files = (function() {
            var _j, _len2, _results;
            _results = [];
            for (_j = 0, _len2 = files.length; _j < _len2; _j++) {
              x = files[_j];
              _results.push(x.replace(/[\"]/g, ''));
            }
            return _results;
          })();
          return ready({
            fullPath: filePath,
            file: file,
            path: sourcePath,
            includes: files
          });
        }
      }
    });
  };
  combine = function(outputPath, item) {
    console.log(JSON.stringify(item));
    return fs.readFile(item.fullPath, "utf8", function(err, parent) {
      var count, done, target, transforms, _i, _len, _ref, _results;
      if (err) {
        return yell();
      } else {
        count = item.includes.length;
        transforms = [];
        done = function(transform) {
          var output, tx, _i, _len;
          count--;
          transforms.push(transform);
          if (count === 0) {
            output = path.join(outputPath, item.file);
            for (_i = 0, _len = transforms.length; _i < _len; _i++) {
              tx = transforms[_i];
              parent = tx(parent);
            }
            return fs.writeFile(output, parent, function(err) {
              if (err) {
                return yell();
              }
            });
          }
        };
        _ref = item.includes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          target = _ref[_i];
          _results.push(replace(item.path, target, done));
        }
        return _results;
      }
    });
  };
  replace = function(sourcePath, target, done) {
    var filePath;
    filePath = path.join(sourcePath, target);
    console.log("Replacing placeholders for " + filePath);
    return fs.readFile(filePath, "utf8", function(err, result) {
      var pattern;
      if (err) {
        return yell();
      } else {
        pattern = new RegExp("import_source[(][\"]" + target + "[\"][);]", "g");
        return done(function(x) {
          return x.replace(pattern, result);
        });
      }
    });
  };
  uglifyOutput = function(outputPath, uglifyOptions, done) {
    return done();
  };
  finish = function(prepend, append) {
    return console.log("DONE");
  };
  yell = function() {
    return console.log("I'M SCREAMING, I'M SCREAMING, I'M SCREAMING!");
  };
}).call(this);
