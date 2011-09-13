(function() {
  var buildTransforms, coffeeScript, colors, combine, compileCoffee, config, createTransforms, deleteFile, ensurePath, ext, findUses, forAll, forFilesIn, fs, gzip, gzipper, jslint, jsp, lint, loadConfig, mkdir, onComplete, onError, onEvent, onStep, parseSource, path, precombineIncludes, pro, process, rebuildList, removeIntermediates, uglify, wrap, _;
  colors = require("colors");
  fs = require("fs");
  mkdir = require("mkdirp").mkdirp;
  path = require("path");
  jsp = require("uglify-js").parser;
  pro = require("uglify-js").uglify;
  jslint = require("readyjslint").JSLINT;
  gzipper = require("gzip");
  _ = require("underscore");
  coffeeScript = require("coffee-script");
  exports.run = function() {
    onStep("Checking for config...");
    return path.exists("./build.json", function(exists) {
      if (exists) {
        return loadConfig();
      } else {
        return onError("No build file available.");
      }
    });
  };
  config = {};
  ext = {
    gzip: "gz",
    uglify: "min"
  };
  onEvent = function(x) {
    return console.log("   " + x);
  };
  onStep = function(x) {
    return console.log(("" + x).blue);
  };
  onComplete = function(x) {
    return console.log(("" + x).green);
  };
  onError = function(x) {
    return console.log(("!!! Error: " + x + " !!!").red);
  };
  forFilesIn = function(dir, onFile, onComplete) {
    var count, done, results;
    count = 0;
    results = [];
    done = function(result) {
      count = count - 1;
      if (result) {
        results.push(result);
      }
      if (count === 0) {
        return onComplete(results);
      }
    };
    return fs.readdir(dir, function(err, list) {
      var file, files, qualified, x, _i, _len, _results;
      if (err) {
        return onError("" + err + " occurred trying to read the path " + path);
      } else {
        qualified = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = list.length; _i < _len; _i++) {
            x = list[_i];
            _results.push({
              full: path.join(dir, x),
              file: x
            });
          }
          return _results;
        })();
        list = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = qualified.length; _i < _len; _i++) {
            x = qualified[_i];
            _results.push({
              file: x.file,
              stat: fs.statSync(x.full)
            });
          }
          return _results;
        })();
        files = _.pluck(_.select(list, function(x) {
          return x.stat.isFile();
        }), "file");
        count = files.length;
        _results = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          _results.push(onFile(dir, file, done));
        }
        return _results;
      }
    });
  };
  forAll = function(list, onItem, onComplete) {
    var count, done, item, results, _i, _len, _results;
    if (!list) {
      onComplete([]);
    }
    count = list.length;
    results = [];
    done = function(result) {
      count = count - 1;
      if (result) {
        results.push(result);
      }
      if (count === 0) {
        return onComplete(results);
      }
    };
    _results = [];
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      item = list[_i];
      _results.push(onItem(item, done));
    }
    return _results;
  };
  ensurePath = function(target, callback) {
    return path.exists(target, function(exists) {
      if (!exists) {
        return mkdir(target, 0755, function(err) {
          if (err) {
            return onError("Could not create " + target + ". " + err);
          } else {
            return callback();
          }
        });
      } else {
        return callback();
      }
    });
  };
  loadConfig = function() {
    onStep("Loading config...");
    return fs.readFile("./build.json", "utf8", function(err, result) {
      if (err) {
        return onError("Could not read build.json file.");
      } else {
        config = JSON.parse(result);
        config.tmp = path.join(config.source, "tmp");
        if (config.extensions) {
          ext.gzip = config.extensions.gzip || ext.gzip;
          ext.uglify = config.extensions.uglify || ext.uglify;
        }
        return ensurePath(config.output, function() {
          return ensurePath(config.tmp, function() {
            return process();
          });
        });
      }
    });
  };
  process = function() {
    return forFilesIn(config.source, parseSource, function(combineList) {
      var transformer;
      onEvent("" + combineList.length + " files parsed.");
      transformer = function(x, y) {
        return createTransforms(x, combineList, y);
      };
      return forAll(combineList, transformer, function(withTransforms) {
        var analyzed, combiner;
        analyzed = rebuildList(withTransforms);
        combiner = function(x, y) {
          return combine(x, analyzed, y);
        };
        return forAll(analyzed, combiner, function(combined) {
          var buildList;
          buildList = removeIntermediates(combined);
          return forAll(_.pluck(buildList, "file"), wrap, function(wrapped) {
            return forAll(wrapped, lint, function(passed) {
              return forAll(passed, uglify, function(uggered) {
                return forAll(uggered, gzip, function(gzipped) {
                  return onComplete("Output: " + gzipped.toString());
                });
              });
            });
          });
        });
      });
    });
  };
  compileCoffee = function(sourcePath, file) {
    var coffee, coffeeFile, js, jsFile;
    jsFile = file.replace(".coffee", ".js");
    coffeeFile = path.join(sourcePath, file);
    onEvent(" Compiling " + coffeeFile);
    coffee = fs.readFileSync(coffeeFile, "utf8");
    js = coffeeScript.compile(coffee);
    fs.writeFileSync(path.join(config.tmp, jsFile), js, "utf8");
    return jsFile;
  };
  parseSource = function(sourcePath, file, parsed) {
    var filePath;
    filePath = path.join(sourcePath, file);
    onEvent("Parsing " + filePath);
    if ((file.substr(file.length - 6)) === "coffee") {
      file = compileCoffee(sourcePath, file);
      return parseSource(config.tmp, file, parsed);
    } else {
      return fs.readFile(filePath, "utf8", function(err, result) {
        var count, files, imports, target, x, _i, _len;
        if (err) {
          return onError("" + err + " trying to parse " + filePath);
        } else {
          imports = result.match(new RegExp("[//]import[(][\"].*[\"][);]", "g"));
          count = imports != null ? imports.length : void 0;
          onEvent("   found " + (count || (count = 0)) + " imports");
          if (imports) {
            files = (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = imports.length; _i < _len; _i++) {
                target = imports[_i];
                _results.push((target.match(/[\"].*[\"]/))[0]);
              }
              return _results;
            })();
            files = (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = files.length; _i < _len; _i++) {
                x = files[_i];
                _results.push(x.replace(/[\"]/g, ''));
              }
              return _results;
            })();
            for (_i = 0, _len = files.length; _i < _len; _i++) {
              x = files[_i];
              onEvent("   - " + x);
            }
            return parsed({
              fullPath: filePath,
              file: file,
              path: sourcePath,
              includes: files,
              combined: false
            });
          } else {
            return parsed({
              fullPath: filePath,
              file: file,
              path: sourcePath,
              includes: [],
              combined: false
            });
          }
        }
      });
    }
  };
  createTransforms = function(item, list, done) {
    if (item.includes.length === 0) {
      done(item);
    }
    return forAll(item.includes, function(x, onTx) {
      return buildTransforms(x, item, list, onTx);
    }, function(transforms) {
      item.transforms = transforms;
      return done(item);
    });
  };
  buildTransforms = function(include, item, list, done) {
    var filePath, includedItem, outputPath, pattern;
    pattern = new RegExp("([/]{2}|[#])import[( ][\"]" + include + "[\"][ )][;]?", "g");
    includedItem = _.detect(list, function(x) {
      return x.file === include;
    });
    outputPath = config.source;
    if (includedItem) {
      outputPath = config.output;
    }
    filePath = path.join(outputPath, include);
    onStep("Building transform for " + filePath);
    return done(function(x) {
      var content;
      try {
        content = fs.readFileSync(filePath, "utf8");
        return x.replace(pattern, content);
      } catch (err) {
        return onError("" + err + " trying to read " + filePath + " while building transforms");
      }
    });
  };
  rebuildList = function(list) {
    var x;
    list = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = list.length; _i < _len; _i++) {
        x = list[_i];
        _results.push(findUses(x, list));
      }
      return _results;
    })();
    return _.select(list, function(x) {
      return x !== void 0;
    });
  };
  findUses = function(item, list) {
    var count, uses;
    if (!item) {
      return;
    } else {
      uses = _.select(list, function(x) {
        return _.any(x.includes, function(y) {
          return item.file === y;
        });
      });
      count = uses != null ? uses.length : void 0;
      item.used = count || (count = 0);
      return item;
    }
  };
  combine = function(item, list, done) {
    var file, output, tx, _i, _len, _ref;
    if (item.combined) {
      return item.combined;
    }
    onStep("Combining " + item.fullPath + " and its includes");
    precombineIncludes(item.includes, list, done);
    try {
      output = path.join(config.output, item.file);
      file = fs.readFileSync(item.fullPath, "utf8");
      if (item.transforms) {
        _ref = item.transforms;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          tx = _ref[_i];
          file = tx(file);
        }
      }
      try {
        fs.writeFileSync(output, file);
        onEvent("  writing " + output);
        item.file = output;
        item.combined = true;
        return done(item);
      } catch (writeErr) {
        return onError("" + writeErr + " when writing output to " + output);
      }
    } catch (readErr) {
      return onError("" + readErr + " while reading " + item.fullPath + " for combination");
    }
  };
  precombineIncludes = function(includes, list, done) {
    var items, x, _i, _len, _results;
    items = _.select(list, function(x) {
      return _.any(includes, function(y) {
        return y === x && !x.combined;
      });
    });
    _results = [];
    for (_i = 0, _len = items.length; _i < _len; _i++) {
      x = items[_i];
      _results.push(combine(x, list, done));
    }
    return _results;
  };
  deleteFile = function(dir, file, done) {
    return fs.unlink(path.join(dir, file), function(err) {
      if (!err) {
        return done(void 0);
      }
    });
  };
  removeIntermediates = function(list) {
    var intermediate, output, x, _i, _len;
    forFilesIn(config.tmp, deleteFile, function() {
      return fs.rmdir(config.tmp);
    });
    intermediate = _.pluck(_.select(list, function(y) {
      return y.used > 0;
    }), "file");
    output = _.select(list, function(y) {
      return y.used === 0;
    });
    for (_i = 0, _len = intermediate.length; _i < _len; _i++) {
      x = intermediate[_i];
      fs.unlink(x);
    }
    return output;
  };
  lint = function(item, done) {
    if (!config.lint) {
      return done(item);
    } else {
      onStep("Linting " + item);
      return fs.readFile(item, "utf8", function(err, file) {
        var errors, result, x, _i, _len;
        if (err) {
          onError("" + err + " when reading " + item);
          return done(item);
        } else {
          result = jslint(file, {});
          if (!result) {
            onError("LINT FAILED ON " + item);
            errors = _.select(jslint.errors, function(e) {
              return e;
            });
            for (_i = 0, _len = errors.length; _i < _len; _i++) {
              x = errors[_i];
              onEvent(("   line " + x.line + ", pos " + x.character + " - " + x.reason).red);
            }
          } else {
            onComplete("Lint for " + item + " passed!");
          }
          return done(item);
        }
      });
    }
  };
  uglify = function(item, done) {
    if (!config.uglify) {
      return done(item);
    } else {
      onStep("Uglifying " + item);
      return fs.readFile(item, "utf8", function(readErr, file) {
        var ast, output, ugg;
        if (readErr) {
          onError("" + readErr + " reading while uglifying " + file);
          return done(item);
        } else {
          ast = jsp.parse(file);
          ast = pro.ast_mangle(ast);
          ast = pro.ast_squeeze(ast);
          output = pro.gen_code(ast);
          ugg = item.replace(".js", "." + ext.uglify + ".js");
          return fs.writeFile(ugg, output, function(writeErr) {
            if (writeErr) {
              onError("" + writeErr + " writing while uglifying " + output);
              return done(item);
            } else {
              onComplete("" + ugg + " uglified successfully");
              return done(ugg);
            }
          });
        }
      });
    }
  };
  gzip = function(item, done) {
    if (!config.gzip) {
      return done(item);
    } else {
      onStep("Zipping " + item);
      return fs.readFile(item, "utf8", function(readErr, file) {
        if (readErr) {
          onError("" + readErr + " reading while zipping " + item);
          return done(item);
        } else {
          return gzipper(file, function(zipErr, output) {
            var gz;
            if (zipErr) {
              onError("" + zipErr + " zipping " + item);
              return done(item);
            } else {
              gz = item.replace(".js", "." + ext.gzip + ".js");
              return fs.writeFile(gz, output, function(writeErr) {
                if (writeErr) {
                  onError("" + writeErr + " writing while zipping " + item);
                  return done(item);
                } else {
                  onComplete("" + gz + " gzipped successfully");
                  return done(gz);
                }
              });
            }
          });
        }
      });
    }
  };
  wrap = function(item, done) {
    if (!(config.prefix || config.suffix)) {
      done(item);
    }
    onStep("Wrapping " + item);
    return fs.readFile(item, "utf8", function(readErr, file) {
      if (readErr) {
        onError("" + readErr + " reading while wrapping " + item);
        return done(item);
      } else {
        if (config.prefix) {
          file = config.prefix + "\r\n" + file;
        }
        if (config.suffix) {
          file = file + "\r\n" + config.suffix;
        }
        return fs.writeFile(item, file, function(writeErr) {
          if (writeErr) {
            onError("" + writeErr + " writing while wrapping " + item);
            return done(item);
          } else {
            onComplete(" " + item + " successfully wrapped!");
            return done(item);
          }
        });
      }
    });
  };
}).call(this);
