package main.context.environments
// The abstraction that allows commands to be executed correctly on Jenkins, or localhost, or wherever required.
abstract class Environment {
    Map<String, String> executableOverrides

    Environment(executableOverrides) {
        this.executableOverrides = executableOverrides;
    }

    abstract String execute(String command)
    abstract void dir(String directory, Closure closure)
//    abstract Boolean supportsCbdeps()
    abstract void log(String toLog)

    void tempDir(Closure voidClosure) {
        def tempDir = "temp-${UUID.randomUUID().toString().substring(0, 4)}"
        execute("mkdir -p $tempDir")
        dir(tempDir, voidClosure)
    }

    void checkout(String c) {
        execute("git clone $c")
    }

    abstract String currentDir()
}

