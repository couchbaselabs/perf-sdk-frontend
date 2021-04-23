package main.context.environments

import groovy.transform.CompileStatic

// An Environment for running on a local development machine.  It can abstract over Windows, Linux & Mac, though
// appropriate executable overrides may need to be set in the config.
@CompileStatic
class EnvironmentLocal extends Environment {
    Stack<File> workingDirectory = new Stack<>()
    String initialDir

    EnvironmentLocal(executableOverrides) {
        super(executableOverrides)
        initialDir = System.getProperty("user.dir")
        log("Working directory: $initialDir")
    }

//    @Override
//    Boolean supportsCbdeps() {
//        return false
//    }

    @Override
    String currentDir() {
        if (workingDirectory.isEmpty()) {
            return initialDir
        }
        return workingDirectory.peek()
    }

    @Override
    void dir(String directory, Closure closure) {
        String fullDirectory
        if (workingDirectory.isEmpty()) {
            fullDirectory = initialDir + File.separator + directory
        }
        else {
            fullDirectory = workingDirectory.peek().getAbsolutePath() + File.separator + directory
        }
        workingDirectory.add(new File(fullDirectory))
        log("Moving to new working directory, stack now $workingDirectory")
        try {
            closure.run()
        }
        finally {
            workingDirectory.pop()
            log("Popping directory stack, now $workingDirectory")
        }
    }

    @Override
    String execute(String command) {
        def exe = command.split(" ")[0]

        if (executableOverrides.containsKey(exe) && executableOverrides.get(exe) != null) {
            def replaceWith = executableOverrides.get(exe)
            log("Overriding command $exe to $replaceWith")
            command = command.replace(exe, replaceWith)
            exe = replaceWith
        }

        // This hangs sometimes...
//        def which = "which $exe".execute().text.trim()

        File wd = null
        if (!workingDirectory.empty()) {
            wd = workingDirectory.peek()
        }
        File fullWd = wd != null ? wd : new File(initialDir)
        log("Executing '$command' in directory ${fullWd.getAbsolutePath()}")

        def sout = new StringBuilder(), serr = new StringBuilder()
        def proc = command.execute([], fullWd)
        proc.consumeProcessOutput(sout, serr)
        proc.waitForOrKill(120000)
        if (proc.exitValue() != 0) {
            if (serr.size() > 0) {
                throw new RuntimeException("Process '$command' failed with error '$serr'")
            }
            throw new RuntimeException("Process '$command' failed with error ${proc.exitValue()}")
        }
        return sout.toString().trim()
    }

    @Override
    void log(String toLog) {
        println(toLog)
    }
}