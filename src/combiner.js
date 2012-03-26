(function() {
  var Combiner, _;

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
      findImports = function(file, done) {
        return self.findImports(file, list, done);
      };
      findDependents = function(file, done) {
        return self.findDependents(file, list, done);
      };
      combineFile = _.bind(this.combineFile, this);
      return forAll(list, findImports, function() {
        return forAll(list, findDependents, function() {
          console.log("this never happens :(");
          return forAll(list, combineFile, onComplete);
        });
      });
    };

    Combiner.prototype.combineFile = function(file, onComplete) {
      var dependencies, forAll, self;
      self = this;
      console.log("Combining ... " + this);
      forAll = self.scheduler.parallel;
      if (file.combined) {
        return onComplete(file);
      } else {
        dependencies = file.imports;
        return forAll(dependencies, self.combineFile, function() {
          return self.combine(file, function() {
            file.combined = true;
            return onComplete();
          });
        });
      }
    };

    Combiner.prototype.findImports = function(file, list, onComplete) {
      var imports, self;
      self = this;
      imports = [];
      console.log("Checking imports ...");
      return this.fp.read([file.workingPath, file.name], function(content) {
        var importName, imported, pattern, _i, _j, _len, _len2, _ref;
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
          file.imports.push(_.find(list, function(i) {
            return i.name === importName;
          }));
        }
        return onComplete(file);
      });
    };

    Combiner.prototype.findDependents = function(file, list, onComplete) {
      var imported, item, _i, _len;
      console.log("Checking dependents ...");
      imported = function(importName) {
        return file.name === importName;
      };
      for (_i = 0, _len = list.length; _i < _len; _i++) {
        item = list[_i];
        if (_.any(item.imports, imported)) file.dependents++;
      }
      return onComplete();
    };

    Combiner.prototype.combine = function(file, onComplete) {
      var fp, pipe;
      pipe = this.scheduler.pipeline;
      fp = this.fp;
      return fp.read([file.workingPath, file.name], function(main) {
        var imported, steps;
        steps = (function() {
          var _i, _len, _ref, _results;
          _ref = file.imports;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            imported = _ref[_i];
            _results.push(function(text, onDone) {
              return replace(text, imported, onDone);
            });
          }
          return _results;
        })();
        return pipe(main, steps, function(result) {
          return fp.write([file.workingPath, file.name], result, function() {
            return onComplete();
          });
        });
      });
    };

    Combiner.prototype.replace = function(content, imported, onComplete) {
      var patterns, source, working;
      patterns = this.replacePatterns;
      source = imported.name;
      working = imported.workingPath;
      return this.fp.read([working, source], function(newContent) {
        var fullPattern, pattern, _i, _len;
        for (_i = 0, _len = patterns.length; _i < _len; _i++) {
          pattern = patterns[_i];
          fullPattern = pattern.replace(/replace/, source);
          content = content.replace(fullPattern, newContent);
        }
        return onComplete(content);
      });
    };

    return Combiner;

  })();

  exports.combiner = Combiner;

}).call(this);
