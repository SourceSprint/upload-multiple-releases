const core = require('@actions/core')

const { UploadManager } = require('./upload-manager')
const { FileManager } = require('./file-manager')

const run = async () => {
  try {
    // Get inputs from workflow file
    const releasePaths = core.getInput('release_paths', { required: true })
    const tagName = core.getInput('tag_name', { required: true })
    const releaseName = core.getInput('release_name', { required: false })

    const overwrite = core.getInput('overwrite', { required: false }) === 'true'
    const draft = core.getInput('draft', { required: false }) === 'true'
    const prerelease =
      core.getInput('prerelease', { required: false }) === 'true'

    const filemanager = new FileManager()
    const filelist = filemanager.resolveFiles(releasePaths)

    core.info(`Found ${filelist.length} asset(s)`)
    core.info(filelist.join('\n'))

    const options = {
      draft,
      tagName,
      overwrite,
      prerelease,
      releaseName
    }

    const uploadManager = new UploadManager(options)

    let downloadUrls = []

    await uploadManager.resolveTag()

    for (let file of filelist) {
      core.info(`Uploading ${file}`)
      const downloadUrl = await uploadManager.uploadFile(file)
      if (downloadUrl) {
        core.info(`Uploaded ${file}`)
        downloadUrls = [...downloadUrls, { url: downloadUrl, file }]
      }
    }

    core.setOutput('browser_download_urls', JSON.stringify(downloadUrls))
  } catch (e) {
    core.setFailed(e.message)
  }
}

if (require.main === module) {
  run()
}
