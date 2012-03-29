var Anvil, ArgParser, Combiner, Compiler, Configuration, FSProvider, ImagePipeline, Log, MarkupPipeline, Scheduler, SourcePipeline, StylePipeline, builder, coffeeKup, coffeeScript, colors, config, continuous, cssminifier, debug, dive, emitter, events, express, ext, extensionLookup, fp, fs, gzipper, haml, inProcess, jslint, jsp, less, libConfig, log, marked, mkdir, path, pro, quiet, resource, scheduler, scss, siteConfig, stylus, test, version, _;
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
cssminifier = require("cssmin");
Log = (function() {
  function Log() {}
  Log.prototype.onEvent = function(x) {
    if (!quiet) {
      return console.log("   " + x);
    }
  };
  Log.prototype.onStep = function(x) {
    if (!quiet) {
      return console.log(("" + x).blue);
    }
  };
  Log.prototype.onComplete = function(x) {
    return console.log(("" + x).green);
  };
  Log.prototype.onError = function(x) {
    return console.log(("!!! " + x + " !!!").red);
  };
  return Log;
})();
log = new Log();
exports.log = log;
_ = require("underscore");
path = require("path");
config = {};
siteConfig = {
  "source": "src",
  "style": "style",
  "markup": "markup",
  "output": {
    "source": ["lib", "site/js"],
    "style": ["css", "site/css"],
    "markup": "site/"
  },
  "spec": "spec",
  "ext": "ext",
  "lint": {},
  "uglify": {},
  "cssmin": {},
  "gzip": {},
  "hosts": {
    "/": "site"
  }
};
libConfig = {
  "source": "src",
  "output": "lib",
  "spec": "spec",
  "ext": "ext",
  "lint": {},
  "uglify": {},
  "gzip": {},
  "hosts": {
    "/": "spec"
  }
};
continuous = test = inProcess = quiet = debug = false;
version = "0.8.0";
ext = {
  gzip: "gz",
  uglify: "min",
  cssmin: "min"
};
extensionLookup = {
  ".css": "style",
  ".scss": "style",
  ".sass": "style",
  ".less": "style",
  ".stylus": "style",
  ".js": "source",
  ".coffee": "source",
  ".markdown": "markup",
  ".md": "markup",
  ".markdown": "markup",
  ".html": "markup"
};
Configuration = (function() {
  function Configuration(fp, parser, scheduler, log) {
    this.fp = fp;
    this.parser = parser;
    this.scheduler = scheduler;
    this.log = log;
  }
  Configuration.prototype.configure = function(onConfig) {
    var buildFile, buildOpt, createLibFile, createSiteFile, exists, host, htmlPage, libScaffold, mocha, name, pavlov, scaffold, self, showVersion, siteScaffold, type;
    self = this;
    this.parser.addValueOptions(["b", "build", "n", "html", "site", "lib", "libfile", "sitefile"]);
    this.parser.parse();
    buildOpt = this.parser.getOptions("b", "build");
    buildFile = buildOpt ? buildOpt : "./build.json";
    createLibFile = this.parser.getOptions("libfile");
    createSiteFile = this.parser.getOptions("sitefile");
    continuous = this.parser.getOptions("ci");
    host = this.parser.getOptions("h", "host");
    htmlPage = this.parser.getOptions("html");
    libScaffold = this.parser.getOptions("lib");
    mocha = this.parser.getOptions("m", "mocha");
    quiet = this.parser.getOptions("q", "quiet");
    pavlov = this.parser.getOptions("p", "pavlov");
    showVersion = this.parser.getOptions("v", "version");
    siteScaffold = this.parser.getOptions("site");
    if (showVersion) {
      this.log.onEvent("Anvil.js " + version);
      return onConfig(config);
    } else if (createLibFile || createSiteFile) {
      name = createLibFile || (createLibFile = createSiteFile);
      type = createSiteFile ? 'site' : 'lib';
      return this.writeConfig(type, "" + name + ".json", function() {
        return onConfig(config);
      });
    } else if (siteScaffold || libScaffold) {
      scaffold = siteScaffold || (siteScaffold = libScaffold);
      type = siteScaffold ? 'site' : 'lib';
      this.log.onStep("Creating scaffolding for new " + type + " project");
      return this.writeConfig(type, scaffold + "/build.json", function() {
        return self.ensurePaths(function() {
          return onConfig(config);
        }, scaffold);
      });
    } else if (htmlPage) {
      config.genHtml = htmlPage;
      return onConfig(config);
    } else {
      this.log.onStep("Checking for config...");
      exists = this.fp.pathExists(buildFile);
      return this.prepConfig(exists, buildFile, function() {
        if (pavlov || mocha) {
          config.testWith = mocha ? "mocha" : "pavlov";
        }
        if (host) {
          config.host = true;
        }
        if (continuous) {
          config.continuous = true;
        }
        return self.ensurePaths(function() {
          return onConfig(config);
        });
      });
    }
  };
  Configuration.prototype.createLibBuild = function() {
    var output;
    if (buildLibTemplate) {
      output = buildLibTemplate === true ? "build.json" : buildLibTemplate;
      writeConfig("lib", output);
      global.process.exit(0);
      return config;
    }
  };
  Configuration.prototype.createSiteBuild = function() {
    var output;
    if (buildSiteTemplate) {
      output = buildSiteTemplate === true ? "build.json" : buildSiteTemplate;
      writeConfig("site", output);
      global.process.exit(0);
      return config;
    }
  };
  Configuration.prototype.ensurePaths = function(onComplete, prefix) {
    var fp, paths, worker;
    prefix = prefix || (prefix = "");
    config.working = config.working || "./tmp";
    fp = this.fp;
    if (_.isObject(config.output)) {
      paths = _.flatten(config.output);
      paths.push(config["source"]);
      paths.push(config["style"]);
      paths.push(config["markup"]);
      paths.push(config["spec"]);
      paths.push(config["ext"]);
      paths.push(config["working"]);
      worker = function(p, done) {
        return fp.ensurePath([prefix, p], done);
      };
      return this.scheduler.parallel(paths, worker, function() {
        return onComplete();
      });
    } else {
      return fp.ensurePath(config.output, function() {
        return fp.ensurePath(config.working, function() {
          return onComplete();
        });
      });
    }
  };
  Configuration.prototype.prepConfig = function(exists, file, onComplete) {
    if (!exists) {
      return this.loadConvention(onComplete);
    } else {
      return this.loadConfig(file, onComplete);
    }
  };
  Configuration.prototype.loadConfig = function(file, onComplete) {
    var fp;
    this.log.onStep("Loading config...");
    fp = this.fp;
    return fp.read(file, function(content) {
      config = JSON.parse(content);
      if (config.extensions) {
        ext.gzip = config.extensions.gzip || ext.gzip;
        ext.uglify = config.extensions.uglify || ext.uglify;
      }
      if (config.finalize) {
        if (config.finalize['header-file']) {
          config.finalize.header = fp.readSync(config.finalize['header-file'], 'utf-8');
        }
        if (config.finalize['footer-file']) {
          config.finalize.footer = fp.readSync(config.finalize['footer-file'], 'utf-8');
        }
      }
      return onComplete();
    });
  };
  Configuration.prototype.loadConvention = function(onComplete) {
    var conventionConfig;
    conventionConfig = this.fp.pathExists("./site") ? siteConfig : libConfig;
    this.log.onStep("Loading convention...");
    config = conventionConfig;
    return onComplete();
  };
  Configuration.prototype.writeConfig = function(type, name, onComplete) {
    var json;
    config = type === "lib" ? libConfig : siteConfig;
    log = this.log;
    json = JSON.stringify(config, null, "\t");
    return this.fp.write(name, json, function() {
      log.onComplete("" + name + " created successfully!");
      return onComplete();
    });
  };
  return Configuration;
})();
exports.configuration = Configuration;
Scheduler = (function() {
  function Scheduler() {}
  Scheduler.prototype.parallel = function(items, worker, onComplete) {
    var count, done, item, results, _i, _len, _results;
    if (!items || items === []) {
      onComplete([]);
    }
    count = items.length;
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
    for (_i = 0, _len = items.length; _i < _len; _i++) {
      item = items[_i];
      _results.push(worker(item, done));
    }
    return _results;
  };
  Scheduler.prototype.pipeline = function(item, workers, onComplete) {
    var done, iterate;
    if (item === void 0 || !workers || workers.length === 0) {
      onComplete(item || {});
    }
    iterate = function(done) {
      var worker;
      worker = workers.shift();
      return worker(item, done);
    };
    done = function() {};
    done = function(product) {
      item = product;
      if (workers.length === 0) {
        return onComplete(product);
      } else {
        return iterate(done);
      }
    };
    return iterate(done);
  };
  return Scheduler;
})();
scheduler = new Scheduler();
exports.scheduler = scheduler;
fs = require("fs");
_ = require("underscore");
FSProvider = (function() {
  function FSProvider() {}
  FSProvider.prototype.buildPath = function(pathSpec) {
    var fullPath;
    if (!pathSpec) {
      return "";
    } else {
      fullPath = pathSpec;
      if (_.isArray(pathSpec)) {
        fullPath = path.join.apply({}, pathSpec);
      }
      return fullPath;
    }
  };
  FSProvider.prototype["delete"] = function(filePath, onDeleted) {
    var file;
    filePath = this.buildPath(filePath);
    file = this.files[filePath];
    if (file) {
      delete this.files(filePath);
      return file["delete"](onDeleted);
    } else {
      throw new Error("Cannot delete " + filePath + " - it does not exist");
      return process.exit(1);
    }
  };
  FSProvider.prototype.ensurePath = function(pathSpec, onComplete) {
    pathSpec = this.buildPath(pathSpec);
    return path.exists(pathSpec, function(exists) {
      if (!exists) {
        return mkdir(pathSpec, "0755", function(err) {
          if (err) {
            return log.onError("Could not create " + pathSpec + ". " + err);
          } else {
            return onComplete();
          }
        });
      } else {
        return onComplete();
      }
    });
  };
  FSProvider.prototype.getFiles = function(filePath, onFiles) {
    var files;
    if (!filePath) {
      onFiles([]);
    }
    filePath = this.buildPath(filePath);
    files = [];
    return dive(filePath, {
      recursive: true
    }, function(err, file) {
      if (!err) {
        return files.push(file);
      }
    }, function() {
      return onFiles(files);
    });
  };
  FSProvider.prototype.move = function(from, to, done) {
    var readStream, writeStream;
    from = this.buildPath(from);
    to = this.buildPath(to);
    readStream = void 0;
    writeStream = fs.createWriteStream(to);
    (readStream = fs.createReadStream(from)).pipe(writeStream);
    return readStream.on('end', function() {
      if (writeStream) {
        writeStream.destroySoon();
      }
      return done();
    });
  };
  FSProvider.prototype.pathExists = function(pathSpec) {
    pathSpec = this.buildPath(pathSpec);
    return path.existsSync(pathSpec);
  };
  FSProvider.prototype.read = function(filePath, onContent) {
    filePath = this.buildPath(filePath);
    return fs.readFile(filePath, "utf8", function(err, content) {
      if (err) {
        log.onError("Could not read " + filePath + " : " + err);
        return onContent("", err);
      } else {
        return onContent(content);
      }
    });
  };
  FSProvider.prototype.readSync = function(filePath) {
    filePath = this.buildPath(filePath);
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (err) {
      log.onError("Could not read " + filePath + " : " + err);
      return err;
    }
  };
  FSProvider.prototype.transform = function(filePath, transform, outputPath, onComplete) {
    var self;
    self = this;
    filePath = this.buildPath(filePath);
    outputPath = this.buildPath(outputPath);
    return this.read(filePath, function(content) {
      return transform(content, function(newContent, error) {
        if (!error) {
          return self.write(outputPath, newContent, onComplete);
        } else {
          return onComplete(error);
        }
      });
    });
  };
  FSProvider.prototype.write = function(filePath, content, onComplete) {
    filePath = this.buildPath(filePath);
    return fs.writeFile(filePath, content, "utf8", function(err) {
      if (err) {
        log.onError("Could not write " + filePath + " : " + err);
        return onComplete(err);
      } else {
        return onComplete();
      }
    });
  };
  return FSProvider;
})();
fp = new FSProvider();
exports.fsProvider = fp;
coffeeScript = require("coffee-script");
less = require("less");
stylus = require("stylus");
scss = require("scss");
haml = require("haml");
marked = require("marked");
marked.setOptions({
  sanitize: false
});
coffeeKup = require("coffeekup");
_ = require("underscore");
Compiler = (function() {
  function Compiler(fp, log) {
    this.fp = fp;
    this.log = log;
    _.bindAll(this);
  }
  Compiler.prototype.compile = function(file, onComplete) {
    var self;
    self = this;
    switch (file.ext()) {
      case ".coffee":
        return self.compileCoffee(file, onComplete);
      case ".less":
        return self.compileLess(file, onComplete);
      case ".sass":
        return self.compileSass(file, onComplete);
      case ".scss":
        return self.compileScss(file, onComplete);
      case ".styl":
        return self.compileStylus(file, onComplete);
      case ".haml":
        return self.compileHaml(file, onComplete);
      case ".md":
        return self.compileMarkdown(file, onComplete);
      case ".markdown":
        return self.compileMarkdown(file, onComplete);
      case ".kup":
        return self.compileCoffeeKup(file, onComplete);
    }
  };
  Compiler.prototype.compileCoffee = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(".coffee", ".js");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(content, onContent) {
      var js;
      try {
        js = coffeeScript.compile(content, {
          bare: true
        });
        return onContent(js);
      } catch (error) {
        log.onError("Coffee compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function(err) {
      if (!err) {
        file.name = newFile;
        return onComplete();
      } else {
        return onComplete(err);
      }
    });
  };
  Compiler.prototype.compileCoffeeKup = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(".kup", ".html");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(content, onContent) {
      var html;
      try {
        html = (coffeeKup.compile(content, {}))();
        return onContent(html);
      } catch (error) {
        log.onError("CoffeeKup compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function(err) {
      if (!err) {
        file.name = newFile;
        return onComplete();
      } else {
        return onComplete(err);
      }
    });
  };
  Compiler.prototype.compileHaml = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(".haml", ".html");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(content, onContent) {
      var html;
      try {
        html = haml.render(content);
        return onContent(html);
      } catch (error) {
        log.onError("Haml compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function() {
      file.name = newFile;
      return onComplete();
    });
  };
  Compiler.prototype.compileLess = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(".less", ".css");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
      try {
        return less.render(x, {}, function(e, css) {
          return onContent(css);
        });
      } catch (error) {
        log.onError("LESS compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function() {
      file.name = newFile;
      return onComplete();
    });
  };
  Compiler.prototype.compileMarkdown = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(/[.](markdown|md)$/, ".html");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
      try {
        return onContent(marked.parse(x));
      } catch (error) {
        log.onError("Markdown compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function() {
      file.name = newFile;
      return onComplete();
    });
  };
  Compiler.prototype.compileSass = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(".sass", ".css");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
      try {
        return onContent("");
      } catch (error) {
        log.onError("SASS compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function(err) {
      file.name = newFile;
      return onComplete();
    });
  };
  Compiler.prototype.compileScss = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(".scss", ".css");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
      try {
        return onContent("");
      } catch (error) {
        log.onError("SCSS compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function(err) {
      file.name = newFile;
      return onComplete();
    });
  };
  Compiler.prototype.compileStylus = function(file, onComplete) {
    var newFile;
    newFile = file.name.replace(".styl", ".css");
    log = this.log;
    return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
      try {
        return stylus.render(x, {}, function(e, css) {
          return onContent(css, e);
        });
      } catch (error) {
        log.onError("Stylus compiler exception on file: " + file + " \r\n\t " + error);
        return onContent("", error);
      }
    }, [file.workingPath, newFile], function() {
      file.name = newFile;
      return onComplete();
    });
  };
  return Compiler;
})();
exports.compiler = Compiler;
_ = require("underscore");
Combiner = (function() {
  function Combiner(fp, scheduler, findPatterns, replacePatterns) {
    this.fp = fp;
    this.scheduler = scheduler;
    this.findPatterns = findPatterns;
    this.replacePatterns = replacePatterns;
  }
  Combiner.prototype.combineList = function(list, onComplete) {
    var combineFile, findDependents, findImports, forAll, self;
    self = this;
    forAll = this.scheduler.parallel;
    findImports = _.bind(function(file, done) {
      return self.findImports(file, list, done);
    }, this);
    findDependents = _.bind(function(file, done) {
      return self.findDependents(file, list, done);
    }, this);
    combineFile = _.bind(function(file, done) {
      return self.combineFile(file, done, this);
    });
    return forAll(list, findImports, function() {
      var f1, _i, _len;
      for (_i = 0, _len = list.length; _i < _len; _i++) {
        f1 = list[_i];
        findDependents(f1, list);
      }
      return forAll(list, combineFile, onComplete);
    });
  };
  Combiner.prototype.combineFile = function(file, onComplete) {
    var combineFile, dependencies, forAll, self;
    self = this;
    forAll = this.scheduler.parallel;
    if (file.combined) {
      return onComplete();
    } else {
      combineFile = function(file, done) {
        return self.combineFile(file, done);
      };
      dependencies = file.imports;
      if (dependencies && dependencies.length > 0) {
        return forAll(dependencies, combineFile, function() {
          return self.combine(file, function() {
            file.combined = true;
            return onComplete();
          });
        });
      } else {
        return self.combine(file, function() {
          file.combined = true;
          return onComplete();
        });
      }
    }
  };
  Combiner.prototype.findImports = function(file, list, onComplete) {
    var imports, self;
    self = this;
    imports = [];
    return this.fp.read([file.workingPath, file.name], function(content) {
      var importName, imported, importedFile, pattern, _i, _j, _len, _len2, _ref;
      _ref = self.findPatterns;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pattern = _ref[_i];
        imports = imports.concat(content.match(pattern));
      }
      imports = _.filter(imports, function(x) {
        return x;
      });
      for (_j = 0, _len2 = imports.length; _j < _len2; _j++) {
        imported = imports[_j];
        importName = (imported.match(/['\"].*['\"]/))[0].replace(/['\"]/g, "");
        importedFile = _.find(list, function(i) {
          return i.name === importName;
        });
        file.imports.push(importedFile);
      }
      return onComplete();
    });
  };
  Combiner.prototype.findDependents = function(file, list) {
    var imported, item, _i, _len, _results;
    imported = function(importFile) {
      return file.name === importFile.name;
    };
    _results = [];
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      item = list[_i];
      _results.push(_.any(item.imports, imported) ? file.dependents++ : void 0);
    }
    return _results;
  };
  Combiner.prototype.combine = function(file, onComplete) {
    var imported, pipe, self, steps;
    self = this;
    if (!file.combined) {
      pipe = this.scheduler.pipeline;
      fp = this.fp;
      if (file.imports.length > 0) {
        steps = (function() {
          var _i, _len, _ref, _results;
          _ref = file.imports;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            imported = _ref[_i];
            _results.push(self.getStep(imported));
          }
          return _results;
        })();
        return fp.read([file.workingPath, file.name], function(main) {
          return pipe(main, steps, function(result) {
            return fp.write([file.workingPath, file.name], result, function() {
              return onComplete();
            });
          });
        });
      } else {
        return onComplete();
      }
    } else {
      return onComplete();
    }
  };
  Combiner.prototype.getStep = function(i) {
    var self;
    self = this;
    return function(text, onDone) {
      return self.replace(text, i, onDone);
    };
  };
  Combiner.prototype.replace = function(content, imported, onComplete) {
    var patterns, pipe, source, working;
    patterns = this.replacePatterns;
    pipe = this.scheduler.pipeline;
    source = imported.name;
    working = imported.workingPath;
    return this.fp.read([working, source], function(newContent) {
      var pattern, steps;
      steps = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = patterns.length; _i < _len; _i++) {
          pattern = patterns[_i];
          _results.push(function(current, done) {
            var fullPattern, stringified;
            stringified = pattern.toString().replace(/replace/, source);
            stringified = stringified.substring(1, stringified.length - 2);
            fullPattern = new RegExp(stringified, "g");
            return done(current.replace(fullPattern, newContent));
          });
        }
        return _results;
      })();
      return pipe(content, steps, function(result) {
        return onComplete(result);
      });
    });
  };
  return Combiner;
})();
exports.combiner = Combiner;
StylePipeline = (function() {
  function StylePipeline(config, fp, minifier, scheduler, log) {
    this.config = config;
    this.fp = fp;
    this.minifier = minifier;
    this.scheduler = scheduler;
    this.log = log;
  }
  StylePipeline.prototype.process = function(files, onComplete) {
    return this.scheduler.parallel(files, this.minify, function() {
      return onComplete;
    });
  };
  StylePipeline.prototype.minify = function(file, onComplete) {
    var newFile, self;
    self = this;
    ext = file.ext();
    newFile = file.name.replace(ext, "min.css");
    return self.fp.transform([file.workingPath, file.name], function(content, onTransform) {
      return onTransform(self.minifier.cssmin(content));
    }, [file.workingPath, newFile], function() {
      file.name = newFile;
      return onComplete();
    });
  };
  return StylePipeline;
})();
SourcePipeline = (function() {
  function SourcePipeline(config, fp, minifier, scheduler, log) {
    this.config = config;
    this.fp = fp;
    this.minifier = minifier;
    this.scheduler = scheduler;
    this.log = log;
  }
  SourcePipeline.prototype.process = function(files, onComplete) {
    var self;
    self = this;
    return this.scheduler.parallel(files, this.finalize, function() {
      return self.scheduler.parallel(files, self.minify, function() {
        return self.scheduler.parallel(files, self.finalize, function() {
          return onComplete();
        });
      });
    });
  };
  SourcePipeline.prototype.minify = function(file, onComplete) {
    var newFile, self;
    self = this;
    ext = file.ext();
    newFile = file.name.replace(ext, "min.js");
    return this.fp.transform([file.workingPath, file.name], function(content, onTransform) {
      return self.minifier(content, function(err, result) {
        if (err) {
          self.onError("Error minifying " + file.name + " : \r\n\t " + err);
          result = content;
        }
        return onTransform(content);
      });
    }, [file.workingPath, newFile], function() {
      file.name = newFile;
      return onComplete();
    });
  };
  SourcePipeline.prototype.finalize = function(file, onComplete) {
    var footer, header, self;
    self = this;
    if (this.config.finalize) {
      header = this.config.finalize.header;
      footer = this.config.finalize.footer;
      return this.fp.transform([file.workingPath, file.name], function(content, onTransform) {
        if (header) {
          content = header + content;
        }
        if (footer) {
          content = content + footer;
        }
        return onTransform(content);
      }, [file.workingPath, file.name], onComplete);
    } else {
      return onComplete();
    }
  };
  return SourcePipeline;
})();
MarkupPipeline = (function() {
  function MarkupPipeline() {}
  return MarkupPipeline;
})();
ImagePipeline = (function() {
  function ImagePipeline() {}
  return ImagePipeline;
})();
Anvil = (function() {
  function Anvil(config, fp, compiler, combiner, scheduler, log) {
    this.config = config;
    this.fp = fp;
    this.compiler = compiler;
    this.combiner = combiner;
    this.scheduler = scheduler;
    this.log = log;
    config = this.config;
    this.filesBuilt = {};
    this.steps = {
      source: false,
      style: false,
      markup: false,
      hasSource: config.source,
      hasStyle: config.style,
      hasMarkup: config.markup,
      markupReady: function() {
        return (this.source || !this.hasSource) && (this.style || !this.hasStyle);
      },
      allDone: function() {
        return (this.source || !this.hasSource) && (this.style || !this.hasStyle) && (this.markup || !this.hasMarkup);
      }
    };
  }
  Anvil.prototype.build = function() {
    this.buildSource();
    return this.buildStyle();
  };
  Anvil.prototype.buildMarkup = function() {
    var findPatterns, replacePatterns;
    findPatterns = [/[\<][!][-]{2}.?import[(]?.?['\"].*['\"].?[)]?.?[-]{2}[\>]/g];
    replacePatterns = [/[\<][!][-]{2}.?import[(]?.?['\"]replace['\"].?[)]?.?[-]{2}[\>]/g];
    return this.processType("markup", findPatterns, replacePatterns);
  };
  Anvil.prototype.buildSource = function() {
    var findPatterns, replacePatterns;
    findPatterns = [/([\/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?.?([\/]{2}|[\#]{3})?/g];
    replacePatterns = [/([\/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?.?([\/]{2}|[\#]{3})?/g];
    return this.processType("source", findPatterns, replacePatterns);
  };
  Anvil.prototype.buildStyle = function() {
    var findPatterns, replacePatterns;
    findPatterns = [/@import[(]?.?[\"'].*[.]css[\"'].?[)]?/g];
    replacePatterns = [/@import[(]?.?[\"']replace[\"'].?[)]?/g];
    return this.processType("style", findPatterns, replacePatterns);
  };
  Anvil.prototype.processType = function(type, findPatterns, replacePatterns) {
    var combiner, compiler, self;
    self = this;
    scheduler = this.scheduler;
    compiler = this.compiler;
    combiner = new this.combiner(this.fp, scheduler, findPatterns, replacePatterns);
    return self.prepFiles(type, function(list) {
      return self.moveFiles(list, function() {
        return combiner.combineList(list, function() {
          return scheduler.parallel(list, compiler.compile, function() {
            return self.finalOutput(list, function() {
              return self.stepComplete(type);
            });
          });
        });
      });
    });
  };
  Anvil.prototype.fileBuilt = function(file) {
    return this.filesBuilt[file.fullPath] = file;
  };
  Anvil.prototype.finalOutput = function(files, onComplete) {
    var final, forAll, move;
    fp = this.fp;
    forAll = this.scheduler.parallel;
    move = function(file, done) {
      return forAll(file.outputPaths, function(destination, moved) {
        return fp.move([file.workingPath, file.name], [destination, file.name], moved);
      }, done);
    };
    final = _.filter(files, function(x) {
      return x.dependents === 0;
    });
    return forAll(final, move, onComplete);
  };
  Anvil.prototype.moveFiles = function(files, onComplete) {
    var move;
    fp = this.fp;
    move = function(file, done) {
      return fp.move(file.fullPath, [file.workingPath, file.name], done);
    };
    return this.scheduler.parallel(files, move, onComplete);
  };
  Anvil.prototype.prepFiles = function(type, onComplete) {
    var output, typePath, working;
    working = this.config.working;
    typePath = this.config[type];
    output = this.config.output[type];
    output = _.isArray(output) ? output : [output];
    log = this.log;
    return this.fp.getFiles(typePath, function(files) {
      var file, list, name;
      log.onEvent("Scanning " + files.length + " " + type + " files ...");
      list = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          name = path.basename(file);
          _results.push({
            dependents: 0,
            ext: function() {
              return path.extname(this.name);
            },
            fullPath: file,
            imports: [],
            name: name,
            originalName: name,
            outputPaths: output,
            relativePath: file.replace(typePath, ""),
            workingPath: working
          });
        }
        return _results;
      })();
      return onComplete(list);
    });
  };
  Anvil.prototype.report = function() {
    return this.log.onComplete("Hey, it's done, bro-ham");
  };
  Anvil.prototype.stepComplete = function(step) {
    this.steps[step] = true;
    if (this.steps.markupReady()) {
      this.buildMarkup();
    }
    if (this.steps.allDone()) {
      return this.report();
    }
  };
  return Anvil;
})();
exports.run = function() {
  var compiler, configuration, parser;
  parser = new ArgParser();
  configuration = new Configuration(fp, parser, scheduler, log);
  compiler = new Compiler(fp, log);
  return configuration.configure(function(config) {
    var anvil;
    anvil = new Anvil(config, fp, compiler, Combiner, scheduler, log);
    return anvil.build();
  });
};