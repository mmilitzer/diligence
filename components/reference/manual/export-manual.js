
document.require(
	'/sincerity/files/',
	'/sincerity/objects/')

var subsectionRE = /<a class="toc" name="toc-Subsection-(\d+)"><\/a>(.*?)(?:<a |\s<\/h2>)/g
var subsubsectionRE = /<a class="toc" name="toc-Subsubsection-(\d+)"><\/a>(.*?)(?:<a |\s<\/h3>)/g
var newSubsectionRE = /<a class="toc-Subsection" name="(.*)"><\/a>(.*?)(?:<a |\s<\/h2>)/
var newSubsubsectionRE = /<a class="toc-Subsubsection" name="(.*)"><\/a>(.*?)(?:<a |\s<\/h3>)/
var crossreferenceRE = /<u>(.*?)<\/u>\s*<u>\s*\(page\s*<a class="Reference" href="#(.+?)">.*?<\/a>\s*\)\s*<\/u>/g
var crossreference2RE = /<u>(.*?)\s*\(page\s*<a class="Reference" href="#(.+?)">.*?<\/a>\s*\)\s*<\/u>/g
var labelRE = /<a class="Label" name=".+#/g
var punctuationRE = /[\.,\?\/#!$%\^&\*;:{}=_`~()'"]/g
var whitespaceRE = /\s/g

function anchorify(str) {
	str = str.toLowerCase()
	str = str.replace(punctuationRE, '')
	str = str.replace(whitespaceRE, '-')
	return str
}

var Section = function(name, content) {
	this.printTOC = function(out) {
		out.println('<div id="toc">')
		out.println('<div class="title"><a href=".">' + name + '</a></div>')
		
		var subsection = this.content.match(newSubsectionRE)
		var nextIndex = subsection ? subsection.index + subsection[0].length : 0
		var index, subsubsection

		while (subsection) {
			out.println('<div class="subsection"><a href="#' + subsection[1] + '">' + subsection[2] + '</a></div>')

			index = nextIndex
			subsection = this.content.substring(index).match(newSubsectionRE)
			nextIndex = subsection ? index + subsection.index + subsection[0].length : this.content.length

			subsubsection = this.content.substring(index, nextIndex).match(newSubsubsectionRE)
			while (subsubsection) {
				out.println('<div class="subsubsection"><a href="#' + subsubsection[1] + '">' + subsubsection[2] + '</a></div>')
				index += subsubsection.index + subsubsection[0].length
				subsubsection = this.content.substring(index, nextIndex).match(newSubsubsectionRE)
			}
		}

		out.println('</div>')
	}
	
	this.name = name
	this.content = content
}

var Manual = function(file) {
	this.clean = function() {
		// Convert special quotations marks to regular ones
		this.content = this.content.replace(/’/g, "'")
		this.content = this.content.replace(/(?:&ldquo;|&rdquo;)/g, '"')

		// Fix eLyXer output to HTML elements
		this.content = this.content.replace(/---/g, '&mdash;')
		
		// Table class
		this.content = this.content.replace(/<table>/g, '<table class="grid">')
		
		// Tricks with cross-references
		this.content = this.content.replace(crossreferenceRE,  '<a class="Reference" href="$2">$1</a>')
		this.content = this.content.replace(crossreference2RE, '<a class="Reference" href="$2">$1</a>')
		this.content = this.content.replace(/↑/g, '')
		this.content = this.content.replace(/↓/g, '')
		this.content = this.content.replace(/\|/g, '#')
		
		// Tricks with labels
		this.content = this.content.replace(labelRE, '<a class="Label" name="')

		// Use nice name for subsection/subsubsection anchors (eLyXer uses numbers)
		this.content = this.content.replace(subsectionRE, function(match, num, title) {
			return '<a class="toc-Subsection" name="' + anchorify(title) + '"></a>' + title + '\n</h2>'
		})
		this.content = this.content.replace(subsubsectionRE, function(match, num, title, offset, content) {
			// Find most recent subsection
			content = content.substring(0, offset)
			var subsection = content.match(newSubsectionRE)
			if (subsection) {
				while (true) {
					content = content.substring(subsection.index + subsection[0].length)
					var nextSubsection = content.match(newSubsectionRE)
					if (!nextSubsection) {
						break
					}
					subsection = nextSubsection
				}
			}
			if (subsection) {
				return '<a class="toc-Subsubsection" name="' + subsection[1] + '_' + anchorify(title) + '"></a>' + title + '\n</h3>'
			}
			else {
				return '<a class="toc-Subsubsection" name="' + anchorify(title) + '"></a>' + title + '\n</h3>'
			}
		})
	}
	
	this.getSection = function(name) {
		var headingRE = new RegExp('<a class="toc" name="toc-Section-\\d+"></a>' + Sincerity.Objects.escapeRegExp(name))
		var start = this.content.search(headingRE)
		if (start != -1) {
			start = this.content.indexOf('</h1>', start) + 5
			var after = this.content.indexOf('</a>', start) + 4
			var end = this.content.indexOf('<h1 class="Section">', after)
			if (end < 0) {
				end = this.content.indexOf('<hr class="footer"/>', after)
			}
			//return new Section(name, '<h1 class="Section">' + this.content.substring(start, end))
			return new Section(name, this.content.substring(start, end))
		}
	}

	this.generate = function(product, sections) {
		for (var name in sections) {
			var section = this.getSection(name)
			var file = sincerity.container.getFile(sections[name])
			file.parentFile.mkdirs()
			println('Generating ' + file)
			var out = Sincerity.Files.openForTextWriting(file)
			out.println(section.content)
			section.printTOC(out)
			out.close()
		}
	}

	this.content = String(Sincerity.Files.loadText(file))
	this.clean()
}

var diligenceVersion = '@VERSION@'
var diligenceBase = 'component/applications/diligence-example/libraries/includes/'

var manual = new Manual(application.arguments[1])
manual.generate('diligence', {
	// Services
	'Assets Service': [diligenceBase + 'manual/service/assets.t.html'],
	'Authentication Service': [diligenceBase + 'manual/service/authentication.t.html'],
	'Authorization Service': [diligenceBase + 'manual/service/authorization.t.html'],
	'Backup Service': [diligenceBase + 'manual/service/backup.t.html'],
	'Cache Service': [diligenceBase + 'manual/service/cache.t.html'],
	'Documents Service': [diligenceBase + 'manual/service/documents.t.html'],
	'Events Service': [diligenceBase + 'manual/service/events.t.html'],
	'Forms Service': [diligenceBase + 'manual/service/forms.t.html'],
	'HTML Service': [diligenceBase + 'manual/service/html.t.html'],
	'Internationalization Service': [diligenceBase + 'manual/service/internationalization.t.html'],
	'Linkback Service': [diligenceBase + 'manual/service/linkback.t.html'],
	'Nonces Service': [diligenceBase + 'manual/service/nonces.t.html'],
	'Notification Service': [diligenceBase + 'manual/service/notification.t.html'],
	'Progress Service': [diligenceBase + 'manual/service/progress.t.html'],
	'REST Service': [diligenceBase + 'manual/service/rest.t.html'],
	'RPC Service': [diligenceBase + 'manual/service/rpc.t.html'],
	'Search Service': [diligenceBase + 'manual/service/search.t.html'],
	'Serials Service': [diligenceBase + 'manual/service/serials.t.html'],
	'Syndication Service': [diligenceBase + 'manual/service/syndication.t.html'],
	
	// Integrations
	'Gravatar Integration': [diligenceBase + 'manual/integration/gravatar.t.html'],
	'PayPal Integration': [diligenceBase + 'manual/integration/paypal.t.html'],
	'Sencha Integration': [diligenceBase + 'manual/integration/sencha.t.html'],
	'Sencha Integration: Grids': [diligenceBase + 'manual/integration/sencha-grids.t.html'],
	'Sencha Integration: Trees': [diligenceBase + 'manual/integration/sencha-trees.t.html'],
	'Sencha Integration: Charts': [diligenceBase + 'manual/integration/sencha-charts.t.html'],
	'Sencha Integration: Forms': [diligenceBase + 'manual/integration/sencha-forms.t.html'],
	'Sencha Integration: Ext Direct': [diligenceBase + 'manual/integration/sencha-ext-direct.t.html'],
	
	// Features
	'Blog Feature': [diligenceBase + 'manual/feature/blog.t.html'],
	'Console Feature': [diligenceBase + 'manual/feature/console.t.html'],
	'Contact Us Feature': [diligenceBase + 'manual/feature/contact-us.t.html'],
	'Discussion Feature': [diligenceBase + 'manual/feature/discussion.t.html'],
	'Registration Feature': [diligenceBase + 'manual/feature/registration.t.html'],
	'SEO Feature': [diligenceBase + 'manual/feature/seo.t.html'],
	'Shopping Cart Feature': [diligenceBase + 'manual/feature/shopping-cart.t.html'],
	'Wiki Feature': [diligenceBase + 'manual/feature/wiki.t.html']
})

	
	
/*
document.executeOnce('/sincerity/files/')
document.executeOnce('/sincerity/objects/')

var Section = function(name, content) {
	this.printTOC = function(out) {
		out.println('<div id="toc">')
		out.println('<div class="title"><a href=".">' + name + '</a></div>')
		
		var subsectionRE = /<a class="toc" name="toc-Subsection-(\d+)"><\/a>(.*?)(?:<a |\s<\/h2>)/
		var subsubsectionRE = /<a class="toc" name="toc-Subsubsection-(\d+)"><\/a>(.*?)(?:<a |\s<\/h3>)/
		var subsection = this.content.match(subsectionRE)
		var nextIndex = subsection ? subsection.index + subsection[0].length : 0
		var index, subsubsection
		while (subsection) {
			out.println('<div class="subsection"><a href="#toc-Subsection-' + subsection[1] + '">' + subsection[2] + '</a></div>')
			index = nextIndex
			subsection = this.content.substring(index).match(subsectionRE)
			nextIndex = subsection ? index + subsection.index + subsection[0].length : this.content.length

			subsubsection = this.content.substring(index, nextIndex).match(subsubsectionRE)
			while (subsubsection) {
				out.println('<div class="subsubsection"><a href="#toc-Subsubsection-' + subsubsection[1] + '">' + subsubsection[2] + '</a></div>')
				index += subsubsection.index + subsubsection[0].length
				subsubsection = this.content.substring(index, nextIndex).match(subsubsectionRE)
			}
		}

		out.println('</div>')
	}
	
	this.name = name
	this.content = content
}

var Manual = function(file) {
	this.clean = function() {
		// Fix eLyXer output to more common HTML text
		this.content = this.content.replace(/(“|”|&ldquo;|&rdquo;)/g, '"')
		this.content = this.content.replace(/’/g, "'")
		this.content = this.content.replace(/---/g, '&mdash;')
		
		// Tricks with cross-references
		this.content = this.content.replace(/<u>(.*?)<\/u>\s*<u>\s*\(page\s*<a class="Reference" href="#(.+?)">.*?<\/a>\s*\)\s*<\/u>/g, '<a class="Reference" href="$2">$1</a>')
		this.content = this.content.replace(/<u>(.*?)\s*\(page\s*<a class="Reference" href="#(.+?)">.*?<\/a>\s*\)\s*<\/u>/g, '<a class="Reference" href="$2">$1</a>')

		this.content = this.content.replace(/(↑|↓)/g, '')
		this.content = this.content.replace(/\|/g, '#')
		
		// Tricks with labels
		this.content = this.content.replace(/<a class="Label" name=".+#/g, '<a class="Label" name="')
		
		// Links
		this.content = this.content.replace(/http:\/\/threecrickets.com\/javascript-api\//g, '/javascript-api/')
	}
	
	this.getSection = function(name) {
		var headingRE = new RegExp('<a class="toc" name="toc-Section-\\d+"></a>' + name.escapeRegExp())
		var start = this.content.search(headingRE)
		if (start != -1) {
			start = this.content.indexOf('</h1>', start) + 5
			var after = this.content.indexOf('</a>', start) + 4
			var end = this.content.indexOf('<h1 class="Section">', after)
			if (end < 0) {
				end = this.content.indexOf('<hr class="footer"/>', after)
			}
			//return new Section(name, '<h1 class="Section">' + this.content.substring(start, end))
			return new Section(name, this.content.substring(start, end))
		}
	}

	this.generate = function(sections) {
		for (var name in sections) {
			var section = this.getSection(name)
			var file = sincerity.container.getFile(sections[name])
			file.parentFile.mkdirs()
			println('Generating ' + file)
			var out = Sincerity.Files.openForTextWriting(file)
			out.println(section.content)
			section.printTOC(out)
			out.close()
		}
	}

	println('Loading ' + file)
	this.content = String(Sincerity.Files.loadText(file))
	this.clean()
}

var manual = new Manual(application.arguments[1])
manual.generate({
	'Backup Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/backup.html'],
	'Cache Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/cache.html'],
	'Forms Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/formt.html'],
	'Internationalization Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/internationalization.html'],
	'Nonces Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/noncet.html'],
	'Notification Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/notification.html'],
	'Serials Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/serialt.html'],
	'Events Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/eventt.html'],
	'Progress Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/progrest.html'],
	'Documents Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/documentt.html'],
	'REST Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/rest.html'],
	'RPC Service': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/service/rpc.html'],
	'Sencha Integration': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/integration/sencha.html'],
	'Sencha Integration: Grids': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/integration/sencha-gridt.html'],
	'Sencha Integration: Trees': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/integration/sencha-treet.html'],
	'Sencha Integration: Charts': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/integration/sencha-chartt.html'],
	'Sencha Integration: Forms': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/integration/sencha-formt.html'],
	'Sencha Integration: Ext Direct': ['component/applications/diligence-example/libraries/scriptlet-resources/manual/integration/sencha-ext-direct.html']
})
*/