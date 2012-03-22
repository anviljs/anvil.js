class Compiler

    constructor: (@fp) ->

    # ## compile ##
    # Compiles a file with the correct compiler
    # ### Args:
    # * _sourcePath {String}_: directory pathspec where _file_ is located
    # * _file {Object}_: file metadata for the file to compile
    # * _onComplete {Function}_: function to invoke when done
    compile: ( file, onComplete ) ->
        switch file.ext
            when ".coffee" then compileCoffee file, onComplete
            when ".less" then compileLess file, onComplete
            when ".sass" then compileSass file, onComplete
            when ".scss" then compileScss file, onComplete
            when ".styl" then compileStylus file, onComplete
            when ".haml" then compileHaml file, onComplete
            when ".md" then compileMarkdown file, onComplete
            when ".markdown" then compileMarkdown file, onComplete


    # ## compileCoffee ##
    # Compiles CoffeeScript _file_ to a Javascript file
    # ### Args:
    # * _sourcePath {String}_: directory pathspec where _file_ is located
    # * _file {String}_: filename to compile
    compileCoffee: ( file, onComplete ) ->
        newFile = file.replace ".coffee", ".js"
        @fp.transform(
            [ file.workingPath, file.name ],
            ( x ) ->
              try
                coffeeScript.compile x, { bare: true }
              catch error
                log.onError "Coffee compiler exception on file: #{ file } \r\n\t #{ error }"
                process.exit 1
            [ file.workingPath, newFile ],
            () ->
                file.name = newFile
                onComplete()
        )
        

    # ## compileHaml ##
    # Compiles HAML _file_ to a HTML file
    # ### Args:
    # * _file {String}_: filename to compile
    # * _onComplete {Function}_: function to invoke when done
    compileHaml: ( file, onComplete ) ->
        newFile = file.replace ".haml", ".html"
        @fp.transform(
            [ file.workingPath, file.name ],
            ( x, onContent ) ->
              try
                onContent( haml.render( x ) )
              catch error
                log.onError "Haml compiler exception on file: #{ file } \r\n\t #{ error }"
                process.exit 1
            [ file.workingPath, newFile ],
            () ->
                file.name = newFile
                onComplete()
        )

    # ## compileLess ##
    # Compiles LESS _file_ to a CSS file
    # ### Args:
    # * _file {String}_: filename to compile
    # * _onComplete {Function}_: function to invoke when done
    compileLess: ( file, onComplete ) ->
        newFile = file.replace ".less", ".css"
        @fp.transform(
            [ file.workingPath, file.name ],
            ( x, onContent ) ->
              try
                less.render( x, {}, (e, css) -> onContent(css) )
              catch error
                log.onError "LESS compiler exception on file: #{ file } \r\n\t #{ error }"
                process.exit 1
            [ file.workingPath, newFile ],
            () ->
                file.name = newFile
                onComplete()
        )

    # ## compileMarkdown ##
    # Compiles Markdown _file_ to a HTML file
    # ### Args:
    # * _file {String}_: filename to compile
    # * _onComplete {Function}_: function to invoke when done
    compileMarkdown: ( file, onComplete ) ->
        newFile = file.replace ///[.](markdown|md)$///, ".html"
        @fp.transform(
            [ file.workingPath, file.name ],
            ( x, onContent ) ->
              try
                onContent( marked.parse( x ) )
              catch error
                log.onError "Markdown compiler exception on file: #{ file } \r\n\t #{ error }"
                process.exit 1
            [ file.workingPath, newFile ],
            () ->
                file.name = newFile
                onComplete()
        )

    # ## compileSass ##
    # Compiles SASS _file_ to a CSS file
    # ### Args:
    # * _file {String}_: filename to compile
    # * _onComplete {Function}_: function to invoke when done
    compileSass: ( file, onComplete ) ->
        newFile = file.replace ".sass", ".css"
        @fp.transform(
            [ file.workingPath, file.name ],
            ( x, onContent ) ->
              try
                stylus.render( x, {}, (e, css) -> onContent(css) )
              catch error
                log.onError "SASS compiler exception on file: #{ file } \r\n\t #{ error }"
                process.exit 1
            [ file.workingPath, newFile ],
            () ->
                file.name = newFile
                onComplete()
        )

    # ## compileScss ##
    # Compiles SCSS _file_ to a CSS file
    # ### Args:
    # * _file {String}_: filename to compile
    # * _onComplete {Function}_: function to invoke when done
    compileScss: ( file, onComplete ) ->
        newFile = file.replace ".scss", ".css"
        @fp.transform(
            [ file.workingPath, file.name ],
            ( x, onContent ) ->
              try
                stylus.render( x, {}, (e, css) -> onContent(css) )
              catch error
                log.onError "SCSS compiler exception on file: #{ file } \r\n\t #{ error }"
                process.exit 1
            [ file.workingPath, newFile ],
            () ->
                file.name = newFile
                onComplete()
        )

    # ## compileStylus ##
    # Compiles STYLUS _file_ to a CSS file
    # ### Args:
    # * _file {String}_: filename to compile
    # * _onComplete {Function}_: function to invoke when done
    compileStylus: ( file, onComplete ) ->
        newFile = file.replace ".styl", ".css"
        @fp.transform(
            [ file.workingPath, file.name ],
            ( x, onContent ) ->
              try
                stylus.render( x, {}, (e, css) -> onContent(css) )
              catch error
                log.onError "Stylus compiler exception on file: #{ file } \r\n\t #{ error }"
                process.exit 1
            [ file.workingPath, newFile ],
            () ->
                file.name = newFile
                onComplete()
        )

