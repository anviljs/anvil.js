_ = require "underscore"
class Scheduler

	constructor: () ->

	parallel: ( items, worker, onComplete ) ->
		# Fail fast if list is empty
		if not items or items.length == 0
			onComplete []
		count = items.length
		results = []
		# Pushes _result_ (if truthy) onto the _results_ list and, if there are no more
		# items, calls _onComplete_ with _results_
		done = ( result ) ->
			count = count - 1
			# Is _result_ truthy?
			if result
				# Append to _results_!
				results.push result
			# Is iteration complete?
			if count == 0
				# Call _onComplete_!
				onComplete( results )
		# Iteration occurs here
		worker( item, done ) for item in items


	pipeline: ( item, workers, onComplete ) ->
		# Fail fast if list is empty
		if item == undefined or not workers or workers.length == 0
			onComplete item || {}

		iterate = ( done ) ->
			worker = workers.shift()
			worker item, done
		done = ->

		done = ( product ) ->
			item = product
			# Any workers remaining?
			if workers.length == 0
				# Call _onComplete_!
				onComplete( product )
			else
				iterate done

		iterate done

	aggregate: ( calls, onComplete ) ->
		results = {}
		isDone = () -> 
			_.chain( calls ).keys().all( ( x ) -> results[ x ] != undefined ).value()
		
		getCallback = ( name ) ->
			( result ) ->
				results[ name ] = result
				if isDone()
					onComplete results

		_.each( calls, ( call, name ) ->
			callback = getCallback name
			call callback
		)

scheduler = new Scheduler()

exports.scheduler = scheduler
