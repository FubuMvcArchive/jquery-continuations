require 'bundler/setup'
  require 'fuburake'

@solution = FubuRake::Solution.new do |sln|
	sln.compile = {
		:solutionfile => 'src/jquery.continuations.sln'
	}

	sln.assembly_info = {
		:product_name => "jQuery.continuations",
		:copyright => 'Copyright 2008-2013 Jeremy D. Miller, Josh Arnold, et al. All rights reserved.'
	}

	sln.ripple_enabled = true
	sln.fubudocs_enabled = true
    
    sln.ci_steps = ["run_phantom"]
end

desc "Opens the Serenity Jasmine Runner in interactive mode"
task :open do
	prep()
	serenity "jasmine interactive src/serenity.txt -b Firefox"
end

desc "Runs the Jasmine tests"
task :run => [:compile] do
    prep()
	serenity "jasmine run --timeout 60 src/serenity.txt -b Firefox"
end

desc "Runs the Jasmine tests and outputs the results for TC"
task :run_phantom => [:compile] do
    prep()
    serenity "jasmine run --verbose --timeout 60 src/serenity.txt -b Phantom"
    artifacts = File.expand_path('artifacts', File.dirname(__FILE__))
    copyOutputFiles "src/jquery.continuations/content/scripts", "jquery.continuations.*", artifacts
end

def prep()
	FileUtils.rm_rf 'src/jquery.continuations/bin'
	waitfor { !exists?('src/jquery.continuations/bin') }
    Dir.mkdir 'src/jquery.continuations/bin' 
end

def self.serenity(args)
  serenity = Platform.runtime(Nuget.tool("Serenity", "SerenityRunner.exe"), "v4.0.30319")
  sh "#{serenity} #{args}"
end