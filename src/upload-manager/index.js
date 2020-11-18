const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const github = require('@actions/github')

class UploadManager {
  constructor({ uploadUrl }) {
    this.uploadUrl = uploadUrl
  }

  async uploadFile(filePath) {
    try {
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN)

      // Determine content-length for header to upload asset
      const contentLength = fs.statSync(filePath).size

      // Setup headers for API call, see Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset for more information
      const headers = {
        'content-type': 'binary/octet-stream',
        'content-length': contentLength
      }

      // Upload a release asset
      // API Documentation: https://developer.github.com/v3/repos/releases/#upload-a-release-asset
      // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset
      const uploadAssetResponse = await octokit.repos.uploadReleaseAsset({
        url: this.uploadUrl,
        headers,
        name: path.basename(filePath),
        file: fs.readFileSync(filePath)
      })

      // Get the browser_download_url for the uploaded release asset from the response
      const {
        data: { browser_download_url: browserDownloadUrl }
      } = uploadAssetResponse

      return browserDownloadUrl
    } catch (e) {
      core.debug(e)
      return null
    }
  }
}

module.exports = {
  UploadManager
}
