# Use-case
During the *Great Refactoring* of Wallapp, I encountered a situation that was going to get tedious to solve by-hand.

I separated out the Engine from the UI into two distinct projects (Engine and App respectively).
When launched, the UI starts the Engine process, and they communicate via an IPC channel through Standard In/Out.

That part's fine, it's just some context. The issue is copying the Engine's output to the App's output location so the App can actually resolve the Engine's executable.

I initially solved that via a simple Post-Build script from within visual studio that copied the output from one to the other. Voila, problem solved. Another way I could have solved it, would have been by simply changing the Engine's output directory to that of the App's. But I didn't like doing it that way. I'm picky I suppose.

Though there was an annoyance. Between both projects, as it obviously turned out, we had a several dependencies that were needed in the program's working directory to resolve.

That was a mess. A messy-mess, even.

Instead of extending my build script, I opted to resolve this by finally learning CAKE.

# [C# MAKE ENTERS THE ROOM]
*[Cake](https://cakebuild.net/)*, or *c# make*, is a build automation tool using a familiar c# syntax.
A quick google and some samples later, and it looks like Cake provides an easy, relatively painless way to not only run builds, but *clean directories*, run *unit tests*, *compress files*, build *NuGet packages*, alter *version numbers* within a project's AssemblyInfo, and of course, the thing we're interested in, *copying/moving files and directories*.
> As a matter of fact, it looks like cake utilizes Roslyn's Scripting API. \
Though I've not actually looked into it, so I'm not certain.

## Quick Sample
Here's a simple example of a basic Cake script I've taken from the official repo and slightly tweaked.  
*Source: https://github.com/cake-build/example/blob/master/build.cake*
```cs
// Get the task the user wants to perform from the command line arguments. We'll use a default value of "Default" should the user not specify anything.
var target = Argument("target", "Default");

// Get the project configuration the user wants to perform the task on from the command line.
var configuration = Argument("configuration", "Release");

// Define the build directory so we don't have to type this out everywhere. This makes use of Cake's IO operations and types.
var buildDirectory = Directory("./src/Example/bin") + Directory(configuration);


// Define our "Clean" task. This task will clean the build directory. Notice the lambda that gets invoked when the task is run is denoted by the "Does" function.
Task("Clean")
    .Does(() =>
{
    // Log some stuff to the output window.
    Information("Cleaning '{buildDirectory}'...");
    CleanDirectory(buildDirectory);
});


// Create a task that restores nuget package references.
// Notice that this task is "dependent on" the clean task. This works pretty much as expected - it'll execute the "Clean" task prior to actually invoking this task.
Task("Restore-NuGet-Packages")
    .IsDependentOn("Clean")
    .Does(() =>
{
    NuGetRestore("./src/Example.sln");
});


// Create a task that will invoke MSBuild to actually build our prject. Notice that this task first restores nuget packages, which in turn cleans the build directory.
Task("Build")
    .IsDependentOn("Restore-NuGet-Packages")
    .Does(() =>
{
    // Log some stuff.
    Information("Building...")
    Debug($"Configuration {configuration}.");
    
    // The settings paramater either accepts an instance of MSBuildSettings, or an Action<MSBuildSettings> as seen here.
    MSBuild("./src/Example.sln", settings =>
        settings.SetConfiguration(configuration));
});


// Execute the task the user specified.
RunTarget(target);
```

Notice that we are also able to write to a log as we go.
More info on this in the relevant docs, here: https://cakebuild.net/dsl/logging/

## Execute The Cake Script
To actually execute the cake script, the bootstrapper must be run. The bootstrapper script is a small powershell script which, according to the [docs](https://cakebuild.net/docs/tutorials/getting-started), simply ensures the Cake runtime is downloaded and accessible.
It then invokes the cake command line app which executes the build script.

To start from scratch, use PowerShell to download the bootstrapping script from the Cake team. Execute the following command in powershell from the directory your cake build script is located:
```ps
Invoke-WebRequest https://cakebuild.net/download/bootstrapper/windows -OutFile build.ps1
```

> Incidentally, powershell is also something I want to get more proficient in. But interestingly enough, even the static site generator I'm using (https://wyam.io/) takes advantage of cake and the accompanying powershell bootstrapper. I've just been mindlessly invoking the script without knowing what's going on up until this point.

Then to run your build script, simply execute "./build.ps1 [arguments]" from the same directory.

All this information is available in the CakeBuild docs on their site at https://cakebuild.net/docs/.


# Our Cake Script And Post-Build Events
With some formalities out of the way, I think we're ready to see how exactly we can leverage the CakeBuild system to automatically copy output files from one project, to another.
Then finally, after that move, we'll copy **all** dependency libraries to a "lib/" directory in the app's output directory.

I'm literally going to just copy+paste the WallApp cake build script in its current state.

## Cake Build Script

```cs
var target = Argument("target", "Build");
var configuration = Argument("configuration", "Debug");
var platform = Argument("platform", "Automatic");

var solution = "./WallApp.sln";

// Set MSBuildSettings configuration to our input arguments.
public void SetConfiguration(MSBuildSettings settings)
{
    settings.Configuration = configuration;
    settings.MSBuildPlatform = (MSBuildPlatform)Enum.Parse(typeof(MSBuildPlatform), platform);
}

// Nuget restore.
Task("Restore").Does(() => NuGetRestore(solution));

// Rebuild (Clean -> Build).
Task("Rebuild").IsDependentOn("Clean").IsDependentOn("Build");

// Build the project, copying the output of the Engine to the output directory of the App.
Task("Build")
    .IsDependentOn("Restore")
    .Does(() =>
{
    MSBuild(solution, SetConfiguration);
    RunTarget("CopyOutput");
});


// Clean output directories.
Task("Clean")
    .Does(() =>
{
    var directories = new string[]
    {
        string.Format("./Engine/obj/{0}", configuration),
        string.Format("./Engine/bin/{0}", configuration),
        string.Format("./WallApp.App/obj/{0}", configuration),
        string.Format("./WallApp.App/bin/{0}", configuration)
    };

    foreach (var item in directories)
    {
        Information($"Cleaning '{item}'...");
        CleanDirectories(item);
    }

    Information($"Cleaned {directories.Length} directories");
});

// Copy the output from Bridge to App's output directory.
Task("CopyOutput")
    .Does(() =>
{
    var engineDirectory = $"./Engine/bin/{configuration}/";
    var appDirectory = $"./WallApp.App/bin/{configuration}/";
    var libDirectory = $"{appDirectory}lib/";
    var modulesDirectory = $"./modules/";

    // Copy Engine's output to App output.
    Information($"Copying files from '{engineDirectory}' to '{appDirectory}'...");
    CopyFiles(engineDirectory + "*", appDirectory);

    // Create subfolder for third-party libraries.
    Information($"Recreating '{libDirectory}'...");
    if(DirectoryExists(libDirectory))
    {
        DeleteDirectory(libDirectory, new DeleteDirectorySettings() { Recursive = true, Force = true });
    }
    CreateDirectory(libDirectory);

    // Copy third-party libraries to sub-folder.
    var files = System.IO.Directory.GetFiles(MakeAbsolute(DirectoryPath.FromString(appDirectory)).ToString());
    Information("\r\nCopying libs======================");
    foreach(var file in files)
    {
        // Don't copy *our* files.
        if(file.EndsWith("WallApp.exe")
            || file.EndsWith("WallApp.pdb")
            || file.EndsWith("WallApp.exe.config"))
        {
            continue;
        }
        if(file.EndsWith("Engine.exe")
            || file.EndsWith("Engine.pdb")
            || file.EndsWith("Engine.exe.config"))
        {
            continue;
        }

        
        var withoutExtension = System.IO.Path.GetFileNameWithoutExtension(file);
        var name = System.IO.Path.GetFileName(file);

        // If the file is a dll or pdb, move it to the subfolder.
        if(file.EndsWith(".dll")
            || file.EndsWith(".pdb"))
        {
            Information($"Moving '{name}' to lib directory...");
            MoveFileToDirectory(file, libDirectory);
        }

        // If the file is an xml and also there is an accompanying library, then
        // this xml must be docs for the library -- move it.
        if(file.EndsWith(".xml")
            && files.Any((f) => f.EndsWith(withoutExtension + ".dll")))
        {
            Information($"Moving '{name}' to lib directory...");
            MoveFileToDirectory(file, libDirectory);
        }
    }
    Information("Finished copying libs======================\r\n");

    // Copy the modules folder in the root of the solution to the modules sub directory.
    Information($"Copying '{modulesDirectory}' to '{appDirectory}modules/'...");
    CopyDirectory(modulesDirectory, appDirectory + "modules/");
});


RunTarget(target);
```

Whew! That's a little bit more than the previous sample. The interesting bits are in the `CopyOutput` task.

Of particular importance, are the `CopyFiles`, `DirectoryExists`, `MoveFileToDirectory`, and `CopyDirectory` functions.

Additionally, I through together some logic to distinguish the difference between xml documentations for code and actual xml files the program needs to function. **It won't move xml files that don't have accompanying dlls to the subfolder.**

The order of operations here is something like this:
* Copy Engine output to App output (where we'll actually launch our program from)
* Create the "lib/" subfolder, first deleting it and its contents if it already exists
* Iterate over all files in the output folder and move them to the "lib/" directory as appropriate.
* Finally, move extension modules from the solution directory to the app's output directory.


## Post-Build Script
The is all well and good. But what if we want to perform our copy whenever we *do* happen to build from within visual studio?
 MSBuild allows you to write both Pre-and-Post build event .bat scripts that it'll execute when appropriate during the build process.
And this is what we'll take advantage of.
To access what we're interested in, the Post Build script, navigate to the project's properties from within Visual Studio and it'll be one of the tabs on the left pane.

![build-events-page](/assets/blog/using-cake/build-events-page.PNG)

In the "Post-build event command line:" box, we'll use the following snippet: `cd "$(SolutionDir)" && powershell -file "build.ps1" -target CopyOutput`.
This snippet changes the working directory from the project's directory to the solution's directory (where our build script *should* be. If you're isn't here, change this bit to wherever your build script is located). Then it launches powershell passing in the build.ps1 script as an argument, as well as the target-task we want cake to execute.


# And.. That's it...
That's literally all there is to it.
Cake is something I've wanted to learn for a couple years now, but never really needed it before now. And truthfully, I probably could have achieved what I'm using for in WallApp with just a powershell/bat script.

But I wanted to sieze this opportunity to learn finally learn Cake, and I was not dissappointed. It seems to be one of those things that's almost deceptively simple.

After reading about Cake and looking at examples, I finally just jumped right into writing it all up myself and found that it really wasn't as complicated as I was originally making it out to be.

Hopefully you've drawn something from this, if not, maybe just start from the official Cake docs and dive right in.

You can always see the cake script I use in WallApp on the project's repository at https://github.com/moolicc/WallApp. Currently, the dev branch is the only place you'll find the relevant information.