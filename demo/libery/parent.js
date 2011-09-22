(function(context) {
var Test1 = function() {
    this.sayHi = function() { console.log( "Hi. Test1 anyone?" ); };
};
var Test2 = function() {
    this.sayHi = function() { console.log( "Hi. I am Test2. How do you do?" ); };
};
var test1 = new Test1();
test1.sayHi();
var test2 = new Test2();
test2.sayHi();

})(this);