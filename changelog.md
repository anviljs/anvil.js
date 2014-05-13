__work in progress; word of advise - start your projects with one, never build one in retrospect__

# 0.9.5

## New Features

## Bug Fixes

### Build Completes Twice
Anvil's build would report completed twice, bringing shame to itself and its family. It no longer does this. (I mean, really...)

### CI mode for Node 10.+
CI wasn't working correctly/reliably and especially in conjunction with the process host.

### IDE Support
Anvil's file watcher should now support any IDE. Previously, IDEs like WebStorm had to be specially configured but Anvil now supports it just fine, out of the box.

## Details: File Watching
There have been a lot of problems with Anvil's file watcher since forever. The lib Anvil used to rely on for this is officially unsupported/deprecated and so I'm changing things over to chokidar and simplifying the previous strategy Anvil used over all.

This may introduce a great deal of bugs, but hopefully it has just resolved a lot of the issues that happened in the past.

# 0.9.4

# 0.9.3

# 0.9.2

# 0.9.1

# 0.9.0