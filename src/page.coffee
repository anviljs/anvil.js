# ## HtmlGenerator ##
# Class to create an HTML page with all external dependencies + Anvil output files
# included.
class HtmlGenerator
    # ## createPageTemplate ##
    # Builds the page
    # ### Args:
    # _name {String}_: the filename (before the .html extension)
    createPageTemplate: ( name ) ->
        extPath = config.ext or= "./ext"
        libPath = config.output or= "./lib"
        output = name + ".html"

        # Make sure extPath exists first.
        ensurePath extPath, ->
            # retrieve externals
            externals = fs.readdirSync extPath
            # pre-pend relative path to externals to external JS libs
            externals = _.map externals, (x) ->
                path.join "..", extPath, x
            # retrieve output files
            libs = fs.readdirSync libPath
            # filter out extra versions of output files
            libs = _.select libs, (x) ->
                not x.match ///[.]gz[.]/// and not x.match ///[.]min[.]///
            # pre-pend relative path to output files
            libs = _.map libs, (x) ->
                path.join "..", libPath, x
            # combine externals and output files
            list = externals.concat( libs )

            # builder = DOMBuilder (see libs.coffee)
            html = builder.html
            # build simple HTML page with all externals and output files included
            page = html.HTML(
              html.HEAD buildScripts html, list
                html.BODY( )
            )

            writeFileSync output, page.toString(), ->
              onEvent "HTML template #{output} created"
              global.process.exit(0)


    # ## buildScripts ##
    # Given a DOMBuilder object and a list of script file paths, add script tags
    # for the paths to the object.
    # ### Args:
    # _html {Object}_: the DOMBuilder.html object to append script tags to
    # _list {Array}_: the list of script file paths
    buildScripts = ( html, list ) ->
      _.map list, (x) ->
        html.SCRIPT(
          type: "text/javascript"
          src: x
        )

# ## hostStatic ##
# Creates an express app to serve the static resources at port 3080
hostStatic = () ->
    extPath = config.ext or= "./ext"
    libPath = config.output or= "./lib"

    app = express.createServer()
    app.use express.bodyParser()
    app.use app.router

    # Serve resources from lib and ext directories
    app.use "/lib", express.static( path.resolve(libPath) )
    app.use "/ext", express.static( path.resolve(extPath) )

    host(app, config.hosts[key], key) for key in _(config.hosts).keys()

    # If the resource is a CoffeeScript file, compile and serve as Javascript
    app.get "*.coffee", (req, res) ->
        res.header 'Content-Type', 'application/javascript'
        source = fs.readFileSync "." + req.url, "utf8"
        coffee = coffeeScript.compile source, { bare: true }
        res.send coffee

    app.listen 3080

# ## host ##
# Sets up routes for integration and example/demo pages (hosts key in build.json)
# For example: { hosts: { "/demo" : "./examples/main_demo" } }
# ### Args:
# _app {Object}_: the express app to add routes to
# _dir {String}_: pathspec of the directory to serve
# _uri {String}_: the URI that will serve the directory.
host = (app, dir, uri) ->
  onComplete "Hosting #{dir} at #{uri}"
  app.use uri, express.static( path.resolve(dir))