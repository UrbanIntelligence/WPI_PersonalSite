set repoPath to "/Users/yli15/Documents/ClaudeCode/WPI_Personal_Website"

display dialog "Ready to sync your changes to users.wpi.edu/~yli15/?" buttons {"Cancel", "Sync Now"} default button "Sync Now" with title "Sync to WPI" with icon note

try
	set shellCmd to "cd " & quoted form of repoPath & " && ./sync-to-wpi.sh 2>&1"
	set output to do shell script shellCmd
	display dialog output buttons {"OK"} default button "OK" with title "✅ Sync to WPI — Success" with icon note
on error errMsg
	display dialog errMsg buttons {"OK"} default button "OK" with title "❌ Sync to WPI — Failed" with icon stop
end try
