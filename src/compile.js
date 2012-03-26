(function() {
  var Compiler, coffeeKup, coffeeScript, haml, less, marked, stylus;

  coffeeScript = require("coffee-script");

  less = require("less");

  stylus = require("stylus");

  haml = require("haml");

  marked = require("marked");

  marked.setOptions({
    sanitize: false
  });

  coffeeKup = require("coffeekup");

  Compiler = (function() {

    function Compiler(fp, log) {
      this.fp = fp;
      this.log = log;
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
      var log, newFile;
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
      var log, newFile;
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
      var log, newFile;
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
      var log, newFile;
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
      var log, newFile;
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
      var log, newFile;
      newFile = file.name.replace(".sass", ".css");
      log = this.log;
      return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
        try {
          return stylus.render(x, {}, function(e, css) {
            return onContent(css);
          });
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
      var log, newFile;
      newFile = file.name.replace(".scss", ".css");
      log = this.log;
      return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
        try {
          return stylus.render(x, {}, function(e, css) {
            return onContent(css);
          });
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
      var log, newFile;
      newFile = file.name.replace(".styl", ".css");
      log = this.log;
      return this.fp.transform([file.workingPath, file.name], function(x, onContent) {
        try {
          return stylus.render(x, {}, function(e, css) {
            return onContent(css);
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

}).call(this);
