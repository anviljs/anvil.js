(function(context) {
var Test1 = function() {
    this.sayHi = function() { console.log( "Hi. Test1 anyone?" ); };
};
var Test2 = function() {
    this.sayHi = function() { console.log( "Hi. I am Test #2. How do you do?" ); };
    this.someProp = "Howdy Neighbor";
};
console.log("Hai!  Test2 here in the flesh...yet again, oh yay!");

context.test1 = new Test1();
test1.sayHi();
context.test2 = new Test2();
test2.sayHi();

})(this);