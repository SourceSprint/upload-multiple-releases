const core = require('@actions/core')

const { UploadManager } = require('./upload-manager')
const { FileManager } = require('./file-manager')

const run = async () => {
  try {
    // Get inputs from workflow file
    const releasePaths = core.getInput('release_paths', { required: true })
    const tagName = core.getInput('tag_name', { required: true })

    const filemanager = new FileManager()
    const filelist = filemanager.resolveFiles(releasePaths)

    core.debug(`Found ${filelist.length} asset(s)`)
    core.debug(filelist.join('\n'))

    const options = {
      tagName
    }

    const uploadManager = new UploadManager(options)

    let downloadUrls = []

    for (let file of filelist) {
      core.debug(`Uploading ${file}`)
      const downloadUrl = await uploadManager.uploadFile(file)
      if (downloadUrl) {
        core.debug(`Uploaded ${file}`)
        downloadUrls = [...downloadUrls, { url: downloadUrl, file }]
      }
    }

    core.setOutput('browser_download_urls', JSON.stringify(downloadUrls))
  } catch (e) {
    core.setFailed(e.message)
  }
}

run()
