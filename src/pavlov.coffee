createPage = () ->

    specPath = config.spec or= "./spec"
    extPath = config.ext or= "./ext"
    libPath = config.output or= "./lib"

    ensurePath specPath, ->
      ensurePath extPath, ->
        spec = fs.readdirSync specPath
        spec = _.map spec, (x) ->
            path.join specPath, x
        externals = fs.readdirSync extPath
        externals = _.map externals, (x) ->
            path.join "..", extPath, x
        libs = fs.readdirSync libPath
        libs = _.select libs, (x) ->
            not x.match ///[.]gz[.]/// and not x.match ///[.]min[.]///

        libs = _.map libs, (x) ->
            path.join "..", libPath, x
        list = externals.concat( libs ).concat( spec )

        html = builder.html
        page = html.HTML(
          buildHead( html, list ),
          html.BODY(
            html.H1(
              {"id": "qunit-header"},
              html.H2({"id":"qunit-banner"}),
              html.DIV({"id":"qunit-testrunner-toolbar"}),
              html.H2({"id":"qunit-userAgent"}),
              html.OL({"id":"qunit-tests"})
              )
          )
        )

        writeFileSync "index.html", page.toString(), ->
          onEvent "Pavlov test page generated"

buildHead = (html, list) ->
  pavlovDir = "pavlov"
  qunitCSS = pavlovDir + "/qunit.css"
  jQueryJS = pavlovDir + "/jquery-1.6.4.min.js"
  qunitJS = pavlovDir + "/qunit.js"
  pavlovJS = pavlovDir + "/pavlov.js"

  html.HEAD(
    html.LINK(
      rel: "stylesheet"
      href: qunitCSS
      type: "text/css"
      media: "screen"
    ),
    html.SCRIPT(
      type: "text/javascript"
      src: jQueryJS
    ),
    html.SCRIPT(
      type: "text/javascript"
      src: qunitJS
    ),
    html.SCRIPT(
      type: "text/javascript"
      src: pavlovJS
    ),
    buildScripts html, list
  )

buildScripts = ( html, list ) ->
  _.map list, (x) ->
    html.SCRIPT(
      type: "text/javascript"
      src: x
    )

hostPavlov = () ->
    sourceBase = path.normalize path.join __dirname, "..", "ext"

    unless path.existsSync "./pavlov"
      fs.symlinkSync sourceBase, "./pavlov"

    app = express.createServer()
    app.use express.bodyParser()
    app.use app.router

    app.use "/", express.static( path.resolve(".") )

    app.get "*.coffee", (req, res) ->
        res.header 'Content-Type', 'application/javascript'
        source = fs.readFileSync "." + req.url, "utf8"
        coffee = coffeeScript.compile source, { bare: true }
        res.send coffee

    app.listen 1580