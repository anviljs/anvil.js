QUnit.specify("demo.js", function() {
    describe("a test", function() {
        it("should show something on the page", function()
        {
            assert(true).equals(true);
        });
        it("should show something {{ SPECIAL }} on the page", function()
        {
            assert(true).equals(true);
        });
    });
});
