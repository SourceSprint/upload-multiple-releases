const glob = require('glob')

class FileManager {
  resolveFiles(filelist) {
    const paths = `${filelist}`.split('\n').filter((line) => line.trim().length)

    const files = paths.map((fileConfig) => {
      const [filePath, fileType = null] = fileConfig.split(' ')

      // Use glob to parse paths with wildcards
      if (filePath.indexOf('*') !== -1) {
        const config = glob.sync(filePath)
        return config.map((file) => ({ filePath: file, fileType }))
      }

      return [{ filePath, fileType }]
    })

    return [].concat(...files)
  }
}

module.exports = {
  FileManager
}
