QUnit.specify("demo.js", function() {
    describe("a test", function() {
        it("should show something on the page", function()
        {
            assert(true).equals(true);
        });
        it("should show something **really** {{ SPECIAL }} on the page", function()
        {
            assert(true).equals(true);
        });
        it("should appreciate the fact that 1 === 1", function()
        {
            assert(1).equals(1);
        });
    });
    describe("Test2 stuff", function() {
        it("should have the someProp value set", function() {
            assert(window.test2.someProp).equals("Howdy Neighbor");
        });
    });
});
