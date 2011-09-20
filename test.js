var ArgParser = require("argparser");
var parser = new ArgParser().parse();
console.log( parser.getArgs().toString() );
console.log( parser.getOptions("t","test") );
