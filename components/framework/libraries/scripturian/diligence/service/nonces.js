//
// This file is part of Diligence
//
// Copyright 2011-2015 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/prudence/logging/',
	'/sincerity/objects/',
	'/mongodb/')

var Diligence = Diligence || {}

/**
 * Unique, expirable nonce (number-used-once) implementation. Uses a
 * MongoDB collection to store nonce entries.
 * 
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.2
 */
Diligence.Nonces = Diligence.Nonces || function() {
	/** @exports Public as Diligence.Nonces */
    var Public = {}

	/**
	 * The library's logger.
	 *
	 * @field
	 * @returns {Prudence.Logging.Logger}
	 */
	Public.logger = Prudence.Logging.getLogger('nonces')
	
	/**
	 * Creates a nonce.
	 * 
	 * @param {Number} [duration=application.globals.get('diligence.service.nonces.defaultDuration')] Duration in milliseconds after which the nonce will expire
	 *        (use 0 to create a nonce that immediately expires)
	 * @param {Date} [now=new Date()] Used to calculate the expiration
	 * @return {String} The nonce
	 */
	Public.create = function(duration, now) {
		var nonce = MongoUtil.id()
		
		duration = Sincerity.Objects.ensure(duration, defaultDuration)
		if (duration > 0) {
			var expiration = now ? new Date(now.getTime()) : new Date()
			expiration.setMilliseconds(expiration.getMilliseconds() + duration)
			getNoncesCollection().insertOne({_id: nonce, expiration: expiration})
		}
		
		nonce = String(nonce)
		
		if (duration > 0) {
			Public.logger.info('Created: ' + nonce)
		}
		
		return nonce
	}
	
	/**
	 * True if the nonce is valid, and if so invalidates it,
	 * so that it is "used only once" (this is done atomically).
	 * 
	 * @param {String} nonce The nonce to check
	 * @param {Date} [now=new Date()] Used to calculate the expiration
	 * @returns {Boolean}
	 */
	Public.check = function(nonce, now) {
		var entry = nonce ? getNoncesCollection().withWriteConcern({w: 1}).findOneAndDelete({_id: MongoUtil.id(nonce)}) : null

		if (entry) {
			now = now || new Date()
			if (entry.expiration > now) {
				Public.logger.info('Used: ' + nonce)
				return true
			}
		}

		Public.logger.info('Failed check: ' + nonce)
		return false
	}
	
	/**
	 * Removes expired nonces, to save storage space.
	 * 
	 * @param {Date} [now=new Date()] Used to calculate the expiration
	 */
	Public.prune = function(now) {
		now = now || new Date()
		var result = getNoncesCollection().deleteMany({expiration: {$lte: now}})
		
		if (result && result.deletedCount) {
			Public.logger.info('Removed {0} stale {1}', result.deletedCount, result.deletedCount > 1 ? 'nonces' : 'nonce')
		}
	}
	
	//
	// Private
	//
	
	function getNoncesCollection() {
		if (!Sincerity.Objects.exists(noncesCollection)) {
			noncesCollection = MongoDatabase.global().collection('nonces')
		}
		return noncesCollection
	}
	
	//
	// Initialization
	//
	
	var noncesCollection

	var defaultDuration = application.globals.get('diligence.service.nonces.defaultDuration') || (15 * 60 * 1000)
	
	return Public	
}()
