(function() {
  var GoodClass;

  GoodClass = (function() {

    function GoodClass(name) {
      this.name = name;
    }

    GoodClass.prototype.method = function() {
      return console.log('this is a method call!');
    };

    return GoodClass;

  })();

}).call(this);
