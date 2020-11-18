const core = require('@actions/core')

const { UploadManager } = require('./upload-manager')
const { FileManager } = require('./file-manager')

const run = async () => {
  // Get inputs from workflow file
  const releasePaths = core.getInput('release_paths', { required: true })
  const uploadUrl = core.getInput('upload_url', { required: true })

  const filemanager = new FileManager()
  const filelist = filemanager.resolveFiles(releasePaths)

  core.debug(`Found ${filelist.length} asset(s)`)
  core.debug(filelist.join('\n'))

  const uploadManager = new UploadManager({ uploadUrl })

  let downloadUrls = []

  for (let file of filelist) {
    const downloadUrl = await uploadManager.uploadFile(file)
    downloadUrls = [...downloadUrls, { url: downloadUrl, file }]
  }

  core.setOutput('browser_download_urls', JSON.stringify(downloadUrls))
}

run()
