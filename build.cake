#tool "nuget:?package=Wyam"
#addin "Cake.Powershell"

var RootDir = MakeAbsolute(Directory(".")); 
var buildtarget = Argument("target", "Default");
var waymexe = RootDir + "/tools/wyam/Wyam/tools/net462/Wyam.exe";

Task("Build")
    .Does(() => StartProcess(waymexe, "build"));

Task("Preview")
    .Does(() => StartProcess(waymexe, "-p -w"));

Task("Deploy")
    .IsDependentOn("Build")
    .Does(() => 
    {
        if(FileExists("./CNAME"))
            CopyFile("./CNAME", "output/CNAME");

        StartProcess("git", "checkout develop");
        StartProcess("git", "add .");
        StartProcess("git", "commit -m \"Checking output in for subtree\"");
        StartProcess("git", "subtree split --prefix output -b master");
        StartProcess("git", "push -f origin master:master");
        StartProcess("git", "branch -D master");

    });

RunTarget(buildtarget);