var ArgParser, builder, coffeeScript, colors, dive, emitter, events, express, fs, gzipper, jslint, jsp, mkdir, path, pro, resource, _;
events = require("events");
emitter = events.EventEmitter;
_ = require("underscore");
colors = require("colors");
fs = require("fs");
mkdir = require("mkdirp").mkdirp;
path = require("path");
ArgParser = require("argparser");
express = require("express");
resource = require("express-resource");
builder = require("DOMBuilder");
dive = require("dive");
jsp = require("uglify-js").parser;
pro = require("uglify-js").uglify;
jslint = require("readyjslint").JSLINT;
gzipper = require("gzip");
coffeeScript = require("coffee-script");
var onComplete, onError, onEvent, onStep;
onEvent = function(x) {
  if (!quiet) {
    return console.log("   " + x);
  }
};
onStep = function(x) {
  if (!quiet) {
    return console.log(("" + x).blue);
  }
};
onComplete = function(x) {
  return console.log(("" + x).green);
};
onError = function(x) {
  return console.log(("!!! Error: " + x + " !!!").red);
};
var buildPath, deleteFile, ensurePath, forAll, forFilesIn, readFile, readFileSync, removeIntermediates, transformFile, transformFileSync, writeFile, writeFileSync;
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
      list = _.select(list, function(x) {
        var ext;
        ext = path.extname(x);
        return ext === ".coffee" || ext === ".js";
      });
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
ensurePath = function(target, callback) {
  return path.exists(target, function(exists) {
    if (!exists) {
      return mkdir(target, "0755", function(err) {
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
deleteFile = function(dir, file, done) {
  return fs.unlink(path.join(dir, file), function(err) {
    if (!err) {
      return done(null);
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
buildPath = function(spec) {
  var file, join;
  file = spec;
  if (_(spec).isArray()) {
    join = path.join;
    file = join.apply(this, spec);
  }
  return file;
};
transformFile = function(filePath, transform, outputPath, done) {
  return readFile(filePath, function(x) {
    return transform(x, function(content) {
      return writeFile(outputPath, content, done);
    });
  });
};
transformFileSync = function(filePath, transform, outputPath, done) {
  return readFileSync(filePath, function(x) {
    var content;
    content = transform(x);
    return writeFileSync(outputPath, content, done);
  });
};
readFile = function(filePath, onFile) {
  var file;
  file = buildPath(filePath);
  return fs.readFile(file, "utf8", function(err, content) {
    if (err) {
      return onError("Error " + err + ": reading " + file + ".");
    } else {
      return onFile(content);
    }
  });
};
readFileSync = function(filePath, onFile) {
  var file;
  file = buildPath(filePath);
  try {
    return onFile(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return onError("Error " + err + ": reading " + file + ".");
  }
};
writeFile = function(filePath, content, done) {
  var file;
  file = buildPath(filePath);
  return fs.writeFile(file, content, "utf8", function(err) {
    if (err) {
      return onError("Error " + err + ": writing " + file);
    } else {
      return done(file);
    }
  });
};
writeFileSync = function(filePath, content, done) {
  var file;
  file = buildPath(filePath);
  try {
    fs.writeFileSync(file, content, "utf8");
    return done(file);
  } catch (err) {
    return onError("Error " + err + ": writing " + file + " (sync)");
  }
};
var config, configure, continuous, conventionConfig, ensurePaths, ext, importRegex, inProcess, loadConfig, loadConvention, prepConfig, quiet, test, writeConfig;
config = {};
conventionConfig = {
  "source": "src",
  "output": "lib",
  "spec": "spec",
  "ext": "ext",
  "lint": {},
  "uglify": {},
  "gzip": {}
};
continuous = test = false;
inProcess = false;
quiet = false;
ext = {
  gzip: "gz",
  uglify: "min"
};
ensurePaths = function(callback) {
  config.tmp = path.join(config.source, "tmp");
  return ensurePath(config.output, function() {
    return ensurePath(config.tmp, function() {
      return callback();
    });
  });
};
configure = function() {
  var buildFile, buildOpt, buildTemplate, output, parser, scaffold;
  parser = new ArgParser();
  parser.addValueOptions(["t", "b", "n"]);
  parser.parse();
  scaffold = parser.getOptions("n");
  if (scaffold) {
    console.log("Creating scaffolding for " + scaffold);
    return ensurePath(scaffold, function() {
      return ensurePath(scaffold + "/src", function() {
        return ensurePath(scaffold + "/lib", function() {
          return ensurePath(scaffold + "/ext", function() {
            return ensurePath(scaffold + "/spec", function() {
              writeConfig(scaffold + "/build.json");
              return global.process.exit(0);
            });
          });
        });
      });
    });
  } else {
    buildOpt = parser.getOptions("b");
    buildFile = buildOpt ? buildOpt : "build.json";
    buildTemplate = parser.getOptions("t", "template");
    if (buildTemplate) {
      output = buildTemplate === true ? "build.json" : buildTemplate;
      writeConfig(output);
      global.process.exit(0);
    }
    continuous = parser.getOptions("ci");
    quiet = parser.getOptions("q");
    test = parser.getOptions("p", "pavlov");
    if (test) {
      startHost();
    }
    onStep("Checking for config...");
    return path.exists(buildFile, function(exists) {
      return prepConfig(exists, buildFile);
    });
  }
};
prepConfig = function(exists, file) {
  if (!exists) {
    return loadConvention();
  } else {
    return loadConfig(file);
  }
};
loadConfig = function(file) {
  onStep("Loading config...");
  return readFile("./" + file, function(x) {
    config = JSON.parse(x);
    if (config.extensions) {
      ext.gzip = config.extensions.gzip || ext.gzip;
      ext.uglify = config.extensions.uglify || ext.uglify;
    }
    return process();
  });
};
loadConvention = function() {
  onStep("Loading convention...");
  config = conventionConfig;
  return process();
};
writeConfig = function(name) {
  return writeFileSync(name, JSON.stringify(conventionConfig, null, "\t"), function(x) {
    return onComplete("" + name + " created successfully!");
  });
};
importRegex = new RegExp("([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g");
var createStep, createTransformStep, gzip, lint, uglify, wrap;
createStep = function(step, onFile) {
  return function(item, done) {
    if (!config[step]) {
      return done(item);
    } else {
      onStep("Step - " + step + ": " + item);
      return readFile(item, function(x) {
        return onFile(item, x, done);
      });
    }
  };
};
createTransformStep = function(step, transform, rename) {
  return function(item, done) {
    var output;
    if (!config[step]) {
      return done(item);
    } else {
      onStep("Step - " + step + ": " + item);
      output = rename(item);
      return transformFile(item, transform, output, function(x) {
        onComplete("Step - " + step + " successful for " + item);
        return done(x);
      });
    }
  };
};
lint = createStep("lint", function(item, file, done) {
  var errors, result, x, _i, _len;
  result = jslint(file, {});
  if (!result) {
    onError("LINT FAILED ON " + item);
    errors = _.select(jslint.errors, function(e) {
      return e;
    });
    for (_i = 0, _len = errors.length; _i < _len; _i++) {
      x = errors[_i];
      console.log(("   line " + x.line + ", pos " + x.character + " - " + x.reason).red);
    }
  } else {
    onComplete("" + item + " passed lint!");
  }
  return done(item);
});
uglify = createTransformStep("uglify", function(x, done) {
  var ast;
  ast = jsp.parse(x);
  ast = pro.ast_mangle(ast);
  ast = pro.ast_squeeze(ast);
  return done(pro.gen_code(ast));
}, function(x) {
  return x.replace(".js", "." + ext.uglify + ".js");
});
gzip = createTransformStep("gzip", function(x, done) {
  return gzipper(x, function(err, result) {
    return done(result);
  });
}, function(x) {
  return x.replace(".js", "." + ext.gzip + ".js");
});
wrap = createTransformStep("wrap", function(x, done) {
  if (config.wrap.prefix) {
    x = config.wrap.prefix + "\r\n" + x;
  }
  if (config.wrap.suffix) {
    x = x + "\r\n" + config.wrap.suffix;
  }
  return done(x);
}, function(x) {
  return x;
});
var buildHead, buildScripts, createPage, startHost;
createPage = function() {
  var extPath, libPath, specPath;
  specPath = config.spec || (config.spec = "./spec");
  extPath = config.ext || (config.ext = "./ext");
  libPath = config.output || (config.output = "./lib");
  return ensurePath(specPath, function() {
    return ensurePath(extPath, function() {
      var externals, html, libs, list, page, spec;
      spec = fs.readdirSync(specPath);
      spec = _.map(spec, function(x) {
        return path.join(specPath, x);
      });
      externals = fs.readdirSync(extPath);
      externals = _.map(externals, function(x) {
        return path.join("..", extPath, x);
      });
      libs = fs.readdirSync(libPath);
      libs = _.select(libs, function(x) {
        return !x.match(/[.]gz[.]/);
      });
      libs = _.map(libs, function(x) {
        return path.join("..", libPath, x);
      });
      list = externals.concat(libs).concat(spec);
      html = builder.html;
      page = html.HTML(buildHead(html, list), html.BODY(html.H1({
        "id": "qunit-header"
      }, html.H2({
        "id": "qunit-banner"
      }), html.DIV({
        "id": "qunit-testrunner-toolbar"
      }), html.H2({
        "id": "qunit-userAgent"
      }), html.OL({
        "id": "qunit-tests"
      }))));
      return writeFileSync("index.html", page.toString(), function() {
        return onEvent("Pavlov test page generated");
      });
    });
  });
};
buildHead = function(html, list) {
  var jQueryJS, pavlovDir, pavlovJS, qunitCSS, qunitJS;
  pavlovDir = "pavlov";
  qunitCSS = pavlovDir + "/qunit.css";
  jQueryJS = pavlovDir + "/jquery-1.6.4.min.js";
  qunitJS = pavlovDir + "/qunit.js";
  pavlovJS = pavlovDir + "/pavlov.js";
  return html.HEAD(html.LINK({
    rel: "stylesheet",
    href: qunitCSS,
    type: "text/css",
    media: "screen"
  }), html.SCRIPT({
    type: "text/javascript",
    src: jQueryJS
  }), html.SCRIPT({
    type: "text/javascript",
    src: qunitJS
  }), html.SCRIPT({
    type: "text/javascript",
    src: pavlovJS
  }), buildScripts(html, list));
};
buildScripts = function(html, list) {
  return _.map(list, function(x) {
    return html.SCRIPT({
      type: "text/javascript",
      src: x
    });
  });
};
startHost = function() {
  var app, sourceBase;
  sourceBase = path.normalize(path.join(__dirname, "..", "ext"));
  if (!path.existsSync("./pavlov")) {
    fs.symlinkSync(sourceBase, "./pavlov");
  }
  app = express.createServer();
  app.use(express.bodyParser());
  app.use(app.router);
  app.use("/", express.static(path.resolve(".")));
  app.get("*.coffee", function(req, res) {
    var coffee, source;
    res.header('Content-Type', 'application/javascript');
    source = fs.readFileSync("." + req.url, "utf8");
    coffee = coffeeScript.compile(source, {
      bare: true
    });
    return res.send(coffee);
  });
  return app.listen(1580);
};
var buildTransforms, combine, compileCoffee, crawlFiles, createTransforms, findUses, pack, parseSource, precombineIncludes, process, rebuildList, transform;
exports.run = function() {
  return configure();
};
process = function() {
  var inProcess;
  if (!inProcess) {
    inProcess = true;
    try {
      return ensurePaths(function() {
        return crawlFiles();
      });
    } catch (ex) {
      inProcess = false;
      return onError("The build failed failingly. Like a failure :@");
    }
  } else {
    return onError("There is already a build in process");
  }
};
crawlFiles = function() {
  var inProcess;
  forFilesIn(config.source, parseSource, function(combineList) {
    var transformer;
    onEvent("" + combineList.length + " files parsed.");
    transformer = function(x, y) {
      return createTransforms(x, combineList, y);
    };
    return forAll(combineList, transformer, transform);
  });
  return inProcess = false;
};
transform = function(withTransforms) {
  var analyzed, combiner;
  analyzed = rebuildList(withTransforms);
  combiner = function(x, y) {
    return combine(x, analyzed, y);
  };
  return forAll(analyzed, combiner, pack);
};
pack = function(combined) {
  var buildList;
  buildList = removeIntermediates(combined);
  return forAll(_.pluck(buildList, "file"), wrap, function(wrapped) {
    return forAll(wrapped, lint, function(passed) {
      return forAll(passed, uglify, function(uggered) {
        return forAll(uggered, gzip, function(gzipped) {
          var inProcess;
          onComplete("Output: " + gzipped.toString());
          inProcess = false;
          if (test) {
            createPage();
          }
          if (continuous) {
            return createWatch();
          }
        });
      });
    });
  });
};
compileCoffee = function(sourcePath, file) {
  var coffeeFile, jsFile;
  jsFile = file.replace(".coffee", ".js");
  coffeeFile = path.join(sourcePath, file);
  transformFileSync(coffeeFile, function(x) {
    var inProcess;
    try {
      return coffeeScript.compile(x, {
        bare: true
      });
    } catch (error) {
      return inProcess = false;
    }
  }, [config.tmp, jsFile], function(x) {
    return x === x;
  });
  return jsFile;
};
parseSource = function(sourcePath, file, parsed) {
  var filePath, inProcess;
  filePath = path.join(sourcePath, file);
  onEvent("Parsing " + filePath);
  if ((file.substr(file.length - 6)) === "coffee" && !config.justCoffee) {
    try {
      file = compileCoffee(sourcePath, file);
      return parseSource(config.tmp, file, parsed);
    } catch (ex) {
      return inProcess = false;
    }
  } else {
    return readFile(filePath, function(content) {
      var count, files, imports, target, x, _i, _len;
      imports = content.match(importRegex);
      count = imports != null ? imports.length : void 0;
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
        if (!config.justCoffee) {
          files = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = files.length; _i < _len; _i++) {
              x = files[_i];
              _results.push(x.replace(".coffee", ".js"));
            }
            return _results;
          })();
        }
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
  var filePath, includePattern, includedItem, outputPath, pattern;
  includePattern = include.replace(".coffee", "").replace(".js", "") + "[.](js|coffee)";
  pattern = new RegExp("([/].|[#]{1,3})import[( ][\"]" + includePattern + "[\"][ )]?[;]?([*/]{2})?[#]{0,3}", "g");
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
    content = fs.readFileSync(filePath, "utf8");
    return x.replace(pattern, content);
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
  var output;
  if (item.combined) {
    return item.combined;
  }
  onStep("Combining " + item.fullPath + " and its includes");
  precombineIncludes(item.includes, list, done);
  output = path.join(config.output, item.file);
  return transformFileSync(item.fullPath, function(x) {
    var tx, _i, _len, _ref;
    if (item.transforms) {
      _ref = item.transforms;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        tx = _ref[_i];
        x = tx(x);
      }
    }
    return x;
  }, output, function(x) {
    item.file = output;
    item.combined = true;
    return done(item);
  });
};
precombineIncludes = function(includes, list, done) {
  var items, z, _i, _len, _results;
  items = _.select(list, function(x) {
    return _.any(includes, function(y) {
      return y === x.file && !x.combined;
    });
  });
  _results = [];
  for (_i = 0, _len = items.length; _i < _len; _i++) {
    z = items[_i];
    _results.push(combine(z, list, done));
  }
  return _results;
};
var createWatch, triggerProcess;
createWatch = function() {
  var continuous, onChange;
  continuous = false;
  onChange = triggerProcess;
  return dive(config.source, {
    recursive: false,
    all: false
  }, function(err, file) {
    if (!err) {
      return fs.watchFile(file, {
        persistent: true
      }, function(c, p) {
        var callback;
        onEvent("Change in " + file + " detected. Rebuilding...");
        callback = onChange;
        onChange = function() {};
        return callback();
      });
    }
  });
};
triggerProcess = function() {
  dive(config.source, {
    recursive: false,
    all: false
  }, function(err, file) {
    if (!err) {
      return fs.unwatchFile(file);
    }
  });
  createPage();
  return process();
};