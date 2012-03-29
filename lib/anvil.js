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
      if (count === 0) {
        onComplete([]);
      }
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
  return readFileSync(filePath, function(file_contents) {
    var content;
    content = transform(file_contents);
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
var config, configure, continuous, conventionConfig, ensurePaths, ext, importRegex, inProcess, loadConfig, loadConvention, prepConfig, quiet, test, version, writeConfig;
config = {};
conventionConfig = {
  "source": "src",
  "output": "lib",
  "spec": "spec",
  "ext": "ext",
  "lint": {},
  "uglify": {},
  "gzip": {},
  "gendocs": {},
  "hosts": {
    "/": "html"
  }
};
continuous = test = false;
inProcess = false;
quiet = false;
version = "0.5.5";
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
  var buildFile, buildOpt, generator, htmlPage, parser, scaffold, showVersion;
  parser = new ArgParser();
  parser.addValueOptions(["t", "b", "n", "html"]);
  parser.parse();
  scaffold = parser.getOptions("n");
  htmlPage = parser.getOptions("html");
  showVersion = parser.getOptions("v", "version");
  if (showVersion) {
    console.log("Anvil.js " + version);
    return global.process.exit(0);
  } else if (scaffold) {
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
  } else if (htmlPage) {
    generator = new HtmlGenerator();
    return generator.createPageTemplate(htmlPage);
  } else {
    buildOpt = parser.getOptions("b");
    buildFile = buildOpt ? buildOpt : "build.json";
    onStep("Checking for config...");
    return path.exists(buildFile, function(exists) {
      return prepConfig(exists, buildFile, function() {
        var buildTemplate, host, output;
        buildTemplate = parser.getOptions("t", "template");
        if (buildTemplate) {
          output = buildTemplate === true ? "build.json" : buildTemplate;
          writeConfig(output);
          global.process.exit(0);
        }
        continuous = parser.getOptions("ci");
        quiet = parser.getOptions("q");
        test = parser.getOptions("p", "pavlov");
        config.testTarget = config.output || (config.output = "lib");
        if (test) {
          if (parser.getOptions("s")) {
            config.testTarget = config.source || (config.source = "src");
          }
          hostPavlov();
        }
        host = parser.getOptions("h");
        if (host) {
          hostStatic();
        }
        return process();
      });
    });
  }
};
prepConfig = function(exists, file, complete) {
  if (!exists) {
    return loadConvention(complete);
  } else {
    return loadConfig(file, complete);
  }
};
loadConfig = function(file, complete) {
  onStep("Loading config...");
  return readFile("./" + file, function(x) {
    config = JSON.parse(x);
    if (config.extensions) {
      ext.gzip = config.extensions.gzip || ext.gzip;
      ext.uglify = config.extensions.uglify || ext.uglify;
    }
    if (config.wrapper) {
      if (config.wrapper['prefix-file']) {
        config.wrapper.prefix = readFileSync(config.wrapper['prefix-file'], 'utf-8');
      }
      if (config.wrapper['suffix-file']) {
        config.wrapper.suffix = readFileSync(config.wrapper['suffix-file'], 'utf-8');
      }
    }
    if (config.finalize) {
      if (config.finalize['header-file']) {
        config.finalize.header = fs.readFileSync(config.finalize['header-file'], 'utf-8');
      }
      if (config.finalize['footer-file']) {
        config.finalize.footer = fs.readFileSync(config.finalize['footer-file'], 'utf-8');
      }
    }
    if (config.name) {
      if (typeof config.name === "string") {
        config.getName = function(x) {
          return config.name;
        };
      }
      if (typeof config.name === "object") {
        config.getName = function(x) {
          return config.name[x] || config.name;
        };
      }
      config.rename = true;
    }
    return complete();
  });
};
loadConvention = function(complete) {
  onStep("Loading convention...");
  config = conventionConfig;
  return complete();
};
writeConfig = function(name) {
  return writeFileSync(name, JSON.stringify(conventionConfig, null, "\t"), function(x) {
    return onComplete("" + name + " created successfully!");
  });
};
importRegex = new RegExp("([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g");
var createStep, createTransformStep, finalize, gzip, lint, renameFile, uglify, wrap;
createStep = function(step, onFile) {
  return function(item, done) {
    if (!config[step]) {
      return done(item);
    } else {
      onStep("Step - " + step + ": " + item);
      return readFile(item, function(file_contents) {
        return onFile(item, file_contents, done);
      });
    }
  };
};
createTransformStep = function(step, transform, rename) {
  return function(item, done) {
    var erase, output;
    if (!config[step]) {
      return done(item);
    } else {
      onStep("Step - " + step + ": " + item);
      erase = false;
      output = rename(item, function() {
        return erase = true;
      });
      return transformFile(item, transform, output, function(x) {
        onComplete("Step - " + step + " successful for " + item);
        if (erase) {
          return fs.unlink(item, function() {
            return done(x);
          });
        } else {
          return done(x);
        }
      });
    }
  };
};
renameFile = createTransformStep("rename", function(x, done) {
  return done(x);
}, function(x, erase) {
  var name, newName, path;
  name = require('path').basename(x);
  newName = config.getName(name);
  path = x;
  if (name !== newName) {
    path = x.replace(name, newName);
    onEvent("... renaming " + x + " to " + path);
    erase();
  }
  return path;
});
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
    x = config.wrap.prefix + "\n" + x;
  }
  if (config.wrap.suffix) {
    x = x + "\n" + config.wrap.suffix;
  }
  return done(x);
}, function(x) {
  return x;
});
finalize = createTransformStep("finalize", function(x, done) {
  if (config.finalize.header) {
    x = "" + config.finalize.header + "\n" + x;
  }
  if (config.finalize.footer) {
    x = x + ("\n" + config.finalize.footer + "\n");
  }
  return done(x);
}, function(x) {
  return x;
});
var doc_generators, gendocs, generate_docs_for_file, generate_docs_from_string, get_doc_generator_method;
doc_generators = {
  ape: require('ape'),
  docco: require('docco')
};
gendocs = function() {
  var conf, _ref, _ref2;
  if (config.gendocs == null) {
    return false;
  } else {
    conf = config.gendocs;
    if ((_ref = conf.generator) == null) {
      conf.generator = 'ape';
    }
    if ((_ref2 = conf.output) == null) {
      conf.output = 'docs';
    }
    conf.sourcePaths = _.isArray(conf.sources) ? conf.sources : [conf.sources || 'src'];
    return ensurePath(conf.output, function(exists) {
      return conf.sourcePaths.forEach(function(dirname) {
        return forFilesIn(dirname, generate_docs_for_file, function() {
          var style_path;
          if (conf.generator === 'docco') {
            style_path = path.join(conf.output, 'stylesheets');
            return ensurePath(style_path, function(exists) {
              return fs.readFile(path.join(config.ext, 'docco.css'), function(err, stylesheet) {
                return fs.writeFile(path.join(style_path, 'docco.css'), stylesheet, function() {
                  return onComplete('finè');
                });
              });
            });
          }
        });
      });
    });
  }
};
generate_docs_for_file = function(dir, file, done) {
  var conf, file_path;
  file_path = path.join(dir, file);
  conf = config.gendocs;
  return path.exists(file_path, function(exists) {
    if (exists) {
      return fs.readFile(file_path, function(err, file_contents) {
        onStep('Generating docs for ' + file_path);
        return generate_docs_from_string(file_contents.toString(), file, done);
      });
    } else {
      return onError(file_path, 'does not exist!');
    }
  });
};
get_doc_generator_method = function(name) {
  if (name === 'ape') {
    return doc_generators.ape.generate_doc;
  } else {
    return doc_generators.docco.generate_doc_from_string;
  }
};
generate_docs_from_string = function(code, file, done) {
  var conf, doc_generator, lang, write_doc_file;
  conf = config.gendocs;
  doc_generator = get_doc_generator_method(conf.generator);
  lang = doc_generators.ape.get_language(file);
  write_doc_file = function(err, docs) {
    var outfile;
    if (conf.generator === 'docco') {
      docs = err;
    }
    outfile = path.join(conf.output, file.replace(/\.(js|coffee)$/, '.html'));
    return fs.writeFile(outfile, docs, function(err) {
      if (err) {
        onError(err);
      }
      return done();
    });
  };
  if (conf.generator === 'ape') {
    doc_generator(code, lang, 'html', null, write_doc_file);
  }
  if (conf.generator === 'docco') {
    if (lang && (lang.name != null)) {
      lang = lang.name === 'coffeescript' ? '.coffee' : '.js';
    }
    return doc_generator(filename, code, lang, write_doc_file);
  }
};
var ClientNotifier, buildHead, buildScripts, clientNotifier, createPage, hostPavlov;
ClientNotifier = (function() {
  var clients;
  function ClientNotifier() {}
  clients = [];
  ClientNotifier.prototype.init = function(app) {
    var io;
    io = require('socket.io').listen(app);
    io.set('log level', 1);
    return io.sockets.on('connection', this.addClient);
  };
  ClientNotifier.prototype.addClient = function(socket) {
    clients.push(socket);
    return socket.on("end", function() {
      var i;
      i = clients.indexOf(socket);
      return clients.splice(i, 1);
    });
  };
  ClientNotifier.prototype.notifyClients = function() {
    var i, _results;
    onEvent("Notifying Browser Test Runner Clients");
    i = 0;
    _results = [];
    while (i < clients.length) {
      clients[i].emit("runTests", {});
      _results.push(i++);
    }
    return _results;
  };
  return ClientNotifier;
})();
clientNotifier = new ClientNotifier;
createPage = function() {
  var extPath, libPath, specPath;
  specPath = config.spec || (config.spec = "./spec");
  extPath = config.ext || (config.ext = "./ext");
  libPath = config.testTarget;
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
        return !x.match(/[.]gz[.]/ && !x.match(/[.]min[.]/));
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
        onEvent("Pavlov test page generated");
        return clientNotifier.notifyClients();
      });
    });
  });
};
buildHead = function(html, list) {
  var jQueryJS, pavlovDir, pavlovJS, qunitCSS, qunitJS, scktHook, socketIo;
  pavlovDir = "pavlov";
  qunitCSS = pavlovDir + "/qunit.css";
  jQueryJS = pavlovDir + "/jquery-1.6.4.min.js";
  qunitJS = pavlovDir + "/qunit.js";
  pavlovJS = pavlovDir + "/pavlov.js";
  socketIo = "/socket.io/socket.io.js";
  scktHook = pavlovDir + "/socketHook.js";
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
  }), html.SCRIPT({
    type: "text/javascript",
    src: socketIo
  }), html.SCRIPT({
    type: "text/javascript",
    src: scktHook
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
hostPavlov = function() {
  var app, pavlovPath, sourceBase;
  sourceBase = path.normalize(path.join(__dirname, "..", "ext"));
  pavlovPath = path.join(global.process.cwd(), "pavlov");
  try {
    fs.unlinkSync(pavlovPath);
  } catch (error) {

  } finally {
    fs.symlinkSync(sourceBase, pavlovPath);
  }
  app = express.createServer();
  app.use(express.bodyParser());
  app.use(app.router);
  clientNotifier.init(app);
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
var HtmlGenerator, host, hostStatic;
HtmlGenerator = (function() {
  var buildScripts;
  function HtmlGenerator() {}
  HtmlGenerator.prototype.createPageTemplate = function(name) {
    var extPath, libPath, output;
    extPath = config.ext || (config.ext = "./ext");
    libPath = config.output || (config.output = "./lib");
    output = name + ".html";
    return ensurePath(extPath, function() {
      var externals, html, libs, list, page;
      externals = fs.readdirSync(extPath);
      externals = _.map(externals, function(x) {
        return path.join("..", extPath, x);
      });
      libs = fs.readdirSync(libPath);
      libs = _.select(libs, function(x) {
        return !x.match(/[.]gz[.]/ && !x.match(/[.]min[.]/));
      });
      libs = _.map(libs, function(x) {
        return path.join("..", libPath, x);
      });
      list = externals.concat(libs);
      html = builder.html;
      page = html.HTML(html.HEAD(buildScripts(html, list)), html.BODY());
      return writeFileSync(output, page.toString(), function() {
        onEvent("HTML template " + output + " created");
        return global.process.exit(0);
      });
    });
  };
  buildScripts = function(html, list) {
    return _.map(list, function(x) {
      return html.SCRIPT({
        type: "text/javascript",
        src: x
      });
    });
  };
  return HtmlGenerator;
})();
hostStatic = function() {
  var app, extPath, key, libPath, _i, _len, _ref;
  extPath = config.ext || (config.ext = "./ext");
  libPath = config.output || (config.output = "./lib");
  app = express.createServer();
  app.use(express.bodyParser());
  app.use(app.router);
  app.use("/lib", express.static(path.resolve(libPath)));
  app.use("/ext", express.static(path.resolve(extPath)));
  _ref = _(config.hosts).keys();
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    key = _ref[_i];
    host(app, config.hosts[key], key);
  }
  app.get("*.coffee", function(req, res) {
    var coffee, source;
    res.header('Content-Type', 'application/javascript');
    source = fs.readFileSync("." + req.url, "utf8");
    coffee = coffeeScript.compile(source, {
      bare: true
    });
    return res.send(coffee);
  });
  return app.listen(3080);
};
host = function(app, dir, uri) {
  onComplete("Hosting " + dir + " at " + uri);
  return app.use(uri, express.static(path.resolve(dir)));
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
    transformer = function(item, done) {
      return createTransforms(item, combineList, done);
    };
    return forAll(combineList, transformer, transform);
  });
  return inProcess = false;
};
transform = function(withTransforms) {
  var analyzed, combiner;
  analyzed = rebuildList(withTransforms);
  combiner = function(file, done) {
    return combine(file, analyzed, done);
  };
  return forAll(analyzed, combiner, pack);
};
pack = function(combined) {
  var buildList;
  buildList = removeIntermediates(combined);
  return forAll(_.pluck(buildList, "file"), wrap, function(wrapped) {
    return forAll(wrapped, renameFile, function(renamed) {
      return forAll(renamed, lint, function(passed) {
        return forAll(passed, uglify, function(uggered) {
          return forAll(uggered, gzip, function(gzipped) {
            return forAll(gzipped, finalize, function(finalized) {
              var inProcess;
              onComplete("Output: " + finalized.toString());
              inProcess = false;
              gendocs();
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
  return forAll(item.includes, function(include, onTx) {
    return buildTransforms(include, item, list, onTx);
  }, function(transforms) {
    item.transforms = transforms;
    return done(item);
  });
};
buildTransforms = function(include, item, list, done) {
  var filePath, includePattern, includedItem, outputPath, pattern;
  includePattern = include.replace(".coffee", "").replace(".js", "") + "[.](js|coffee)";
  pattern = new RegExp("([/].|[#]{1,3})import[( ][\"]" + includePattern + "[\"][ )]?[;]?([*/]{2})?[#]{0,3}", "g");
  includedItem = _.detect(list, function(file_meta) {
    return file_meta.file === include;
  });
  outputPath = config.source;
  if (includedItem) {
    outputPath = config.output;
  }
  filePath = path.join(outputPath, include);
  onStep("Building transform for " + filePath);
  return done(function(file_contents) {
    var content;
    content = fs.readFileSync(filePath, "utf8");
    return file_contents.replace(pattern, content);
  });
};
rebuildList = function(list) {
  var file;
  list = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      file = list[_i];
      _results.push(findUses(file, list));
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
    uses = _.select(list, function(file) {
      return _.any(file.includes, function(include) {
        return item.file === include;
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
  return transformFileSync(item.fullPath, function(file_contents) {
    var transform, _i, _len, _ref;
    if (item.transforms) {
      _ref = item.transforms;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        transform = _ref[_i];
        file_contents = transform(file_contents);
      }
    }
    return file_contents;
  }, output, function(x) {
    item.file = output;
    item.combined = true;
    return done(item);
  });
};
precombineIncludes = function(includes, list, done) {
  var file, items, _i, _len, _results;
  items = _.select(list, function(file_meta) {
    return _.any(includes, function(include) {
      return include === file_meta.file && !file_meta.combined;
    });
  });
  _results = [];
  for (_i = 0, _len = items.length; _i < _len; _i++) {
    file = items[_i];
    _results.push(combine(file, list, done));
  }
  return _results;
};
var createWatch, triggerProcess;
createWatch = function() {
  var continuous, dir, divedir, onChange, _i, _len, _ref, _results;
  continuous = false;
  onChange = triggerProcess;
  divedir = function(dir) {
    return dive(dir, {
      recursive: false,
      all: false
    }, function(err, file) {
      if (!err) {
        return fs.watch(file, {
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
  _ref = [config.source, config.spec, config.ext];
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    dir = _ref[_i];
    _results.push(divedir(dir));
  }
  return _results;
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