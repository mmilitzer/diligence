//
// This file is part of Diligence
//
// Copyright 2011-2014 Three Crickets LLC.
//
// The contents of this file are subject to the terms of the LGPL version 3.0:
// http://www.gnu.org/copyleft/lesser.html
//
// Alternatively, you can obtain a royalty free commercial license with less
// limitations, transferable or non-transferable, directly from Three Crickets
// at http://threecrickets.com/
//

document.require(
	'/diligence/service/rest/',
	'/diligence/service/html/',
	'/prudence/resources/',
	'/sincerity/classes/',
	'/sincerity/objects/',
	'/sincerity/platform/')

var Diligence = Diligence || {}

/**
 * @name Diligence.Forms
 * @namespace
 * 
 * @author Tal Liron
 * @version 1.1
 */
Diligence.Forms = Diligence.Forms || function() {
	/** @exports Public as Diligence.Forms */
	var Public = {}

	Public.getForm = function(uri) {
		return Prudence.Resources.request({
			uri: uri,
			internal: true
		})		
	}
	
	/**
	 * @param conversation The Prudence conversation
	 * @returns {Diligence.Forms.Form} The current form or null
	 * @see #getCapturedResults
	 */
	Public.getCapturedForm = function(conversation) {
		return conversation.locals.get('diligence.service.forms.form')
	}

	/**
	 * @param conversation The Prudence conversation
	 * @returns The results of the current form's validation and processing, or null
	 * @see #getCapturedForm
	 */
	Public.getCapturedResults = function(conversation) {
		return conversation.locals.get('diligence.service.forms.results')
	}
	
	Public.Types = {
		string: {
			validator: function(value, field, conversation) {
				return true
			},
			serverValidation: false,
			clientValidation: false
		},

	    number: {
			mask: /[\d\-\.]/,
			validator: function(value, field, conversation) {
				if (typeof value == 'number') {
					return true
				}
				return !isNaN(value - 0) ? true : this.textPack.get('diligence.foundation.validation.number.not')
			},
			textKeys: ['diligence.foundation.validation.number.not']
		},

	    integer: {
			mask: /[\d\-]/,
			validator: function(value, field, conversation) {
				return value % 1 == 0 ? true : this.textPack.get('diligence.foundation.validation.integer.not')
			},
			textKeys: ['diligence.foundation.validation.integer.not']
		},
	    
	    email: {
			// See: http://fightingforalostcause.net/misc/2006/compare-email-regex.php
	    	validator: function(value, field, conversation) {
	    		var emailRegExp = /^([\w\!\#$\%\&\'\*\+\-\/\=\?\^\`{\|\}\~]+\.)*[\w\!\#$\%\&\'\*\+\-\/\=\?\^\`{\|\}\~]+@((((([a-z0-9]{1}[a-z0-9\-]{0,62}[a-z0-9]{1})|[a-z])\.)+[a-z]{2,6})|(\d{1,3}\.){3}\d{1,3}(\:\d{1,5})?)$/i
				return emailRegExp.test(value) ? true : this.textPack.get('diligence.foundation.validation.email.not')
	    	},
			textKeys: ['diligence.foundation.validation.email.not']
	    },
	    
	    reCaptcha: {
	    	serverValidator: function(value, field, conversation) {
		    	return this.reCaptcha.validate(conversation) ? true : this.textPack.get('diligence.foundation.validation.reCaptcha.not')
	    	},
			textKeys: ['diligence.foundation.validation.reCaptcha.not'],
	    	clientValidation: false
	    }
	}

	/**
	 * This class allows for flexible validation and processing of "application/x-www-form-urlencoded" entities sent from the client.
	 * These are usually generated by standard HTML forms in web browser.
	 * <p>
	 * See {@link Prudence.Resources#getForm} for a more rudimentary solution to handling forms.
	 * 
	 * @class
	 * @name Diligence.Forms.Form
	 * @augments Diligence.REST.Resource
	 * 
	 * @param config
	 * @param config.fields A dict of field names mapped to this format:
	 *		   {label: '', type: '', validator: '', mask: ''} or a plain string, which will considered as the 'type';
	 *		   'label' will default to the field name; 'type' defaults to 'string' and is used with the {@link Sincerity.Validation}
	 *		   library; 'validator' and 'mask' will both override options provided by the validation library
	 * @param {String} [config.mode='none'] The default handling mode in case none is provided (see {@link #handle})
	 * @param {String} [config.captureSuccessUri=config.captureUri] The default document to include for successful handling
	 *				    in 'include' mode
	 * @param {String} [config.captureFailureUri=config.captureUri] The default document to include for failed handling
	 *			    	in 'include' mode
	 * @param {String} [config.captureUri] The default for config.captureSuccessUri and config.captureFailureUri
	 * @param {String} [config.redirectSuccessUri=config.redirectUri] The default document to redirect for successful handling
	 *				    in 'redirect' mode
	 * @param {String} [config.redirectFailureUri=config.redirectUri] The default document to redirect for failed handling
	 *				    in 'redirect' mode
	 * @param {String} [config.redirectUri] The default for config.redirectSuccessUri and config.redirectFailureUri
	 * @param {Boolean} [config.serverValidation=true] True to enable server-side validation for all fields
	 * @param {Boolean} [config.clientValidation=true] True to enable client-side validation for all fields (this value is not
	 *		             handled directly by this class, but is defined and stored as a convenience for client implementations)
	 */
	Public.Form = Sincerity.Classes.define(function(Module) {
		/** @exports Public as Diligence.Forms.Form */
		var Public = {}

		/** @ignore */
		Public._inherit = Diligence.REST.Resource

		/** @ignore */
		Public._configure = [
			'fields',
			'types',
			'mode',
			'textPack',
			'captureSuccessUri',
			'captureFailureUri',
			'captureUri',
			'redirectSuccessUri',
			'redirectFailureUri',
			'redirectUri',
			'serverValidation',
			'clientValidation',
			'process'
		]
		
		/** @ignore */
		Public._construct = function(config) {
			arguments.callee.overridden.call(this, this)

			this.types = this.types || {}
			this.mode = this.mode || 'json'
			this.serverValidation = Sincerity.Objects.ensure(this.serverValidation, true)
			this.clientValidation = Sincerity.Objects.ensure(this.clientValidation, true)
			
			var fields = {}
			for (var name in this.fields) {
				var field = this.fields[name]
				
				field = Sincerity.Objects.isString(field) ? {type: String(field)} : Sincerity.Objects.clone(field)
				if (!Sincerity.Objects.exists(field.labelKey)) { 
					field.label = field.label || name
				}
				
				fields[name] = field
			}
			this.fields = fields
		}

		Public.mediaTypes = [
 			'application/json',
 			'application/internal'
 		]
		
		Public.doGet = function(conversation) {
			if (conversation.internal) {
				return this
			}
			return Prudence.Resources.Status.ServerError.NotImplemented
		}
		
		Public.handle = function(conversation) {
			if (conversation.request.method.name == 'POST') {
				var textPack = this.textPack || Diligence.Internationalization.getCurrentPack(conversation)
				var values = Prudence.Resources.getForm(conversation)
				var results
				var processed
				try {
					results = this.validate(values, textPack, conversation)
					processed = this.process(results, conversation)
				}
				catch (x) {
					var details = Sincerity.Platform.getExceptionDetails(x)
					results = {
						success: false,
						msg: details.message
					}
				}
				if (processed !== false) {
					return results
				}
			}
			return null
		}
		
		Public.doPost = function(conversation) {
			var query = Prudence.Resources.getQuery(conversation, {
				human: 'bool',
				mode: 'string'
			})
			query.human = query.human || false
			query.mode = query.mode || this.mode
			
			var textPack = this.textPack || Diligence.Internationalization.getCurrentPack(conversation)
			var values = Prudence.Resources.getForm(conversation)
			var results
			var processed
			try {
				results = this.validate(values, textPack, conversation)
				processed = this.process(results, conversation)
			}
			catch (x) {
				var details = Sincerity.Platform.getExceptionDetails(x)
				results = {
					success: false,
					msg: details.message
				}
			}
			if (processed !== false) {
				switch (String(query.mode)) {
					case 'json':
						delete results.redirect
						delete results.capture
						if (conversation.mediaTypeName == 'application/internal') {
							if (!conversation.internal) {
								// Only internal clients should be requesting this media type!
								return Prudence.Resources.Status.ClientError.BadRequest
							}
							return results
						}
						conversation.mediaTypeName = 'application/json'
						if (results.success) {
							delete results.values // ?
						}
						return Sincerity.JSON.to(results, query.human)
						
					case 'redirect':
						var redirectUri = results.redirect
						if (!Sincerity.Objects.exists(redirectUri)) {
							redirectUri = results.success ? this.redirectSuccessUri : this.redirectFailureUri
						}
						if (!Sincerity.Objects.exists(redirectUri)) {
							redirectUri = this.redirectUri
						}
						if (!Sincerity.Objects.exists(redirectUri) && Sincerity.Objects.exists(conversation.request.referrerRef)) {
							redirectUri = String(conversation.request.referrerRef)
						}
						if (Sincerity.Objects.exists(redirectUri)) {
							conversation.response.redirectSeeOther(redirectUri)
							return null
						}
						break

					case 'capture':
						var captureUri = results.capture
						if (!Sincerity.Objects.exists(captureUri)) {
							captureUri = results.success ? this.captureSuccessUri : this.captureFailureUri
						}
						if (!Sincerity.Objects.exists(captureUri)) {
							captureUri = this.captureUri
						}
						if (Sincerity.Objects.exists(captureUri)) {
							conversation.locals.put('diligence.service.forms.form', this)
							conversation.locals.put('diligence.service.forms.results', results)
							var reference = 'riap://application' + captureUri + '?{rq}';
							var redirector = new com.threecrickets.prudence.util.CapturingRedirector(conversation.resource.context, reference, false)
							redirector.handle(conversation.request, conversation.response)
							return null
						}
						break
				}
			}
			
			return Prudence.Resources.Status.ClientError.BadRequest
		}
		
		/**
		 * @param params
		 * @param params.name
		 * @param params.conversation
		 * @param [params.textPack]
		 * @param [params.results]
		 */
		Public.htmlText = function(params) {
			var field = this.fields[params.name]

			var input = {
				name: params.name,
				_conversation: params.conversation
			}
			
			var label
			if (Sincerity.Objects.exists(field.labelKey)) {
				var textPack = params.textPack
				if (!Sincerity.Objects.exists(textPack) && Sincerity.Objects.exists(params.conversation)) {
					textPack = Diligence.Internationalization.getCurrentPack(params.conversation)
				}
				if (!Sincerity.Objects.exists(textPack)) {
					textPack = this.textPack
				}
				label = {
					_textPack: textPack,
					_key: field.labelKey
				}
			}
			else {
				label = {
					_content: field.label
				}
			}
			if (Sincerity.Objects.exists(params.results) && Sincerity.Objects.exists(params.results.values)) {
				input.value = params.results.values[params.name]
			}
			
			var r = ''
			if (Sincerity.Objects.exists(params.results) && Sincerity.Objects.exists(params.results.errors) && Sincerity.Objects.exists(params.results.errors[params.name])) {
				input['class'] = 'error'
				label['class'] = 'error'
				r = this.htmlError(params)
			}

			return Diligence.HTML.input(input, label) + r
		}

		Public.htmlTextArea = function(conversation, name, results) {
			return Diligence.HTML.textarea({name: name, _conversation: conversation}, {_content: this.fields[name].label}) + this.htmlError(name, results)
		}

		Public.htmlPassword = function(conversation, name, results) {
			return Diligence.HTML.input({name: name, type: 'password', _conversation: conversation}, {_content: this.fields[name].label}) + this.htmlError(name, results)
		}
		
		Public.htmlError = function(params) {
			return Diligence.HTML.div({_content: params.results.errors[params.name], 'class': 'error'})
		}
		
		/**
		 * Performs server-side validation of values according to the form's defined fields.
		 * 
		 * @param values A dict of field names mapped to values; all values will be treated as strings;
		 *		unrecognized field names will be ignored
		 * @param {Diligence.Internationalization.Pack} [textPack] The text pack to use for error messages
		 * @param [conversation] The Prudence conversation
		 * @returns A structure in the format: {success: true, values: {...}} or {success: false, values: {...}, errors: {...}};
		 *		  values are copied over from the arg (always as strings), and errors are all texts that can be displayed
		 *		  to users
		 */
		Public.validate = function(values, textPack, conversation) {
			var results = {success: true}
			textPack = textPack || this.textPack

			for (var name in this.fields) {
				var field = this.fields[name]
				var value = values[name]
				
				// Make sure field has its initial value
				if (Sincerity.Objects.exists(field.value) && !Sincerity.Objects.exists(value)) {
					value = values[name] = field.value
				}
				
				// Check that all required fields are provided
				if ((this.serverValidation === true) && field.required) {
					if (!Sincerity.Objects.exists(value) || (value == '')) {
						results.success = false
						results.errors = results.errors || {} 
						results.errors[name] = textPack.get('sincerity.validation.required', {name: name})
					}
				}
			}
			
			// Check remaining values
			for (var name in values) {
				if (!results.success && Sincerity.Objects.exists(results.errors[name])) {
					// We've already validated this value
					continue
				}

				var value = values[name]
				var field = this.fields[name]
				
				// Only include defined fields
				if (Sincerity.Objects.exists(field) && Sincerity.Objects.exists(value)) {
					var error = null
					
					if (this.serverValidation !== false) {
						if (field.serverValidation !== false) {
							var type = Sincerity.Objects.exists(field.type) ? (Module.Types[field.type] || this.types[field.type]) : null
							if (!Sincerity.Objects.exists(type) || (Sincerity.Objects.exists(type) && (type.serverValidation !== false))) {
								var validator = field.serverValidator || field.validator 
								if (!Sincerity.Objects.exists(validator) && Sincerity.Objects.exists(type)) {
									validator = type.serverValidator || type.validator
								}
								
								if (Sincerity.Objects.exists(validator)) {
									var context = {
										textPack: textPack,
										form: this
									}
									var validity = validator.call(context, value, field, conversation)
									if (validity !== true) {
										error = validity
										/*if (Sincerity.Objects.exists(textPack)) {
											error = textPack.get(validity, {name: name})
										}*/
										if (!Sincerity.Objects.exists(error)) {
											error = 'Invalid'
										}
									}
								}
							}
						}
					}
					
					if (Sincerity.Objects.exists(value)) {
						results.values = results.values || {} 
						results.values[name] = String(value)
					}
					
					if (error) {
						results.success = false
						results.errors = results.errors || {} 
						results.errors[name] = String(error)
					}
				}
			}
			
			return results
		}
		
		/**
		 * Handles the form, first validating it (server-side, of course) if necessary.
		 * <p>
		 * A few handling modes are supported, which you can set explicitly when you call the function, via params.mode, set 
		 * default mode when you create the form, or let Diligence pick it up automatically from the "?mode=..." query param.
		 * <ul>
		 * <li>none: Diligence does nothing with the results of the handling. It's then up to you handle them as appropriate.
		 * This is the default.</li>
		 * <li>json: Diligence dumps the results as JSON to the page, and sets the MIME type to 'application/json'. This is useful for
		 * AJAX forms, which will consume this JSON data on the client. Just make sure not to output anything else on the page,
		 * otherwise the JSON will be unparseable!</li>
		 * <li>include: Diligence does a document.include of specified documents according the success or failure of the handling.
		 * You can then use /web/fragments/ to implement your own views. The 'diligence.foundation.forms.form' conversation.local will
		 * contain the form itself, and 'diligence.foundation.forms.results' the results of the handling.</li>
		 * <li>redirect: Diligence does a conversation.response.redirectSeeOther of specified URIs according the success or failure of
		 * the handling.</li>
		 * </ul>
		 * 
		 * @param [params]
		 * @param [params.conversation] The Prudence conversation
		 * @param [params.document=document] The Prudence document service
		 * @param [params.values] The form values (will be extracted from params.conversation if not provided explicitly) 
		 * @param {Diligence.Internationalization.Pack} [params.textPack] The text pack to use for messages (will be extracted from params.conversation if not provided explicitly) 
		 * @param {String} [params.mode=this.mode] Set this to override the query param; can be 'none', 'json',
		 *				 'include' or 'redirect'
		 * @param {String} [params.captureSuccessUri=this.captureSuccessUri] Set this to override the form's value 
		 * @param {String} [params.captureFailureUri=this.captureFailureUri] Set this to override the form's value 
		 * @param {String} [params.captureUri=this.captureUri] Set this to override the form's value 
		 * @param {String} [params.redirectSuccessUri=this.redirectSuccessUri] Set this to override the form's value 
		 * @param {String} [params.redirectFailureUri=this.redirectFailureUri] Set this to override the form's value 
		 * @param {String} [params.redirectUri=this.redirectUri] Set this to override the form's value 
		 * @returns False is the form was not handled, otherwise the raw results (see {@link #validate})
		 */
		
		Public.process = function(results, conversation) {
		}
		
		return Public
	}(Public))
	
	return Public
}()
