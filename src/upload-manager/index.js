const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const github = require('@actions/github')

class CriticalError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CriticalError'
  }
}
class UploadManager {
  constructor({
    tagName = '',
    releaseName = '',
    overwrite = false,
    prerelease = false,
    draft = false
  }) {
    this.tagName = tagName.replace('refs/tags/', '')
    this.releaseName = releaseName.replace('refs/tags/', '')

    this.overwrite = overwrite
    this.prerelease = prerelease
    this.draft = draft

    this.octokit = github.getOctokit(process.env.GITHUB_TOKEN)

    this.repo = github.context.repo.repo
    this.owner = github.context.repo.owner
    this.sha = github.context.sha

    this.uploadUrl = null
  }

  async resolveTag() {
    try {
      core.info('Resolving tag')

      const assets = await this.octokit.repos.listReleases({
        repo: this.repo,
        owner: this.owner
      })

      const release = assets.data.find(
        (asset) => asset.tag_name == this.tagName
      )

      if (release && !this.overwrite) {
        throw new CriticalError('Release already exists.')
      }

      if (release && this.overwrite) {
        core.info('Release exists, overwriting assets.')
        this.uploadUrl = release.upload_url
        return
      }

      let releaseName = this.tagName.replace('v', '')

      if (this.releaseName.length) {
        releaseName = this.releaseName
      }

      core.info('Creating release.')
      const newRelease = await this.octokit.repos.createRelease({
        owner: this.owner,
        repo: this.repo,
        tag_name: this.tagName,
        name: releaseName,
        body: '',
        draft: this.draft,
        prerelease: this.prerelease,
        target_commitish: this.sha
      })

      const {
        data: { upload_url: uploadUrl }
      } = newRelease

      this.uploadUrl = uploadUrl
    } catch (e) {
      core.setFailed(e.message)
    }
  }

  async uploadFile({ filePath, fileType }) {
    try {
      if (!this.uploadUrl) {
        throw new CriticalError('Unresolved Tag')
      }

      // Determine content-length for header to upload asset
      const contentLength = fs.statSync(filePath).size

      // Setup headers for API call, see Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset for more information
      const headers = {
        'content-type': fileType || 'binary/octet-stream',
        'content-length': contentLength
      }

      // Upload a release asset
      // API Documentation: https://developer.github.com/v3/repos/releases/#upload-a-release-asset
      // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset

      const options = {
        url: this.uploadUrl,
        headers,
        name: path.basename(filePath),
        data: fs.readFileSync(filePath)
      }

      core.info(options.data)

      const response = await this.octokit.repos.uploadReleaseAsset(options)

      // Get the browser_download_url for the uploaded release asset from the response

      const {
        data: { browser_download_url: browserDownloadUrl }
      } = response

      return browserDownloadUrl
    } catch (e) {
      if (e instanceof CriticalError) {
        core.setFailed(e.message)
      } else {
        core.error(e)
      }

      return null
    }
  }
}

module.exports = {
  UploadManager
}
