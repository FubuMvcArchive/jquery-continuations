COMPILE_TARGET = ENV['config'].nil? ? "debug" : ENV['config']

include FileTest
require 'albacore'

PRODUCT = "jquery.continuations"
COPYRIGHT = 'Copyright jquery.continuations. All rights reserved.';

buildsupportfiles = Dir["#{File.dirname(__FILE__)}/buildsupport/*.rb"]
raise "Run `git submodule update --init` to populate your buildsupport folder." unless buildsupportfiles.any?
buildsupportfiles.each { |ext| load ext }

props = { :stage => File.expand_path("build"), :artifacts => File.expand_path("artifacts") }

desc "**Default**"
task :default => [:restore_if_missing, :run_jasmine]

desc "Opens the Serenity Jasmine Runner in interactive mode"
task :open_jasmine => [:enable_jasmine_coffee] do
	serenity "jasmine interactive src/serenity.txt"
end

desc "Runs the Jasmine tests"
task :run_jasmine => [:enable_jasmine_coffee] do
	serenity "jasmine run src/serenity.txt"
end

def self.serenity(args)
  serenity = Platform.runtime(Nuget.tool("Serenity", "SerenityRunner.exe"))
  sh "#{serenity} #{args}"
end

task :enable_jasmine_coffee do
	zipFile = File.join(nugetDir("FubuMVC.Coffee"), "lib", "net40", "FubuMVC.Coffee.dll")
	bottlesDir = File.join(nugetDir("Serenity"), "tools")

	Dir.mkdir bottlesDir unless exists?(bottlesDir)
	FileUtils.cp_r(zipFile, File.join(bottlesDir, "FubuMVC.Coffee.dll"))
end

def self.nugetDir(package)
	Dir.glob(File.join(Nuget.package_root,"#{package}.*")).sort.last
end