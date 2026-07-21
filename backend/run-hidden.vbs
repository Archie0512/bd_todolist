' ============================================
' Tasks.md - Hidden Server Launcher
' No DOS window, runs completely invisibly
' ============================================
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Open browser after 3 seconds (0 = hidden window, False = async)
objShell.Run "cmd /c timeout /t 3 >nul && start http://localhost:8080", 0, False

' Start node server invisibly (0 = hidden window, False = don't wait)
objShell.CurrentDirectory = strScriptDir
objShell.Run "node start.js", 0, False