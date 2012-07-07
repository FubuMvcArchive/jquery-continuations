COMPILE_TARGET = ENV['config'].nil? ? "debug" : ENV['config']

buildsupportfiles = Dir["#{File.dirname(__FILE__)}/buildsupport/*.rb"]

if( ! buildsupportfiles.any? )
  # no buildsupport, let's go get it for them.
  sh 'git submodule update --init' unless buildsupportfiles.any?
  buildsupportfiles = Dir["#{File.dirname(__FILE__)}/buildsupport/*.rb"]
end

# nope, we still don't have buildsupport. Something went wrong.
raise "Run `git submodule update --init` to populate your buildsupport folder." unless buildsupportfiles.any?

include FileTest
require 'albacore'

PRODUCT = "jquery.continuations"
COPYRIGHT = 'Copyright 2012 Joshua Arnold. All rights reserved.';

buildsupportfiles = Dir["#{File.dirname(__FILE__)}/buildsupport/*.rb"]
raise "Run `git submodule update --init` to populate your buildsupport folder." unless buildsupportfiles.any?
buildsupportfiles.each { |ext| load ext }

props = { :artifacts => File.expand_path("artifacts") }

desc "**Default**"
task :default => [:run]

desc "Prepares the working directory for a new build"
task :clean => [:update_buildsupport] do
	FileUtils.rm_rf props[:artifacts]
    # work around nasty latency issue where folder still exists for a short while after it is removed
    waitfor { !exists?(props[:artifacts]) }
	Dir.mkdir props[:artifacts]
end

desc "Opens the Serenity Jasmine Runner in interactive mode"
task :open do
	serenity "jasmine interactive src/serenity.txt"
end

desc "Runs the Jasmine tests"
task :run => [:restore_if_missing] do
	serenity "jasmine run --timeout 60 src/serenity.txt"
end

desc "Runs the Jasmine tests and outputs the results for TC"
task :ci => [:clean, :restore_if_missing] do
    serenity "jasmine run --verbose --timeout 60 src/serenity.txt"
    copyOutputFiles "src/jquery.continuations/content/scripts", "jquery.continuations.*", props[:artifacts]
end

def self.serenity(args)
  serenity = Platform.runtime(Nuget.tool("Serenity", "SerenityRunner.exe"))
  sh "#{serenity} #{args}"
end

def copyOutputFiles(fromDir, filePattern, outDir)
  Dir.glob(File.join(fromDir, filePattern)){|file| 		
	copy(file, outDir, :preserve => true) if File.file?(file)
  } 
end

def waitfor(&block)
  checks = 0
  until block.call || checks >10 
    sleep 0.5
    checks += 1
  end
  raise 'waitfor timeout expired' if checks > 10
end