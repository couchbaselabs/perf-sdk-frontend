package main.fit.stages

import groovy.transform.CompileStatic
import main.context.StageContext
import main.context.environments.Environment
import main.stages.Stage

@CompileStatic
class BuildDockerJavaFITPerformer extends Stage {

    private final String transactionVersion
    final String imageName

    static String genImageName(String transactionVersion) {
        return "transactions-fit-performer-java-" + transactionVersion
    }

    BuildDockerJavaFITPerformer(String transactionVersion) {
        this(BuildDockerJavaFITPerformer.genImageName(transactionVersion),
                transactionVersion)
    }

    BuildDockerJavaFITPerformer(String imageName, String transactionVersion) {
        this.imageName = imageName
        this.transactionVersion = transactionVersion
    }

    @Override
    String name() {
        return "Building image ${imageName}"
    }

    @Override
    void executeImpl(StageContext ctx) {
        def imp = ctx.env
        imp.tempDir() {
            // Build context needs to be transactions-fit-performer as we need the .proto files
            ctx.inSourceDir {
                imp.dir('performers/java') {
                    writePomFile(imp)
                }
//                updatePomFile(imp)
                imp.execute("docker build -f performers/java/Dockerfile -t $imageName .")
                //imp.log("Starting Java performer on port :$port")
                //imp.execute("mvn clean package -DskipTests=true")
                //imp.execute("java -cp target/txn-performer-java-1.0-SNAPSHOT.jar com.couchbase.PerformerTransactionService port=$port loglevel=all:Info version=$transactionVersion & ")
            }
        }
    }

    /**
     * Updates pom.xml to build with the transaction library under test.
     */
    private List writePomFile(Environment imp) {
        imp.dir("txn-performer-java") {
            /*
                <dependency>
                  <groupId>com.couchbase.client</groupId>
                  <artifactId>couchbase-transactions</artifactId>
                  <version>1.1.6</version>
                </dependency>
             */
            def pom = new File("${imp.currentDir()}/pom.xml")
            def lines = pom.readLines()
            def replaceVersion = false

            pom.write("")

            for (int i = 0; i < lines.size(); i++) {
                def line = lines[i]

                if (replaceVersion) {
                    assert (line.contains("<version>"))
                    pom.append("<version>${transactionVersion}</version>\n")
                    replaceVersion = false
                } else if (line.contains("<artifactId>couchbase-transactions</artifactId>")) {
                    replaceVersion = true
                    pom.append(line + "\n")
                } else {
                    pom.append(line + "\n")
                }
            }
        }
    }

//    @Override
//    List<String> cbdepDependencies() {
//        return ["openjdk-8u192-b12"]
//    }

    void updatePomFile(Environment env) {
//            env.execute("sed -i \"s/3.[0-9].[0-9]-SNAPSHOT/$JAVA_CLIENT/g\" pom.xml")
        updatePomFileForTransactionLib(env)
    }

    void updatePomFileForTransactionLib(Environment env) {
        def LN = env.execute("grep -n \"couchbase-transactions\" pom.xml| head -1 | awk -F \":\" '{print \$1}'").trim()
        LN = LN.toInteger()
        LN = LN + 1
        def oldVersion = env.execute("grep -A1 \"couchbase-transactions\" pom.xml | sed '2!d'| awk -F \">\" '{print \$2}'| awk -F \"<\" '{print \$1}'").trim()
        env.execute("sed -i \"$LN s/$oldVersion/$transactionVersion/\" pom.xml")
    }

}