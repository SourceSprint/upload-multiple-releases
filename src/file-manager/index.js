const glob = require('glob')

class FileManager {
  resolveFiles(filelist) {
    const paths = `${filelist}`.split('\n').filter((line) => line.trim().length)

    const files = paths.map((filePath) => {
      // Use glob to parse paths with wildcards
      if (filePath.indexOf('*') !== -1) {
        return glob.sync(filePath)
      }

      return [filePath]
    })

    return [].concat(...files)
  }
}

module.exports = {
  FileManager
}
