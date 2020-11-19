const core = require('@actions/core')
const { UploadManager } = require('./upload-manager')
const { FileManager } = require('./file-manager')

const run = async () => {
  try {
    // Get inputs from workflow file
    const releaseConfig = core.getInput('release_config', { required: true })
    const tagName = core.getInput('tag_name', { required: true })
    const releaseName = core.getInput('release_name', { required: false })

    const overwrite = core.getInput('overwrite', { required: false }) === 'true'
    const draft = core.getInput('draft', { required: false }) === 'true'
    const prerelease =
      core.getInput('prerelease', { required: false }) === 'true'

    const filemanager = new FileManager()
    const filelist = filemanager.resolveFiles(releaseConfig)

    core.info(`Found ${filelist.length} asset(s)`)
    core.info(filelist.map((file) => file.filePath).join('\n'))

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

    for (let fileConfig of filelist) {
      const { filePath } = fileConfig

      core.info(`Uploading ${filePath}`)

      const downloadUrl = await uploadManager.uploadFile(fileConfig)

      if (downloadUrl) {
        core.info(`Uploaded ${filePath}`)

        downloadUrls = [...downloadUrls, { url: downloadUrl, filePath }]
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
