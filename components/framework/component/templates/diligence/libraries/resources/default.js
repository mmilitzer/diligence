
document.executeOnce('/diligence/feature/console/')
document.executeOnce('/resources/sample/')

resources = {
	// Console feature
	'console.execution':        new Diligence.Console.ExecutionResource(),
	'console.log':              new Diligence.Console.LogResource(),
	'console.programs':         new Diligence.Console.ProgramsResource(),
	'console.programs.plural':  new Diligence.Console.ProgramsResource({plural: true}),

	sample: new SampleResource()
}
