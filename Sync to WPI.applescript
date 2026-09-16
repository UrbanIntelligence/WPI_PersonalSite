try
	set repoPath to "/Users/yli15/Documents/ClaudeCode/WPI_Personal_Website"
	set shellCmd to "cd " & quoted form of repoPath & " && ./sync-to-wpi.sh 2>&1"
	set output to do shell script shellCmd
	display dialog output buttons {"OK"} default button "OK" with title "Sync to WPI — Done" with icon note giving up after 30
on error errMsg
	display dialog errMsg buttons {"OK"} default button "OK" with title "Sync to WPI — Problem" with icon stop
end try
