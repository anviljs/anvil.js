
class HtmlGenerator
    createPageTemplate: ( name ) ->
        extPath = config.ext or= "./ext"
        libPath = config.output or= "./lib"
        output = name + ".html"

        ensurePath extPath, ->
            externals = fs.readdirSync extPath
            externals = _.map externals, (x) ->
                path.join "..", extPath, x
            libs = fs.readdirSync libPath
            libs = _.select libs, (x) ->
                not x.match ///[.]gz[.]/// and not x.match ///[.]min[.]///
            libs = _.map libs, (x) ->
                path.join "..", libPath, x
            list = externals.concat( libs )

            html = builder.html
            page = html.HTML(
              html.HEAD buildScripts html, list
                html.BODY( )
            )

            writeFileSync output, page.toString(), ->
              onEvent "HTML template #{output} created"
              global.process.exit(0)

    buildScripts = ( html, list ) ->
      _.map list, (x) ->
        html.SCRIPT(
          type: "text/javascript"
          src: x
        )

hostStatic = () ->
    extPath = config.ext or= "./ext"
    libPath = config.output or= "./lib"

    app = express.createServer()
    app.use express.bodyParser()
    app.use app.router

    app.use "/lib", express.static( path.resolve(libPath) )
    app.use "/ext", express.static( path.resolve(extPath) )

    host(app, config.hosts[key], key) for key in _(config.hosts).keys()

    app.get "*.coffee", (req, res) ->
        res.header 'Content-Type', 'application/javascript'
        source = fs.readFileSync "." + req.url, "utf8"
        coffee = coffeeScript.compile source, { bare: true }
        res.send coffee

    app.listen 3080

host = (app, dir, uri) ->
  onComplete "Hosting #{dir} at #{uri}"
  app.use uri, express.static( path.resolve(dir))